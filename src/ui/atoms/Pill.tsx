import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './Pill.module.css'

export type PillProps = {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  disabled?: boolean
}

/**
 * 可选中的胶囊标签（视图切换、筛选条件）。
 * 给了 onClick 才渲染成按钮；否则是纯展示的 span，避免出现点不动的按钮。
 */
export const Pill = ({ children, active = false, onClick, disabled = false }: PillProps) => {
  if (!onClick) {
    return (
      <span className={clsx(styles.pill, styles.static, active && styles.active)}>
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={clsx(styles.pill, active && styles.active)}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
