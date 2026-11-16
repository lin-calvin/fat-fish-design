import type { ReactNode } from 'react'
import type { MarkdownLabels, MessageLabels } from '../../chat-protocol/labels'
import type { Block, Message } from '../../chat-protocol/types'

/**
 * 分支信息由调用方注入：组件不持有分支数据。
 * `current` 为 0-based 下标，`blockIndex` 指出这条消息的哪个 block 拥有分支。
 */
export interface MessageBranch {
  readonly current: number
  readonly total: number
  readonly blockIndex: number
}

/** 全部交互都通过回调交回调用方，组件自身不调 store / 网络 / 剪贴板。 */
export interface MessageActions {
  onRegenerate?: (message: Message) => void
  onContinue?: (message: Message) => void
  onStop?: (message: Message) => void
  onCopy?: (text: string) => void
  onRetry?: (message: Message) => void
  onEdit?: (message: Message, text: string) => void
  onSwitchBranch?: (message: Message, blockIndex: number, branch: number) => void
  /** 返回 undefined 表示交回默认渲染 */
  renderBlock?: (block: Block, message: Message, index: number) => ReactNode | undefined
}

export interface MessageItemProps extends MessageActions {
  message: Message
  isLast?: boolean
  /** 这一条正在流式输出；缺省时取 message.status === 'streaming' */
  streaming?: boolean
  labels: MessageLabels
  markdownLabels: MarkdownLabels
  branch?: MessageBranch
}

export interface UserMessageProps
  extends Pick<MessageActions, 'onCopy' | 'onEdit' | 'onSwitchBranch'> {
  message: Message
  labels: MessageLabels
  markdownLabels: MarkdownLabels
  branch?: MessageBranch
}

export interface AssistantMessageProps extends MessageActions {
  message: Message
  isLast: boolean
  streaming: boolean
  labels: MessageLabels
  markdownLabels: MarkdownLabels
  branch?: MessageBranch
}
