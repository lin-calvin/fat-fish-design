import { useEffect, useId, useLayoutEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import styles from './Modal.module.css'

export type ModalProps = {
  open: boolean
  title: ReactNode
  children?: ReactNode
  footer?: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg'
  /** 关闭按钮的无障碍名称 */
  closeLabel: string
}

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M4 4l8 8M12 4l-8 8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

/**
 * 原生 <dialog> + showModal()：顶层渲染、Esc、背景 inert 全部由浏览器负责，
 * 因此没有任何手写的焦点陷阱。open 变化时同步开关，浏览器侧关闭（Esc）会回调 onClose。
 */
export const Modal = ({
  open,
  title,
  children,
  footer,
  onClose,
  size = 'md',
  closeLabel,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  /** 由我们主动 close() 时，不要再把 close 事件当成用户关闭 */
  const silentRef = useRef(false)
  /** 按下点是否落在遮罩上，避免从卡片里拖到外面释放就关闭 */
  const backdropDown = useRef(false)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal()
      }
      return
    }
    if (dialog.open) {
      silentRef.current = true
      dialog.close()
    }
  }, [open])

  // 浏览器侧的关闭（Esc / 表单 method=dialog）同样回调 onClose；菜单开着的 Esc 归菜单
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    const onCloseEvent = () => {
      if (silentRef.current) {
        silentRef.current = false
        return
      }
      closeRef.current()
    }
    const onCancelEvent = (event: Event) => {
      // 弹窗内的菜单/下拉开着时，Esc 先归它们，别把弹窗一起关掉
      if (document.querySelector('[data-atom-overlay]')) {
        event.preventDefault()
      }
    }
    dialog.addEventListener('close', onCloseEvent)
    dialog.addEventListener('cancel', onCancelEvent)
    return () => {
      dialog.removeEventListener('close', onCloseEvent)
      dialog.removeEventListener('cancel', onCancelEvent)
    }
  }, [])

  const onDialogPointerDown = (event: MouseEvent<HTMLDialogElement>) => {
    backdropDown.current = event.target === event.currentTarget
  }

  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    const onBackdrop = backdropDown.current && event.target === event.currentTarget
    backdropDown.current = false
    if (onBackdrop) {
      closeRef.current()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      data-atom-modal=""
      onPointerDown={onDialogPointerDown}
      onClick={onDialogClick}
    >
      <div className={styles.card} data-size={size}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label={closeLabel}
            onClick={() => closeRef.current()}
          >
            <CloseIcon />
          </button>
        </header>
        {children != null ? <div className={styles.body}>{children}</div> : null}
        {footer != null ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  )
}
