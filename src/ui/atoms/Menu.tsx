import clsx from 'clsx'
import {
  Fragment,
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { overlayContainer, useFloating, useOutsideDismiss } from './internal/anchored'
import styles from './Menu.module.css'

export interface MenuItemSpec {
  id: string
  label: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  separatorBefore?: boolean
}

export type MenuProps = {
  items: readonly MenuItemSpec[]
  onSelect: (id: string) => void
  children: ReactElement
  placement?: 'bottom-start' | 'bottom-end'
  /** 菜单的无障碍名称 */
  label: string
}

/**
 * 点击触发的命令菜单。面板挂在 body（或最上层 dialog）上按 rect 定位，
 * 键盘：↑/↓ 移动、Home/End 到首尾、Enter/Space 执行、Esc/Tab 关闭；
 * 关闭后焦点还给触发元素（点外部关闭时留给被点的目标）。
 */
export const Menu = ({ items, onSelect, children, placement = 'bottom-start', label }: MenuProps) => {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const { anchorRef, floatingRef, style } = useFloating<HTMLSpanElement, HTMLDivElement>(open, {
    side: 'bottom',
    align: placement === 'bottom-end' ? 'end' : 'start',
    offset: 4,
    // 长菜单在视口内收口并自身滚动，不会顶出屏幕
    maxHeight: 320,
  })
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  /** 打开前的焦点位置，关闭时归还 */
  const restoreRef = useRef<HTMLElement | null>(null)
  const initialFocus = useRef<'first' | 'last'>('first')

  const close = (restoreFocus: boolean) => {
    if (!restoreFocus) {
      restoreRef.current = null
    }
    setOpen(false)
  }

  useOutsideDismiss(open, [anchorRef, floatingRef], () => close(false))

  // 打开时记住来源焦点并移到第一项；关闭时归还焦点
  useEffect(() => {
    if (!open) {
      return
    }
    const active = document.activeElement
    restoreRef.current = active instanceof HTMLElement ? active : null
    const enabled = itemRefs.current.filter(
      (element): element is HTMLButtonElement =>
        element !== null && element.getAttribute('aria-disabled') !== 'true'
    )
    const target = initialFocus.current === 'last' ? enabled[enabled.length - 1] : enabled[0]
    target?.focus()
    return () => {
      const restore = restoreRef.current
      restoreRef.current = null
      if (restore?.isConnected) {
        restore.focus()
      }
    }
  }, [open])

  const enabledItems = () =>
    itemRefs.current.filter(
      (element): element is HTMLButtonElement =>
        element !== null && element.getAttribute('aria-disabled') !== 'true'
    )

  const step = (delta: 1 | -1) => {
    const list = enabledItems()
    if (list.length === 0) {
      return
    }
    const current = list.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      current === -1
        ? delta === 1
          ? 0
          : list.length - 1
        : (current + delta + list.length) % list.length
    list[next]?.focus()
  }

  const choose = (item: MenuItemSpec) => {
    if (item.disabled) {
      return
    }
    const restore = restoreRef.current
    restoreRef.current = null
    // 先还焦点再交给调用方，避免调用方打开弹窗后焦点被抢回来
    restore?.focus()
    setOpen(false)
    onSelect(item.id)
  }

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        step(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        step(-1)
        break
      case 'Home': {
        event.preventDefault()
        enabledItems()[0]?.focus()
        break
      }
      case 'End': {
        event.preventDefault()
        const list = enabledItems()
        list[list.length - 1]?.focus()
        break
      }
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close(true)
        break
      case 'Tab':
        // 不拦截 Tab：先把焦点还给触发器，默认行为再从它往后走
        close(true)
        break
      default:
        break
    }
  }

  const onTriggerClick = () => {
    if (open) {
      restoreRef.current = null
      setOpen(false)
      return
    }
    initialFocus.current = 'first'
    setOpen(true)
  }

  // ↑/↓ 可以直接把菜单拉起来并定位到首/尾项
  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (open || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
      return
    }
    event.preventDefault()
    initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first'
    setOpen(true)
  }

  return (
    <>
      <span
        ref={anchorRef}
        className={styles.anchor}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
      >
        {cloneElement(children, {
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          'aria-controls': open ? menuId : undefined,
        })}
      </span>
      {open
        ? createPortal(
            <div
              ref={floatingRef}
              id={menuId}
              role="menu"
              aria-label={label}
              data-atom-overlay="menu"
              className={styles.menu}
              style={style}
              onKeyDown={onMenuKeyDown}
            >
              {items.map((item, index) => (
                <Fragment key={item.id}>
                  {item.separatorBefore && index > 0 ? (
                    <div role="separator" className={styles.separator} />
                  ) : null}
                  <button
                    ref={element => {
                      itemRefs.current[index] = element
                    }}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    aria-disabled={item.disabled ? true : undefined}
                    className={clsx(styles.item, item.danger && styles.danger)}
                    onClick={() => choose(item)}
                    onPointerEnter={event => {
                      if (!item.disabled) {
                        event.currentTarget.focus()
                      }
                    }}
                  >
                    {item.icon != null ? <span className={styles.icon}>{item.icon}</span> : null}
                    <span className={styles.itemLabel}>{item.label}</span>
                  </button>
                </Fragment>
              ))}
            </div>,
            overlayContainer()
          )
        : null}
    </>
  )
}
