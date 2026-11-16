/** 轻提示的语气；info 为默认值。 */

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastLink {
  /** 链接文案，由调用方提供。 */
  readonly label: string
  readonly href: string
}

/** show() 的入参。组件内不产生任何文案，全部来自这里。 */
export interface ToastInput {
  readonly text: string
  readonly tone?: ToastTone
  readonly link?: ToastLink
}

/** 对调用方暴露的唯一 API。 */
export interface ToastApi {
  readonly show: (input: ToastInput) => void
}

/**
 * 内部队列记录。
 * id 同时用于 React key 和定时器跟踪；leaving 表示已开始退场过渡、等过渡结束再卸载。
 */
export interface ToastRecord {
  readonly id: number
  readonly text: string
  readonly tone: ToastTone
  readonly link?: ToastLink
  readonly leaving: boolean
}
