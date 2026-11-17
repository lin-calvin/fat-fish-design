import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './seats.module.css'
import { PlanIcon } from './icons'

export interface PlanToggleProps {
  /** 可见文案，同时作为无障碍名称 */
  readonly label: string
  readonly active: boolean
  readonly onToggle: (next: boolean) => void
  readonly icon?: ReactNode
  readonly disabled?: boolean
}

/** 计划模式开关：一个 aria-pressed 的胶囊按钮，语义由调用方定义。 */
export function PlanToggle({ label, active, onToggle, icon, disabled = false }: PlanToggleProps) {
  return (
    <button
      type="button"
      className={clsx(styles.chip)}
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      onClick={() => onToggle(!active)}
    >
      <span className={styles.icon}>{icon ?? <PlanIcon />}</span>
      <span>{label}</span>
    </button>
  )
}
