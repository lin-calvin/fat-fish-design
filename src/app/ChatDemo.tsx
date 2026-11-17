import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Composer, SearchIcon, ThinkIcon, type ComposerToggle } from '../chat/composer'
import { ActivityIndicator, PermissionSelect, PlanToggle } from '../chat/seats'
import { MessageList } from '../chat/list'
import { Sider } from '../chat/sider'
import { Button, Modal, Select, Switch } from '../ui/atoms'
import { EmptyState } from '../ui/empty'
import { ToastProvider, useToast } from '../ui/toast'
import { zh } from '../chat-protocol/labels.zh'
import {
  emptyComposerValue,
  type Block,
  type Citation,
  type ComposerValue,
  type Message,
  type SessionSummary,
} from '../chat-protocol/types'
import { planAnswer, seedSessions, seedThreads } from './fixtures'
import { createTokenFeed, type TokenFeed } from './feed'
import { loadSettings, saveSettings, type AppSettings } from './settings'
import { createTransport, type ChatEvent, type ChatTransport } from './transport'
import css from './chat-demo.module.css'

/** 假服务端：每 8ms 一个 token */
const MODEL_OPTIONS = ['deepseek-flash', 'deepseek-v4-pro'] as const

const PERMISSION_OPTIONS = [
  { id: 'read', label: '只读' },
  { id: 'workspace', label: '工作区可写' },
  { id: 'full', label: '完全访问' },
] as const

function fakeTransport(): ChatTransport {
  let aborted = false
  return {
    abort() {
      aborted = true
    },
    async *send() {
      for (const token of planAnswer()) {
        if (aborted) return
        yield { type: 'text-delta', text: token }
        await new Promise(resolve => setTimeout(resolve, 8))
      }
      yield { type: 'done' }
    },
  }
}

function appendText(blocks: readonly Block[], delta: string): Block[] {
  const last = blocks[blocks.length - 1]
  if (last?.kind === 'text') return [...blocks.slice(0, -1), { ...last, text: last.text + delta }]
  return [...blocks, { kind: 'text', text: delta }]
}

function appendThinking(blocks: readonly Block[], delta: string): Block[] {
  const index = blocks.findIndex(block => block.kind === 'thinking')
  if (index === -1) return [{ kind: 'thinking', text: delta }, ...blocks]
  const target = blocks[index]
  if (target?.kind !== 'thinking') return [...blocks]
  return [...blocks.slice(0, index), { ...target, text: target.text + delta }, ...blocks.slice(index + 1)]
}

function withCitations(blocks: readonly Block[], citations: readonly Citation[]): Block[] {
  if (citations.length === 0) return [...blocks]
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index]
    if (block?.kind !== 'text') continue
    return [...blocks.slice(0, index), { ...block, citations }, ...blocks.slice(index + 1)]
  }
  return [...blocks]
}

