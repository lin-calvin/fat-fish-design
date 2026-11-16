import { useEffect, useRef, useState } from 'react'

export interface PaintLagStats {
  /** 收到 text prop 的次数 */
  updates: number
  /** 真正提交给内层渲染（解析 + DOM）的次数 */
  paints: number
}

export const paintStats: PaintLagStats = { updates: 0, paints: 0 }

/**
 * 内部合并：props（text）每来一次都记账，但内层最多按 maxHz 重渲。
 * 数据不丢：读的永远是 latest，只是画得慢一点点。
 */
export function usePaintLag(text: string, streaming: boolean, maxHz: number): string {
  const [visible, setVisible] = useState(text)
  const latest = useRef(text)
  const visibleRef = useRef(text)
  latest.current = text
  visibleRef.current = visible
  paintStats.updates += 1

  // 立即对齐的三种情况：非流式、文本变短（重新生成）、关闭合并
  const immediate = !streaming || maxHz <= 0 || text.length < visible.length

  useEffect(() => {
    if (immediate) {
      if (visibleRef.current !== latest.current) {
        paintStats.paints += 1
        setVisible(latest.current)
      }
      return
    }
    let raf = 0
    let lastPaint = 0
    const interval = 1000 / maxHz
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - lastPaint < interval) return
      if (latest.current === visibleRef.current) return
      lastPaint = now
      paintStats.paints += 1
      setVisible(latest.current)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [immediate, maxHz])

  // 后台标签页 rAF 不跑，别把最后一段吞掉
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && visibleRef.current !== latest.current) {
        paintStats.paints += 1
        setVisible(latest.current)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return immediate ? text : visible
}
