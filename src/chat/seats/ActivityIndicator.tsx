import type { ReactNode } from 'react'
import styles from './seats.module.css'

export type ActivityStatus = 'idle' | 'running' | 'error'

export interface ActivityIndicatorProps {
  readonly status: ActivityStatus
  /** 状态文案；idle 时不显示 */
  readonly label?: string
  /** 次要信息，例如 “12s” 或 “3 个工具调用” */
  readonly detail?: string
  readonly icon?: ReactNode
}

/** 输入区右侧的活动指示：一个状态点 + 文本，纯展示。 */
export function ActivityIndicator({ status, label, detail, icon }: ActivityIndicatorProps) {
  if (status === 'idle' && label === undefined) return null
  return (
    <span className={styles.activity} role="status" aria-live="polite">
      {icon ?? <span className={styles.dot} data-status={status} />}
      {label !== undefined ? <span>{label}</span> : null}
      {detail !== undefined ? <span>{detail}</span> : null}
    </span>
  )
}
