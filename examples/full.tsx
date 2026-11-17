/**
 * 完整示例：会话侧栏 + 消息流 + 输入区 + 轻提示，接一个假的“服务端”。
 *
 * 想接真后端时，只需要替换 `fakeTransport`：它返回一串 token，
 * 换成 SSE 解析器产出的增量即可，组件与状态管理都不用动。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Composer, MessageList, Sider } from '../src/chat'
import { EmptyState } from '../src/ui/empty'
import { ToastProvider, useToast } from '../src/ui/toast'
import { zh } from '../src/chat-protocol/labels.zh'
import {
  emptyComposerValue,
  type Block,
  type ComposerValue,
  type Message,
  type SessionSummary,
} from '../src/chat-protocol/types'

/** 假服务端：把一段回答切成 3 字符的 token */
function fakeTransport(prompt: string): string[] {
  const text = `你问的是「${prompt}」。\n\n这是流式回答的第一段。\n\n\`\`\`ts\nconst ok = true\n\`\`\`\n\n最后一段用来确认结算后的全量解析。`
  const tokens: string[] = []
  for (let index = 0; index < text.length; index += 3) tokens.push(text.slice(index, index + 3))
  return tokens
}

function appendText(blocks: readonly Block[], delta: string): Block[] {
  const last = blocks[blocks.length - 1]
  if (last?.kind === 'text') return [...blocks.slice(0, -1), { ...last, text: last.text + delta }]
  return [...blocks, { kind: 'text', text: delta }]
}

const seedSessions: readonly SessionSummary[] = [
  { id: 's1', title: '第一个对话', updatedAt: Date.now() - 60_000 },
]

export function FullChat() {
  return (
    <ToastProvider>
      <Chat />
    </ToastProvider>
  )
}

function Chat() {
  const toast = useToast()
  const [sessions, setSessions] = useState<readonly SessionSummary[]>(seedSessions)
  const [activeId, setActiveId] = useState('s1')
  const [threads, setThreads] = useState<Record<string, readonly Message[]>>({})
  const [drafts, setDrafts] = useState<Record<string, ComposerValue>>({})
  const [status, setStatus] = useState<'idle' | 'streaming'>('idle')
  const [thinking, setThinking] = useState(false)
  const [follow, setFollow] = useState(0)
  const stopped = useRef(false)

  const thread = useMemo(() => threads[activeId] ?? [], [threads, activeId])
  const draft = drafts[activeId] ?? emptyComposerValue

  const setDraft = useCallback((next: ComposerValue) => {
    setDrafts(current => ({ ...current, [activeId]: next }))
  }, [activeId])

  /** 只改一条消息，避免整棵消息树的引用变化 */
  const patch = useCallback((id: string, fn: (message: Message) => Message) => {
    setThreads(current => ({
      ...current,
      [activeId]: (current[activeId] ?? []).map(message => (message.id === id ? fn(message) : message)),
    }))
  }, [activeId])

  useEffect(() => () => { stopped.current = true }, [])

  const send = useCallback(async () => {
    const text = draft.text.trim()
    if (status !== 'idle' || text === '') return

    const assistantId = `a-${Date.now()}`
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      attempt: 1,
      status: 'settled',
      blocks: [{ kind: 'text', text }],
    }
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      attempt: 1,
      status: 'streaming',
      blocks: [{ kind: 'text', text: '' }],
    }

    setThreads(current => ({ ...current, [activeId]: [...(current[activeId] ?? []), userMessage, assistantMessage] }))
    setDrafts(current => ({ ...current, [activeId]: emptyComposerValue }))
    setStatus('streaming')
    setFollow(value => value + 1)

    // 高频 token 合并成每帧最多一次 setState；这就是“薄转换器”的全部内容
    let buffer = ''
    let frame = 0
    const flush = () => {
      frame = 0
      if (buffer === '') return
      const delta = buffer
      buffer = ''
      patch(assistantId, message => ({ ...message, blocks: appendText(message.blocks, delta) }))
    }
    const push = (token: string) => {
      buffer += token
      if (frame === 0) frame = requestAnimationFrame(flush)
    }

    stopped.current = false
    for (const token of fakeTransport(text)) {
      if (stopped.current) break
      push(token)
      await new Promise(resolve => setTimeout(resolve, 8))
    }
    if (frame !== 0) cancelAnimationFrame(frame)
    flush()

    patch(assistantId, message => ({ ...message, status: stopped.current ? 'stopped' : 'settled' }))
    setStatus('idle')
  }, [activeId, draft, patch, status])

  const stop = useCallback(() => { stopped.current = true }, [])

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sider
        sessions={sessions}
        activeId={activeId}
        labels={zh.sider}
        onSelect={setActiveId}
        onNew={() => {
          const id = `s-${Date.now()}`
          setSessions(current => [{ id, title: '新对话', updatedAt: Date.now() }, ...current])
          setActiveId(id)
        }}
        onRename={(id, title) => setSessions(current => current.map(s => (s.id === id ? { ...s, title } : s)))}
        onDelete={id => setSessions(current => current.filter(s => s.id !== id))}
      />

      <main style={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <MessageList
            messages={thread}
            followSignal={follow}
            labels={zh.message}
            markdownLabels={zh.markdown}
            onStop={stop}
            onCopy={text => {
              void navigator.clipboard.writeText(text)
              toast.show({ text: zh.common.copied, tone: 'success' })
            }}
            emptyState={<EmptyState title="有什么可以帮你的吗？" items={['解释一下增量解析', 'composer 是什么']} onPick={text => setDraft({ ...draft, text })} />}
          />
        </div>
        <div style={{ padding: 16 }}>
          <Composer
            value={draft}
            onChange={setDraft}
            onSubmit={() => { void send() }}
            onStop={stop}
            status={status}
            toggles={[
              { id: 'thinking', label: zh.composer.thinking, active: thinking, onToggle: setThinking },
            ]}
            labels={zh.composer}
          />
        </div>
      </main>
    </div>
  )
}
