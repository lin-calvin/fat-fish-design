import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

export interface EmptyStateProps {
  readonly title: string
  readonly description?: string
  /** 建议词列表；点击回调 onPick，按钮保持原生键盘可达。 */
  readonly items?: readonly string[]
  readonly onPick?: (text: string) => void
  /** 图标插槽，纯装饰；语义由 title / description 承担。 */
  readonly icon?: ReactNode
}

/** 居中的空态：图标 + 标题 + 可选描述 + 可选建议词。自身不产生任何文案。 */
export function EmptyState({ title, description, items, onPick, icon }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      {icon !== undefined ? (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className={styles.title}>{title}</p>
      {description !== undefined && description !== '' ? (
        <p className={styles.description}>{description}</p>
      ) : null}
      {items !== undefined && items.length > 0 ? (
        <div className={styles.items}>
          {items.map((text, index) => (
            <button
              key={`${index}-${text}`}
              type="button"
              className={styles.item}
              onClick={() => onPick?.(text)}
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
