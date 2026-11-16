import clsx from 'clsx'
import type { ToastRecord } from './types'
import styles from './Toast.module.css'

interface ToastViewportProps {
  readonly items: readonly ToastRecord[]
}

/**
 * 纯展示：不再持有任何状态或定时器。
 * 容器常驻 role="status" + aria-live="polite"；错误项自己挂 role="alert"。
 */
export function ToastViewport({ items }: ToastViewportProps) {
  if (items.length === 0) return null

  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {items.map(item => (
        <div
          key={item.id}
          className={clsx(styles.toast, styles[item.tone], item.leaving && styles.leaving)}
          role={item.tone === 'error' ? 'alert' : undefined}
        >
          <span className={styles.text}>{item.text}</span>
          {item.link ? (
            <a className={styles.link} href={item.link.href} target="_blank" rel="noreferrer">
              {item.link.label}
            </a>
          ) : null}
        </div>
      ))}
    </div>
  )
}
