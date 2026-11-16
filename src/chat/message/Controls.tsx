import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './Controls.module.css'

/** 只有图标、文案走 aria-label 的按钮。 */
export function IconButton({
  label,
  icon,
  onClick,
  disabled,
  className,
}: {
  label: string
  icon: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={clsx(styles.iconButton, className)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}

/** 带文案的胶囊按钮。 */
export function TextButton({
  label,
  icon,
  onClick,
  disabled,
  className,
}: {
  label: string
  icon?: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={clsx(styles.textButton, className)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon ? (
        <span className={styles.textIcon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.textLabel}>{label}</span>
    </button>
  )
}
