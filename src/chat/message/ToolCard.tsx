import clsx from 'clsx'
import { useState } from 'react'
import type { MessageLabels } from '../../chat-protocol/labels'
import type { Block } from '../../chat-protocol/types'
import { ChevronDownIcon } from './icons'
import styles from './ToolCard.module.css'

export type ToolBlock = Extract<Block, { kind: 'tool' }>

/**
 * 工具调用卡片：状态点（running / done / error）+ 名称 + 摘要，detail 默认折叠。
 * 展开状态是组件内部的纯 UI 状态，不影响任何领域数据。
 */
export function ToolCard({ block, labels }: { block: ToolBlock; labels: MessageLabels }) {
  const [open, setOpen] = useState(false)
  const hasDetail = block.detail !== undefined && block.detail !== ''

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span
          className={styles.dot}
          data-status={block.status}
          role="img"
          aria-label={`${labels.tool}: ${block.status}`}
        />
        <span className={styles.name}>{block.name}</span>
        {block.summary ? <span className={styles.summary}>{block.summary}</span> : null}
        {hasDetail ? (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-label={labels.tool}
            onClick={() => setOpen(!open)}
          >
            <ChevronDownIcon className={clsx(styles.chevron, open && styles.chevronOpen)} />
          </button>
        ) : null}
      </div>
      {hasDetail && open ? <pre className={styles.detail}>{block.detail}</pre> : null}
    </div>
  )
}
