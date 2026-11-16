import clsx from 'clsx'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SiderLabels } from '../../chat-protocol/labels'
import type { SessionSummary } from '../../chat-protocol/types'
import { EditIcon, EllipsisIcon, TrashIcon } from './icons'
import styles from './SessionItem.module.css'

/** SiderLabels 里没有“取消/确认”键，二次确认的取消按钮先用英文兜底。TODO(labels): 补 `sider.cancel`。 */

export interface SessionItemProps {
  session: SessionSummary
  active?: boolean
  labels: SiderLabels
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
}

interface Coords {
  top: number
  left: number
}

/** 会话条目：标题 + 悬浮“更多”。菜单里的重命名走行内输入，删除走行内二次确认（不依赖 Modal）。 */
export function SessionItem({
  session,
  active,
  labels,
  onSelect,
  onRename,
  onDelete,
}: SessionItemProps) {
  const title = session.title.trim() || labels.untitled
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const [coords, setCoords] = useState<Coords | null>(null)

  const selectRef = useRef<HTMLButtonElement | null>(null)
  const moreRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null)
  const deleteItemRef = useRef<HTMLButtonElement | null>(null)
  /** 打开菜单后需要把焦点移进菜单（等可见后执行一次）。 */
  const focusPendingRef = useRef(false)
  /** 上一帧是否处于二次确认，用于把焦点还给“删除”项。 */
  const wasConfirmingRef = useRef(false)
  /** 重命名结束后把焦点还给条目本身（输入框已卸载，焦点会掉到 body）。 */
  const refocusRef = useRef(false)
  /** Esc 取消后紧跟的 blur 不应再提交一次。 */
  const cancelBlurRef = useRef(false)

  const closeMenu = useCallback(() => {
    const focusInsideMenu = menuRef.current?.contains(document.activeElement) ?? false
    setMenuOpen(false)
    setConfirming(false)
    setCoords(null)
    // 键盘打开/操作后焦点留在菜单里，关闭时还给“更多”按钮。
    if (focusInsideMenu) moreRef.current?.focus()
  }, [])

  const toggleMenu = useCallback(() => {
    if (menuOpen) {
      closeMenu()
      return
    }
    setCoords(null)
    setConfirming(false)
    setMenuOpen(true)
    focusPendingRef.current = true
  }, [closeMenu, menuOpen])

  // 打开时测量锚点并夹在视口内；空间不够就翻到上方。
  // 任何祖先滚动（会话列表、流式聊天）都只重新定位，不关闭菜单。
  useLayoutEffect(() => {
    if (!menuOpen) return
    let frame = 0
    const place = () => {
      const anchor = moreRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const width = menuRef.current?.offsetWidth ?? 208
      const height = menuRef.current?.offsetHeight ?? 96
      const margin = 8
      let top = rect.bottom + 4
      if (top + height > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - 4 - height)
      }
      let left = rect.right - width
      left = Math.min(Math.max(margin, left), window.innerWidth - width - margin)
      // 坐标没变就不触发重渲（流式滚动会高频回调）
      setCoords(prev => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
    }
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        place()
      })
    }
    place()
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [menuOpen, confirming])

  // 打开后把焦点交给第一个菜单项，键盘用户不必穿过整张列表。
  // 必须等 coords 落地（菜单从 visibility:hidden 变为可见）之后才 focus，否则会被浏览器忽略。
  useEffect(() => {
    if (!menuOpen || !coords || !focusPendingRef.current) return
    focusPendingRef.current = false
    menuRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [coords, menuOpen])

  // 二次确认进出时把焦点交给“取消”/回到“删除”，避免焦点掉到 body。
  useEffect(() => {
    if (confirming) {
      confirmCancelRef.current?.focus()
    } else if (wasConfirmingRef.current && menuOpen) {
      deleteItemRef.current?.focus()
    }
    wasConfirmingRef.current = confirming
  }, [confirming, menuOpen])

  // 菜单只在自己打开时挂全局监听：点外部 / Esc 关闭。
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (menuRef.current?.contains(target) || moreRef.current?.contains(target)) return
      closeMenu()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [closeMenu, menuOpen])

  useEffect(() => {
    if (editing || !refocusRef.current) return
    refocusRef.current = false
    selectRef.current?.focus()
  }, [editing])

  const startRename = useCallback(() => {
    closeMenu()
    setDraft(title)
    cancelBlurRef.current = false
    setEditing(true)
  }, [closeMenu, title])

  const commitRename = useCallback(() => {
    const next = draft.trim()
    refocusRef.current = true
    setEditing(false)
    if (next && next !== title) onRename(next)
  }, [draft, onRename, title])

  const cancelRename = useCallback(() => {
    refocusRef.current = true
    setEditing(false)
  }, [])

  if (editing) {
    return (
      <input
        className={styles.renameInput}
        value={draft}
        aria-label={labels.rename}
        autoFocus
        onChange={event => setDraft(event.target.value)}
        onFocus={event => event.currentTarget.select()}
        onBlur={() => {
          if (cancelBlurRef.current) {
            cancelBlurRef.current = false
            return
          }
          commitRename()
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            // 阻止 Enter 的默认动作，否则 keypress 会落到重命名后重新获得焦点的条目上触发一次选中。
            event.preventDefault()
            commitRename()
          } else if (event.key === 'Escape') {
            event.stopPropagation()
            cancelBlurRef.current = true
            cancelRename()
          }
        }}
      />
    )
  }

  return (
    <div className={clsx(styles.item, active && styles.active)}>
      <button
        ref={selectRef}
        type="button"
        className={styles.select}
        aria-current={active ? 'page' : undefined}
        title={title}
        onClick={onSelect}
      >
        <span className={styles.title}>{title}</span>
      </button>
      <button
        ref={moreRef}
        type="button"
        className={styles.more}
        aria-label={labels.more}
        title={labels.more}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={toggleMenu}
      >
        <EllipsisIcon />
      </button>
      {menuOpen
        ? createPortal(
            <div
              ref={menuRef}
              className={styles.menu}
              role={confirming ? 'group' : 'menu'}
              aria-label={confirming ? labels.deleteTitle : labels.more}
              style={{
                top: coords?.top ?? 0,
                left: coords?.left ?? 0,
                visibility: coords ? 'visible' : 'hidden',
              }}
            >
              {confirming ? (
                <div className={styles.confirm}>
                  <div className={styles.confirmTitle}>{labels.deleteTitle}</div>
                  <p className={styles.confirmText}>{labels.deleteDescription}</p>
                  <div className={styles.confirmActions}>
                    <button
                      ref={confirmCancelRef}
                      type="button"
                      className={styles.secondary}
                      onClick={() => setConfirming(false)}
                    >
                      {labels.cancel}
                    </button>
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={() => {
                        closeMenu()
                        onDelete()
                      }}
                    >
                      {labels.delete}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    onClick={startRename}
                  >
                    <EditIcon />
                    <span>{labels.rename}</span>
                  </button>
                  <button
                    ref={deleteItemRef}
                    type="button"
                    role="menuitem"
                    className={clsx(styles.menuItem, styles.menuItemDanger)}
                    onClick={() => setConfirming(true)}
                  >
                    <TrashIcon />
                    <span>{labels.delete}</span>
                  </button>
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
