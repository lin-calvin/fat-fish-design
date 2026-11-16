import { useContext } from 'react'
import { ToastContext } from './context'
import type { ToastApi } from './types'

/** Provider 之外调用属于集成错误：这里只抛机器码，不产生任何用户可见文案。 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('TOAST_CONTEXT_MISSING')
  return api
}