export function ChatDemo() {
  const labels = zh
  const toast = useToast()
  const [sessions, setSessions] = useState<readonly SessionSummary[]>(seedSessions)
  const [activeId, setActiveId] = useState<string>('s1')
  const [collapsed, setCollapsed] = useState(false)
  const [threads, setThreads] = useState<Record<string, readonly Message[]>>(() => ({ ...seedThreads }))
  const [drafts, setDrafts] = useState<Record<string, ComposerValue>>({})
  /** 业务开关属于调用方；组件只负责渲染 label + 回调 */
  const [flags, setFlags] = useState<Record<string, { thinking: boolean; search: boolean }>>({})
  const [status, setStatus] = useState<'idle' | 'streaming' | 'blocked'>('idle')
  const [dark, setDark] = useState(false)
  const [follow, setFollow] = useState(0)
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [permission, setPermission] = useState('workspace')
  const [plan, setPlan] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const transportRef = useRef<ChatTransport | null>(null)
  const stoppedRef = useRef(false)

  const messages = threads[activeId] ?? []
  const draft = drafts[activeId] ?? emptyComposerValue
  const active = flags[activeId] ?? { thinking: false, search: false }
  const canUseRealApi = settings.useRealApi && settings.apiKey.trim() !== ''

  useEffect(() => () => transportRef.current?.abort(), [])

  useEffect(() => {
    document.body.toggleAttribute('data-ds-dark-theme', dark)
  }, [dark])

  // 选了真实 API 却没填 key：直接进入 blocked，输入区会给出提示
  useEffect(() => {
    setStatus(current => (current === 'streaming' ? current : settings.useRealApi && !canUseRealApi ? 'blocked' : 'idle'))
  }, [settings.useRealApi, canUseRealApi])

  const setDraft = useCallback((next: ComposerValue) => {
    setDrafts(current => ({ ...current, [activeId]: next }))
  }, [activeId])

  const setFlag = useCallback((key: 'thinking' | 'search', next: boolean) => {
    setFlags(current => {
      const base = current[activeId] ?? { thinking: false, search: false }
      return { ...current, [activeId]: { ...base, [key]: next } }
    })
  }, [activeId])

  const toggles = useMemo<ComposerToggle[]>(() => [
    {
      id: 'thinking',
      label: labels.composer.thinking,
      icon: <ThinkIcon />,
      active: active.thinking,
      onToggle: next => setFlag('thinking', next),
    },
    {
      id: 'search',
      label: labels.composer.search,
      icon: <SearchIcon />,
      active: active.search,
      onToggle: next => setFlag('search', next),
    },
  ], [active.search, active.thinking, labels.composer.search, labels.composer.thinking, setFlag])

  const patchMessage = useCallback((sessionId: string, messageId: string, patch: (message: Message) => Message) => {
    setThreads(current => ({
      ...current,
      [sessionId]: (current[sessionId] ?? []).map(message => (message.id === messageId ? patch(message) : message)),
    }))
  }, [])

  /** 把一条事件流写进消息：文本与思考各自合并，事件语义由回调决定 */
  const pump = useCallback(async (options: {
    sessionId: string
    assistantId: string
    events: AsyncGenerator<ChatEvent>
    search: boolean
  }) => {
    const { sessionId, assistantId, events, search } = options
    const textFeed = createTokenFeed({
      maxHz: 30,
      onFlush: delta => patchMessage(sessionId, assistantId, message => ({ ...message, blocks: appendText(message.blocks, delta) })),
    })
    const thinkFeed = createTokenFeed({
      maxHz: 30,
      onFlush: delta => patchMessage(sessionId, assistantId, message => ({ ...message, blocks: appendThinking(message.blocks, delta) })),
    })
    const sources: Citation[] = []
    let failed = false

    try {
      for await (const event of events) {
        switch (event.type) {
          case 'text-delta':
            textFeed.push(event.text)
            break
          case 'thinking-delta':
            thinkFeed.push(event.text)
            break
          case 'search-results':
            sources.push(...event.sources)
            break
          case 'title':
            setSessions(current => current.map(session => (
              session.id === sessionId ? { ...session, title: event.title, updatedAt: Date.now() } : session
            )))
            break
          case 'error':
            failed = true
            textFeed.flush()
            thinkFeed.flush()
            patchMessage(sessionId, assistantId, message => ({
              ...message,
              status: 'error',
              error: { message: event.message },
            }))
            break
          default:
            break
        }
      }
    } catch (error) {
      failed = true
      patchMessage(sessionId, assistantId, message => ({
        ...message,
        status: 'error',
        error: { message: error instanceof Error ? error.message : String(error) },
      }))
    }

    textFeed.flush()
    thinkFeed.flush()
    textFeed.dispose()
    thinkFeed.dispose()
    transportRef.current = null

    if (failed) {
      setStatus('idle')
      return
    }
    patchMessage(sessionId, assistantId, message => ({
      ...message,
      status: stoppedRef.current ? 'stopped' : 'settled',
      blocks: search ? withCitations(message.blocks, sources) : message.blocks,
    }))
    setStatus('idle')
  }, [patchMessage])

  const send = useCallback(async () => {
    const text = draft.text.trim()
    if (status !== 'idle' || (text === '' && draft.attachments.length === 0)) return

    const sessionId = activeId
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      attempt: 1,
      status: 'settled',
      createdAt: Date.now(),
      blocks: text === '' ? [] : [{ kind: 'text', text }],
      attachments: draft.attachments,
    }
    const assistantId = `a-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      attempt: 1,
      status: 'streaming',
      createdAt: Date.now(),
      blocks: [{ kind: 'text', text: '' }],
    }

    setThreads(current => ({ ...current, [sessionId]: [...(current[sessionId] ?? []), userMessage, assistantMessage] }))
    setDrafts(current => ({ ...current, [sessionId]: emptyComposerValue }))
    setStatus('streaming')
    setFollow(value => value + 1)
    stoppedRef.current = false

    const history = messages
      .filter(message => message.status === 'settled')
      .map(message => ({
        role: message.role,
        text: message.blocks.filter(block => block.kind === 'text').map(block => (block.kind === 'text' ? block.text : '')).join('\n'),
      }))
      .filter(message => message.text !== '')

    const transport = canUseRealApi
      ? createTransport({ apiKey: settings.apiKey.trim(), model: settings.model })
      : fakeTransport()
    transportRef.current = transport

    await pump({
      sessionId,
      assistantId,
      events: transport.send({
        text,
        thinking: active.thinking,
        search: active.search,
        history,
      }) as AsyncGenerator<ChatEvent>,
      search: active.search,
    })
  }, [active.search, active.thinking, activeId, canUseRealApi, draft, messages, pump, settings.apiKey, settings.model, status])

  const stop = useCallback(() => {
    stoppedRef.current = true
    transportRef.current?.abort()
  }, [])

  const regenerate = useCallback(async (message: Message) => {
    if (status !== 'idle') return
    const attempt = message.attempt + 1
    patchMessage(activeId, message.id, current => ({
      ...current,
      attempt,
      status: 'streaming',
      error: undefined,
      blocks: [{ kind: 'text', text: '' }],
    }))
    setStatus('streaming')
    setFollow(value => value + 1)
    stoppedRef.current = false

    const transport = canUseRealApi
      ? createTransport({ apiKey: settings.apiKey.trim(), model: settings.model })
      : fakeTransport()
    transportRef.current = transport
    const question = [...messages].reverse().find(item => item.role === 'user')
    const text = question?.blocks.map(block => (block.kind === 'text' ? block.text : '')).join('\n') ?? ''

    await pump({
      sessionId: activeId,
      assistantId: message.id,
      events: transport.send({ text, thinking: active.thinking, search: active.search }) as AsyncGenerator<ChatEvent>,
      search: active.search,
    })
  }, [active.search, active.thinking, activeId, canUseRealApi, messages, patchMessage, pump, settings.apiKey, settings.model, status])

  const removeSession = useCallback((id: string) => {
    setSessions(current => current.filter(session => session.id !== id))
    setThreads(current => {
      const next = { ...current }
      delete next[id]
      return next
    })
    if (id === activeId) setActiveId(current => sessions.find(session => session.id !== id)?.id ?? '')
  }, [activeId, sessions])

  const list = useMemo(() => messages, [messages])

  return (
    <div className={css.app}>
      <Sider
        sessions={sessions}
        activeId={activeId}
        collapsed={collapsed}
        labels={labels.sider}
        onSelect={setActiveId}
        onNew={() => {
          const id = `s-${Date.now()}`
          setSessions(current => [{ id, title: '未命名对话', updatedAt: Date.now() }, ...current])
          setThreads(current => ({ ...current, [id]: [] }))
          setActiveId(id)
        }}
        onRename={(id, title) => setSessions(current => current.map(session => (session.id === id ? { ...session, title } : session)))}
        onDelete={removeSession}
        onCollapseToggle={() => setCollapsed(value => !value)}
        footer={(
          <button className={css.footerButton} type="button" onClick={() => setSettingsOpen(true)}>
            设置
          </button>
        )}
      />

      <main className={css.main}>
        <header className={css.topbar}>
          <span className={css.title}>{sessions.find(session => session.id === activeId)?.title ?? '新对话'}</span>
          <span className={css.hint}>
            {settings.useRealApi ? (canUseRealApi ? '真实 API' : '真实 API · 缺 Key') : '演示模式'}
            <button className={css.themeButton} type="button" onClick={() => setDark(value => !value)}>
              {dark ? '浅色' : '深色'}
            </button>
          </span>
        </header>

        <div className={css.thread}>
          <MessageList
            messages={list}
            followSignal={follow}
            labels={labels.message}
            markdownLabels={labels.markdown}
            onStop={stop}
            onRegenerate={regenerate}
            onContinue={regenerate}
            onRetry={regenerate}
            onCopy={text => { void navigator.clipboard.writeText(text); toast.show({ text: labels.common.copied, tone: 'success' }) }}
            emptyState={
              <EmptyState
                title="有什么可以帮你的吗？"
                description={canUseRealApi ? '当前会请求真实 API' : '当前是演示模式，回复由本地生成'}
                items={['解释一下增量解析的边界', 'composer 和 textarea 的区别是什么', '用一张表对比三种流式方案']}
                onPick={text => setDraft({ ...draft, text })}
              />
            }
          />
        </div>

        <div className={css.composerWrap}>
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={() => { void send() }}
            onStop={stop}
            status={status}
            blockedReason="请先在设置里填写 API Key，或切回演示模式"
            toggles={toggles}
            features={{ voice: true }}
            slots={{
              model: (
                <Select
                  label="模型"
                  size="sm"
                  value={settings.model}
                  options={MODEL_OPTIONS.map(model => ({ value: model, label: model }))}
                  onChange={model => {
                    const next = { ...settings, model }
                    setSettings(next)
                    saveSettings(next)
                  }}
                />
              ),
              permission: (
                <PermissionSelect
                  label="权限模式"
                  value={permission}
                  options={PERMISSION_OPTIONS}
                  onChange={setPermission}
                />
              ),
              plan: <PlanToggle label="计划模式" active={plan} onToggle={setPlan} />,
              activity: (
                <ActivityIndicator
                  status={status === 'streaming' ? 'running' : 'idle'}
                  label={status === 'streaming' ? '生成中' : undefined}
                />
              ),
            }}
            labels={labels.composer}
          />
        </div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={next => {
          setSettings(next)
          saveSettings(next)
          setSettingsOpen(false)
          toast.show({ text: '设置已保存', tone: 'success' })
        }}
      />
    </div>
  )
}

function SettingsDialog({ open, settings, onClose, onSave }: {
  open: boolean
  settings: AppSettings
  onClose: () => void
  onSave: (next: AppSettings) => void
}) {
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    if (open) setDraft(settings)
  }, [open, settings])

  return (
    <Modal
      open={open}
      title="设置"
      size="sm"
      closeLabel="关闭"
      onClose={onClose}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => onSave({ ...draft, apiKey: draft.apiKey.trim() })}>保存</Button>
        </>
      )}
    >
      <div className={css.settingsRow}>
        <Switch
          checked={draft.useRealApi}
          onChange={useRealApi => setDraft({ ...draft, useRealApi })}
          label="使用真实 API"
        />
        <span className={css.settingsLabel}>使用真实 API（关闭时为本地演示）</span>
      </div>
      <label className={css.settingsField}>
        <span className={css.settingsLabel}>API Key</span>
        <input
          className={css.settingsInput}
          type="password"
          autoComplete="off"
          placeholder="sk-..."
          value={draft.apiKey}
          onChange={event => setDraft({ ...draft, apiKey: event.currentTarget.value })}
        />
      </label>
      <label className={css.settingsField}>
        <span className={css.settingsLabel}>模型</span>
        <input
          className={css.settingsInput}
          type="text"
          value={draft.model}
          onChange={event => setDraft({ ...draft, model: event.currentTarget.value })}
        />
      </label>
      <p className={css.settingsNote}>
        Key 只保存在本机 localStorage，请求直接从浏览器发往 api.deepseek.com。
      </p>
    </Modal>
  )
}

/** 供 App 挂载时使用：Toast 是实例级的，必须包在最外层 */
export function ChatDemoPage() {
  return (
    <ToastProvider>
      <ChatDemo />
    </ToastProvider>
  )
}
