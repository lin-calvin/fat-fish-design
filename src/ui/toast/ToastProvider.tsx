import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './context'
import { ToastViewport } from './ToastViewport'
import type { ToastApi, ToastInput, ToastRecord } from './types'

const DEFAULT_MAX_VISIBLE = 3
/** 自动消失时长。 */
const DURATION_MS = 3000
/** 退场过渡时长，需不小于 Toast.module.css 里的 transition。 */
const EXIT_MS = 180

export interface ToastProviderProps {
  readonly children: ReactNode
  /** 同时可见的上限，默认 3；超出的排队。 */
  readonly maxVisible?: number
}

interface ToastState {
  readonly visible: readonly ToastRecord[]
  readonly queue: readonly ToastRecord[]
}

type ToastAction =
  | { readonly type: 'push'; readonly record: ToastRecord; readonly maxVisible: number }
  | { readonly type: 'dismiss'; readonly id: number }
  | { readonly type: 'remove'; readonly id: number; readonly maxVisible: number }
  | { readonly type: 'reflow'; readonly maxVisible: number }

const initialState: ToastState = { visible: [], queue: [] }

/** 把队首补进可见区，直到满员或队空。没有变化时返回原对象，避免多余渲染。
 *  退场中的项仍占一个坑位，最多只多停留 EXIT_MS，换来的队列逻辑简单很多。 */
function promote(state: ToastState, maxVisible: number): ToastState {
  if (state.queue.length === 0 || state.visible.length >= maxVisible) return state
  const take = Math.min(maxVisible - state.visible.length, state.queue.length)
  return {
    visible: [...state.visible, ...state.queue.slice(0, take)],
    queue: state.queue.slice(take),
  }
}

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'push':
      // 统一走「先入队再补位」，这样 maxVisible 变化时也只走一条路径。
      return promote({ visible: state.visible, queue: [...state.queue, action.record] }, action.maxVisible)
    case 'dismiss': {
      const target = state.visible.find(record => record.id === action.id)
      if (!target || target.leaving) return state
      return {
        ...state,
        visible: state.visible.map(record =>
          record.id === action.id ? { ...record, leaving: true } : record,
        ),
      }
    }
    case 'remove':
      return promote(
        { visible: state.visible.filter(record => record.id !== action.id), queue: state.queue },
        action.maxVisible,
      )
    case 'reflow':
      // 上限变大时补位；变小时把多出来的塞回队首，保证「最多显示 maxVisible」始终成立。
      if (state.visible.length <= action.maxVisible) return promote(state, action.maxVisible)
      return {
        visible: state.visible.slice(0, action.maxVisible),
        queue: [
          ...state.visible.slice(action.maxVisible).map(record => ({ ...record, leaving: false })),
          ...state.queue,
        ],
      }
  }
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_MAX_VISIBLE
  return Math.max(1, Math.floor(value))
}

/**
 * 实例级轻提示队列。
 * 定时器按 id 存在 ref 里的 Map 中：新项才排定，移除项立刻回收，
 * 因此 StrictMode 的双次挂载/卸载不会泄漏定时器，也不会把已在显示的项重新计时。
 */
export function ToastProvider({ children, maxVisible }: ToastProviderProps) {
  const limit = normalizeLimit(maxVisible)
  const [state, dispatch] = useReducer(reducer, initialState)
  const nextIdRef = useRef(0)
  const timersRef = useRef<Map<number, number>>(new Map())

  const show = useCallback(
    (input: ToastInput) => {
      const id = nextIdRef.current
      nextIdRef.current += 1
      dispatch({
        type: 'push',
        maxVisible: limit,
        record: {
          id,
          text: input.text,
          tone: input.tone ?? 'info',
          link: input.link,
          leaving: false,
        },
      })
    },
    [limit],
  )

  useEffect(() => {
    const timers = timersRef.current
    const present = new Set(state.visible.map(record => record.id))

    for (const [id, handle] of timers) {
      if (present.has(id)) continue
      window.clearTimeout(handle)
      timers.delete(id)
    }

    for (const record of state.visible) {
      if (timers.has(record.id)) continue
      const leaving = record.leaving
      const handle = window.setTimeout(
        () => {
          timers.delete(record.id)
          dispatch(
            leaving
              ? { type: 'remove', id: record.id, maxVisible: limit }
              : { type: 'dismiss', id: record.id },
          )
        },
        leaving ? EXIT_MS : DURATION_MS,
      )
      timers.set(record.id, handle)
    }
  }, [state.visible, limit])

  // 挂载时按当前上限补位（例如 Provider 的 maxVisible 之后变大）。
  useEffect(() => {
    dispatch({ type: 'reflow', maxVisible: limit })
  }, [limit])

  // 卸载时清空所有定时器。
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const handle of timers.values()) window.clearTimeout(handle)
      timers.clear()
    }
  }, [])

  const value = useMemo<ToastApi>(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={state.visible} />
    </ToastContext.Provider>
  )
}
