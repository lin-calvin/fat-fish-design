import { Fragment, memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { MarkdownLabels, MessageLabels } from '../../chat-protocol/labels'
import type { Message } from '../../chat-protocol/types'
import { MessageItem } from '../message'
import { ArrowDownIcon } from './icons'
import styles from './MessageList.module.css'

/** 距底部超过该像素即认为用户离开了底部，解开“贴底”闩锁。 */
const STICK_THRESHOLD = 8

/**
 * 列表实际透传的回调子集（`renderBlock` 属于单条消息，由调用方在 renderMessage 里自行处理）。
 * 与 `../message` 的 `MessageActions` 兼容，但刻意用不同名字避免同名类型互相覆盖。
 */
export interface MessageListActions {
  readonly onRegenerate?: (message: Message) => void
  readonly onContinue?: (message: Message) => void
  readonly onStop?: (message: Message) => void
  readonly onCopy?: (text: string) => void
  readonly onRetry?: (message: Message) => void
  readonly onEdit?: (message: Message, text: string) => void
  readonly onSwitchBranch?: (message: Message, blockIndex: number, branch: number) => void
}

export interface MessageListProps extends MessageListActions {
  messages: readonly Message[]
  /** 默认 true；为 false 时完全不干预滚动（不挂监听、不自动跟随） */
  stickToBottom?: boolean
  labels: MessageLabels
  markdownLabels: MarkdownLabels
  /** 返回 undefined 时回退到默认的 MessageItem */
  renderMessage?: (message: Message) => ReactNode | undefined
  emptyState?: ReactNode
  /**
   * 值变化时强制回到底部并重新挂上闩锁。
   * 用于「用户上滚阅读后自己发了一条消息」这种“我明确想跟到底”的时机。
   */
  followSignal?: number
}

interface MessageRowProps {
  message: Message
  isLast: boolean
  streaming: boolean
  labels: MessageLabels
  markdownLabels: MarkdownLabels
  /** 由列表一次性构造、内部经 ref 读取最新 props，因此引用恒定 */
  actions: MessageListActions
}

/**
 * 单条消息的 memo 外壳：只有 message 引用、位置/流式状态或 labels 变化时才重渲。
 * 回调全部走稳定的 actions，避免调用方传内联箭头函数时整列重渲。
 */
const MessageRow = memo(
  function MessageRow({
    message,
    isLast,
    streaming,
    labels,
    markdownLabels,
    actions,
  }: MessageRowProps) {
    return (
      <MessageItem
        message={message}
        isLast={isLast}
        streaming={streaming}
        labels={labels}
        markdownLabels={markdownLabels}
        {...actions}
      />
    )
  },
  (prev, next) =>
    prev.message === next.message &&
    prev.isLast === next.isLast &&
    prev.streaming === next.streaming &&
    prev.labels === next.labels &&
    prev.markdownLabels === next.markdownLabels &&
    prev.actions === next.actions,
)

export function MessageList({
  messages,
  stickToBottom,
  labels,
  markdownLabels,
  onRegenerate,
  onContinue,
  onStop,
  onCopy,
  onRetry,
  onEdit,
  onSwitchBranch,
  renderMessage,
  emptyState,
  followSignal,
}: MessageListProps) {
  const stick = stickToBottom !== false
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  /** 闩锁：true = 跟随底部。整个滚动链路只在跨阈值时读 scrollTop。 */
  const latchedRef = useRef(true)
  const [atBottom, setAtBottom] = useState(true)
  /** 自己触发的滚动会异步回抛 scroll 事件；在窗口期内忽略，避免把闩锁误判成“用户上滚”。 */
  const followAtRef = useRef(0)

  const callbacksRef = useRef<MessageListActions>({
    onRegenerate,
    onContinue,
    onStop,
    onCopy,
    onRetry,
    onEdit,
    onSwitchBranch,
  })
  // 事件总在提交之后发生，所以 ref 一定是最新的一次 props。
  useLayoutEffect(() => {
    callbacksRef.current = { onRegenerate, onContinue, onStop, onCopy, onRetry, onEdit, onSwitchBranch }
  })

  const actions = useMemo<MessageListActions>(
    () => ({
      onRegenerate: message => callbacksRef.current.onRegenerate?.(message),
      onContinue: message => callbacksRef.current.onContinue?.(message),
      onStop: message => callbacksRef.current.onStop?.(message),
      onCopy: text => callbacksRef.current.onCopy?.(text),
      onRetry: message => callbacksRef.current.onRetry?.(message),
      onEdit: (message, text) => callbacksRef.current.onEdit?.(message, text),
      onSwitchBranch: (message, blockIndex, branch) =>
        callbacksRef.current.onSwitchBranch?.(message, blockIndex, branch),
    }),
    [],
  )

  useLayoutEffect(() => {
    if (followSignal === undefined) return
    const scroller = scrollerRef.current
    if (!scroller) return
    latchedRef.current = true
    setAtBottom(true)
    followAtRef.current = performance.now()
    scroller.scrollTo({ top: scroller.scrollHeight })
  }, [followSignal])

  const jumpToBottom = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    latchedRef.current = true
    setAtBottom(true)
    followAtRef.current = performance.now()
    scroller.scrollTo({ top: scroller.scrollHeight })
  }, [])

  useLayoutEffect(() => {
    if (!stick) {
      // 关掉跟随时不碰滚动，只保证下次打开时从头贴底。
      latchedRef.current = true
      return
    }
    const scroller = scrollerRef.current
    const content = contentRef.current
    if (!scroller || !content) return

    // 只有仍挂着闩锁才跟随；流式内容增高时用瞬时滚动（smooth 会追不上）。
    const follow = () => {
      if (!latchedRef.current) return
      followAtRef.current = performance.now()
      scroller.scrollTo({ top: scroller.scrollHeight })
    }

    latchedRef.current = true
    setAtBottom(true)
    follow()

    // 内容变高（流式 token、图片加载）或可视高度变化（窗口/输入框）都要跟随。
    const observer = new ResizeObserver(follow)
    observer.observe(content)
    observer.observe(scroller)

    const onScroll = () => {
      if (performance.now() - followAtRef.current < 120) return
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
      if (distance <= STICK_THRESHOLD) {
        if (!latchedRef.current) {
          latchedRef.current = true
          setAtBottom(true)
        }
      } else if (latchedRef.current) {
        latchedRef.current = false
        setAtBottom(false)
      }
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    // 挂载/切换 stickToBottom 时校正一次闩锁状态（例如内容本来就不高）。
    onScroll()

    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [stick])

  const lastIndex = messages.length - 1

  return (
    <div className={styles.root}>
      <div ref={scrollerRef} className={styles.scroller}>
        <div ref={contentRef} className={styles.content}>
          {messages.length === 0 && emptyState !== undefined ? (
            <div className={styles.empty}>{emptyState}</div>
          ) : (
            messages.map((message, index) => {
              const key = `${message.id}:${message.attempt}`
              const custom = renderMessage?.(message)
              if (custom !== undefined) {
                return <Fragment key={key}>{custom}</Fragment>
              }
              return (
                <MessageRow
                  key={key}
                  message={message}
                  isLast={index === lastIndex}
                  streaming={message.status === 'streaming'}
                  labels={labels}
                  markdownLabels={markdownLabels}
                  actions={actions}
                />
              )
            })
          )}
        </div>
      </div>
      {stick && !atBottom ? (
        <button
          type="button"
          className={styles.jump}
          aria-label={labels.scrollToBottom}
          title={labels.scrollToBottom}
          onClick={jumpToBottom}
        >
          <ArrowDownIcon />
        </button>
      ) : null}
    </div>
  )
}
