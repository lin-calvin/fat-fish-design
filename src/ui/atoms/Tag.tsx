import type { ReactNode } from 'react'
import styles from './Tag.module.css'

export type TagTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

export type TagProps = {
  children: ReactNode
  tone?: TagTone
}

/** 只读的小角标；文案由调用方给出，本身不可点击。 */
export const Tag = ({ children, tone = 'neutral' }: TagProps) => (
  <span className={styles.tag} data-tone={tone}>
    {children}
  </span>
)
