import type { MessageLabels } from '../../chat-protocol/labels'
import { IconButton } from './Controls'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import styles from './BranchSwitcher.module.css'

export interface BranchSwitcherProps {
  /** 0-based 当前分支下标 */
  current: number
  total: number
  onChange: (index: number) => void
  labels: MessageLabels
}

/** 兄弟分支切换器：纯受控，按下标回调。 */
export function BranchSwitcher({ current, total, onChange, labels }: BranchSwitcherProps): JSX.Element | null {
  if (total <= 1) return null
  const index = Math.min(Math.max(current, 0), total - 1)
  return (
    <div className={styles.switcher} role="group" aria-label={labels.branch(index + 1, total)}>
      <IconButton
        label={labels.previousBranch}
        icon={<ChevronLeftIcon />}
        disabled={index <= 0}
        onClick={() => onChange(index - 1)}
      />
      <span className={styles.count} aria-hidden="true">{`${index + 1} / ${total}`}</span>
      <IconButton
        label={labels.nextBranch}
        icon={<ChevronRightIcon />}
        disabled={index >= total - 1}
        onClick={() => onChange(index + 1)}
      />
    </div>
  )
}
