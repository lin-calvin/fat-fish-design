/**
 * 浮层定位与外部点击关闭的共用逻辑，供 Tooltip / Menu / Select 使用。
 * 只读 DOM 几何信息，不持有任何模块级可变状态；所有监听器都在 effect 里成对清理。
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'

/** 浮层与视口边缘的最小间距 */
const VIEWPORT_PADDING = 8

export type Side = 'top' | 'bottom'
export type Align = 'start' | 'center' | 'end'

export interface FloatingOptions {
  /** 优先出现的一侧，放不下时翻面 */
  side?: Side
  /** 相对触发元素的水平对齐 */
  align?: Align
  /** 与触发元素之间的间距 */
  offset?: number
  /** 面板最小宽度跟随触发元素 */
  matchWidth?: boolean
  /** 面板高度上限，超出后在面板内滚动 */
  maxHeight?: number
  /** 触发元素自身不产生盒子（display: contents）时，测量它的第一个子元素 */
  measureFirstChild?: boolean
}

/**
 * 测量前的状态：透明且不参与命中测试。
 * 这里不能用 visibility: hidden —— 隐藏元素无法获得焦点，而 Menu/Select 会在挂载后
 * 立刻把焦点移进面板，那一刻还没测完位置。
 */
const HIDDEN: CSSProperties = { opacity: 0, pointerEvents: 'none' }

/**
 * 浮层挂在 body（或最上层 dialog）上用 position: fixed 按视口坐标摆放。
 * 浮层尺寸只有挂载后才能测到，所以第一次绘制前是隐藏的。
 */
export const useFloating = <A extends HTMLElement, F extends HTMLElement>(
  open: boolean,
  {
    side = 'bottom',
    align = 'start',
    offset = 4,
    matchWidth = false,
    maxHeight,
    measureFirstChild = false,
  }: FloatingOptions = {}
) => {
  const anchorRef = useRef<A | null>(null)
  const floatingRef = useRef<F | null>(null)
  const [style, setStyle] = useState<CSSProperties>(HIDDEN)

  /** 触发元素自身没有盒子时退到第一个子元素 */
  const getAnchor = useCallback(
    () =>
      (measureFirstChild ? anchorRef.current?.firstElementChild : anchorRef.current) as
        | HTMLElement
        | null,
    [measureFirstChild]
  )

  const update = useCallback(() => {
    const anchorElement = getAnchor()
    const floating = floatingRef.current
    if (!anchorElement || !floating) {
      return
    }
    const anchor = anchorElement.getBoundingClientRect()
    const box = floating.getBoundingClientRect()
    const spaceAbove = anchor.top - offset - VIEWPORT_PADDING
    const spaceBelow = window.innerHeight - anchor.bottom - offset - VIEWPORT_PADDING

    // 先按“整块能不能放下”判断要不要翻面，都放不下时退到空间更大的一侧
    const needed = box.height
    const fitsAbove = spaceAbove >= needed
    const fitsBelow = spaceBelow >= needed
    let resolved: Side = side
    if (side === 'bottom' ? !fitsBelow && fitsAbove : !fitsAbove && fitsBelow) {
      resolved = side === 'bottom' ? 'top' : 'bottom'
    }

    const width = box.width
    let left =
      align === 'center'
        ? anchor.left + anchor.width / 2 - width / 2
        : align === 'end'
          ? anchor.right - width
          : anchor.left
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, window.innerWidth - width - VIEWPORT_PADDING)
    )

    let top = resolved === 'bottom' ? anchor.bottom + offset : anchor.top - offset - needed
    let limit: number | undefined

    if (maxHeight !== undefined) {
      const available = Math.max(0, resolved === 'bottom' ? spaceBelow : spaceAbove)
      limit = Math.max(40, Math.min(maxHeight, available, floating.scrollHeight + 2))
      if (resolved === 'top') {
        top = Math.max(VIEWPORT_PADDING, anchor.top - offset - limit)
      }
    }

    top = Math.max(VIEWPORT_PADDING, top)

    const next: CSSProperties = {
      top,
      left,
      maxHeight: limit,
      minWidth: matchWidth ? anchor.width : undefined,
      opacity: 1,
    }
    setStyle(previous =>
      previous.top === next.top &&
      previous.left === next.left &&
      previous.maxHeight === next.maxHeight &&
      previous.minWidth === next.minWidth &&
      previous.opacity === 1
        ? previous
        : next
    )
  }, [align, getAnchor, matchWidth, maxHeight, offset, side])

  // 打开时与浮层内容变化时在绘制前测量，避免先出现在错误位置
  useLayoutEffect(() => {
    if (open) {
      update()
    }
  }, [open, update])

  // 打开期间跟踪无法在渲染时预知的位置来源：浮层/触发元素尺寸、窗口尺寸、任意滚动
  useLayoutEffect(() => {
    if (!open) {
      return
    }
    const floating = floatingRef.current
    if (!floating) {
      return
    }
    const anchor = getAnchor()
    const observer = new ResizeObserver(() => update())
    observer.observe(floating)
    if (anchor) {
      observer.observe(anchor)
    }
    window.addEventListener('scroll', update, { capture: true, passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', update, { capture: true })
      window.removeEventListener('resize', update)
    }
  }, [getAnchor, open, update])

  useEffect(() => {
    if (!open) {
      setStyle(HIDDEN)
    }
  }, [open])

  return { anchorRef, floatingRef, style }
}

/**
 * 点击浮层与触发元素之外时关闭。
 * 用捕获阶段监听，避免调用方的 stopPropagation 让浮层关不掉。
 */
export const useOutsideDismiss = (
  open: boolean,
  refs: readonly RefObject<HTMLElement | null>[],
  onDismiss: () => void
) => {
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss
  const refsRef = useRef(refs)
  refsRef.current = refs

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && refsRef.current.some(ref => ref.current?.contains(target))) {
        return
      }
      dismissRef.current()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])
}

/**
 * 浮层的挂载点。原生 dialog 位于浏览器顶层（top layer），挂到 body 的浮层会排在它后面，
 * 因此弹窗内打开的下拉/提示必须挂进 dialog 内部。
 */
export const overlayContainer = (): HTMLElement =>
  document.querySelector<HTMLDialogElement>('dialog[open]') ?? document.body
