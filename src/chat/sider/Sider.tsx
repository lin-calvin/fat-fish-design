import clsx from 'clsx'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { SiderLabels } from '../../chat-protocol/labels'
import type { SessionSummary } from '../../chat-protocol/types'
import { SessionItem } from './SessionItem'
import { NewChatIcon, PanelLeftIcon } from './icons'
import styles from './Sider.module.css'

export interface SiderProps {
  sessions: readonly SessionSummary[]
  activeId?: string | null
  collapsed?: boolean
  /** 分组基准时间，默认 Date.now()；跨零点刷新交给调用方 */
  now?: number
  labels: SiderLabels
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onCollapseToggle?: () => void
  footer?: ReactNode
}

type GroupKey = 'today' | 'yesterday' | 'earlier'

interface SessionGroup {
  key: GroupKey
  label: string
  sessions: SessionSummary[]
}

const startOfDay = (time: number) => {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** 按 updatedAt 分今天 / 昨天 / 更早，组内仍按时间倒序。 */
const groupSessions = (
  sessions: readonly SessionSummary[],
  now: number,
  labels: SiderLabels,
): SessionGroup[] => {
  const todayStart = startOfDay(now)
  const yesterday = new Date(todayStart)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStart = yesterday.getTime()

  const groups: SessionGroup[] = [
    { key: 'today', label: labels.today, sessions: [] },
    { key: 'yesterday', label: labels.yesterday, sessions: [] },
    { key: 'earlier', label: labels.earlier, sessions: [] },
  ]
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)
  for (const session of sorted) {
    if (session.updatedAt >= todayStart) groups[0].sessions.push(session)
    else if (session.updatedAt >= yesterdayStart) groups[1].sessions.push(session)
    else groups[2].sessions.push(session)
  }
  return groups.filter(group => group.sessions.length > 0)
}

/** 会话侧栏：新建入口、按时间分组的会话列表、可选的底部插槽；collapsed 时收成 60px 图标条。 */
export function Sider({
  sessions,
  activeId,
  collapsed = false,
  now,
  labels,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onCollapseToggle,
  footer,
}: SiderProps) {
  const groups = useMemo(() => groupSessions(sessions, now ?? Date.now(), labels), [sessions, now, labels])

  if (collapsed) {
    return (
      <div className={clsx(styles.sider, styles.collapsedSider)}>
        <div className={styles.collapsedStack}>
          <button
            type="button"
            className={styles.collapsedButton}
            aria-label={labels.newChat}
            title={labels.newChat}
            onClick={onNew}
          >
            <NewChatIcon />
          </button>
          {onCollapseToggle ? (
            <button
              type="button"
              className={styles.collapsedButton}
              aria-label={labels.expand}
              title={labels.expand}
              onClick={onCollapseToggle}
            >
              <PanelLeftIcon />
            </button>
          ) : null}
        </div>
        {footer ? <div className={styles.collapsedFooter}>{footer}</div> : null}
      </div>
    )
  }

  return (
    <div className={styles.sider}>
      <div className={styles.top}>
        <button type="button" className={styles.newChat} onClick={onNew}>
          <span className={styles.newChatIcon}>
            <NewChatIcon />
          </span>
          <span className={styles.newChatLabel}>{labels.newChat}</span>
        </button>
        {onCollapseToggle ? (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={labels.collapse}
            title={labels.collapse}
            onClick={onCollapseToggle}
          >
            <PanelLeftIcon />
          </button>
        ) : null}
      </div>
      <div className={styles.list}>
        {groups.length === 0 ? (
          <div className={styles.empty}>{labels.empty}</div>
        ) : (
          groups.map(group => (
            <div key={group.key} className={styles.section}>
              <div className={styles.sectionHeader}>{group.label}</div>
              {group.sessions.map(session => (
                <SessionItem
                  key={session.id}
                  session={session}
                  active={session.id === activeId}
                  labels={labels}
                  onSelect={() => onSelect(session.id)}
                  onRename={title => onRename(session.id, title)}
                  onDelete={() => onDelete(session.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  )
}
