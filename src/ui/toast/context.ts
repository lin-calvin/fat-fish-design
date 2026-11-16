import { createContext } from 'react'
import type { ToastApi } from './types'

/**
 * 只传递 API，不保存状态。
 * 队列完全活在 Provider 的 useReducer 里，因此同一页面多个 Provider 各自独立。
 */
export const ToastContext = createContext<ToastApi | null>(null)
