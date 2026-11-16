/** 与 UI 无关的领域类型。组件库和调用方共用这一份，不允许各自复制。 */

export type MessageId = string

export interface Citation {
  readonly index: number
  readonly title: string
  readonly url: string
  /** 站点名，用于角标悬浮卡 */
  readonly site?: string
}

export type AttachmentStatus = 'pending' | 'uploading' | 'ready' | 'error'

export interface Attachment {
  readonly id: string
  readonly name: string
  readonly size: number
  readonly mime: string
  readonly kind: 'image' | 'file'
  /** 本地或远端可访问地址；图片气泡用它渲染缩略图 */
  readonly url?: string
  readonly status?: AttachmentStatus
  /** 0–1 */
  readonly progress?: number
  readonly error?: string
}

export type MessageStatus = 'settled' | 'streaming' | 'error' | 'stopped'

export type Block =
  | { readonly kind: 'text'; readonly text: string; readonly citations?: readonly Citation[] }
  | { readonly kind: 'thinking'; readonly text: string; readonly durationMs?: number }
  | {
      readonly kind: 'tool'
      readonly id: string
      readonly name: string
      readonly status: 'running' | 'done' | 'error'
      readonly summary?: string
      readonly detail?: string
    }
  | { readonly kind: 'image'; readonly attachment: Attachment }

export interface Message {
  readonly id: MessageId
  readonly role: 'user' | 'assistant'
  readonly blocks: readonly Block[]
  readonly status: MessageStatus
  /**
   * 每次重新生成 / 编辑重发都 +1。
   * 同时用于 markdown 增量缓存的 cacheKey 和 React key。
   */
  readonly attempt: number
  readonly error?: { readonly code?: string; readonly message: string }
  readonly createdAt?: number
  /** 用户消息的附件（独立于 blocks，方便输入区回填） */
  readonly attachments?: readonly Attachment[]
}

export interface SessionSummary {
  readonly id: string
  readonly title: string
  readonly updatedAt: number
  readonly pinned?: boolean
}

export interface ComposerValue {
  readonly text: string
  readonly thinking: boolean
  readonly search: boolean
  readonly attachments: readonly Attachment[]
}

export interface SpeechPort {
  /** 开始录音；实现方负责把结果通过 onTranscript 交回 */
  start(onTranscript: (text: string) => void): void
  stop(): void
  /** 当前是否在录音，用于按钮态 */
  isRecording?(): boolean
}

/** 组件库只注入“端口”，不注入状态 */
export interface ChatUiPorts {
  readonly speech?: SpeechPort
  /** 打开附件（本地预览或远端地址），默认用 <a target=_blank> */
  readonly openAttachment?: (attachment: Attachment) => void
  /** 复制文本，默认 navigator.clipboard */
  readonly copy?: (text: string) => Promise<void>
}

export const emptyComposerValue: ComposerValue = {
  text: '',
  thinking: false,
  search: false,
  attachments: [],
}
