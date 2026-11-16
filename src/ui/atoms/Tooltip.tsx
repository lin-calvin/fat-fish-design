import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { overlayContainer, useFloating } from './internal/anchored'
import styles from './Tooltip.module.css'

export type TooltipPlacement = 'top' | 'bottom'

export type TooltipProps = {
  content: ReactNode
  children: ReactElement
  placement?: TooltipPlacement
  delayMs?: number
}

/**
 * 悬停或键盘聚焦后出现的说明气泡。挂在 body（或最上层 dialog）上，
 * 用触发元素的 rect 定位，因此不会被滚动容器裁掉。
 */
export const Tooltip = ({ content, children, placement = 'top', delayMs = 120 }: TooltipProps) => {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  /** 悬停与聚焦是两个独立触发源，都清空才收起 */
  const triggers = useRef({ hover: false, focus: false })
  const timer = useRef(0)

  const { anchorRef, floatingRef, style } = useFloating<HTMLSpanElement, HTMLDivElement>(open, {
    side: placement,
    align: 'center',
    offset: 8,
    measureFirstChild: true,
  })

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = 0
    openRef.current = false
    setOpen(false)
  }, [])

  const sync = useCallback(() => {
    const wanted = triggers.current.hover || triggers.current.focus
    window.clearTimeout(timer.current)
    timer.current = 0
    if (!wanted) {
      hide()
      return
    }
    if (openRef.current) {
      return
    }
    if (delayMs <= 0) {
      openRef.current = true
      setOpen(true)
      return
    }
    timer.current = window.setTimeout(() => {
      timer.current = 0
      openRef.current = true
      setOpen(true)
    }, delayMs)
  }, [delayMs, hide])

  // 卸载时清掉未触发的定时器
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // 打开期间：Esc 收起，滚动时收起以免气泡停在旧位置
  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      triggers.current = { hover: false, focus: false }
      hide()
    }
    const onScroll = () => hide()
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [hide, open])

  const visible = open && content !== null && content !== undefined && content !== ''

  return (
    <>
      <span
        ref={anchorRef}
        className={styles.trigger}
        onPointerEnter={() => {
          triggers.current.hover = true
          sync()
        }}
        onPointerLeave={() => {
          triggers.current.hover = false
          sync()
        }}
        onFocus={() => {
          triggers.current.focus = true
          sync()
        }}
        onBlur={event => {
          if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
            return
          }
          triggers.current.focus = false
          sync()
        }}
      >
        {children}
      </span>
      {visible
        ? createPortal(
            <div ref={floatingRef} role="tooltip" className={styles.tooltip} style={style}>
              {content}
            </div>,
            overlayContainer()
          )
        : null}
    </>
  )
}
