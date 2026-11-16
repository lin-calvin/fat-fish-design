/**
 * 所有文案由调用方注入，组件内部不得出现任何中英文字面量。
 * 分组名与组件文件夹一一对应，改动这里必须同步 labels.zh.ts。
 */

export interface CommonLabels {
  readonly close: string
  readonly cancel: string
  readonly confirm: string
  readonly delete: string
  readonly copy: string
  readonly copied: string
  readonly retry: string
}

export interface MessageLabels {
  readonly user: string
  readonly assistant: string
  readonly regenerate: string
  readonly continue: string
  readonly edit: string
  readonly stop: string
  readonly stopped: string
  readonly failed: string
  readonly thinking: string
  readonly thinkingFor: (seconds: number) => string
  readonly tool: string
  readonly citations: string
  /** “2 / 3”，分支切换器的可读文本 */
  readonly branch: (current: number, total: number) => string
  readonly previousBranch: string
  readonly nextBranch: string
  readonly scrollToBottom: string
}

export interface ComposerLabels {
  readonly placeholder: string
  readonly send: string
  readonly stop: string
  readonly thinking: string
  readonly search: string
  readonly attach: string
  readonly voice: string
  readonly voiceStop: string
  readonly blocked: string
  readonly removeAttachment: string
  readonly uploadFailed: string
  readonly retryUpload: string
  readonly dropHere: string
}

export interface SiderLabels {
  readonly newChat: string
  readonly rename: string
  readonly delete: string
  readonly deleteTitle: string
  readonly deleteDescription: string
  readonly empty: string
  readonly today: string
  readonly yesterday: string
  readonly earlier: string
  readonly collapse: string
  readonly expand: string
  readonly more: string
  readonly cancel: string
  readonly untitled: string
}

export interface MarkdownLabels {
  readonly copy: string
  readonly copied: string
  readonly footnotes: string
}

export interface UiLabels {
  readonly common: CommonLabels
  readonly message: MessageLabels
  readonly composer: ComposerLabels
  readonly sider: SiderLabels
  readonly markdown: MarkdownLabels
}
