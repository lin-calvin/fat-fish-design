import type { ReactNode } from 'react'
import { Menu } from '../../ui/atoms'
import styles from './seats.module.css'
import { ChevronIcon, LockIcon } from './icons'

export interface PermissionOption {
  readonly id: string
  readonly label: string
  readonly icon?: ReactNode
}

export interface PermissionSelectProps {
  readonly value: string
  readonly options: readonly PermissionOption[]
  readonly onChange: (id: string) => void
  /** 控件的无障碍名称，同时作为菜单名称 */
  readonly label: string
  readonly icon?: ReactNode
  readonly disabled?: boolean
  readonly placement?: 'bottom-start' | 'bottom-end'
}

/**
 * 权限模式选择器。库不预设“只读 / 可写 / 完全访问”这些语义——
 * 选项与文案由调用方提供，组件只负责「当前值 + 菜单 + 回调」。
 */
export function PermissionSelect({
  value,
  options,
  onChange,
  label,
  icon,
  disabled = false,
  placement = 'bottom-start',
}: PermissionSelectProps) {
  const current = options.find(option => option.id === value) ?? options[0]

  return (
    <Menu
      label={label}
      placement={placement}
      items={options.map(option => ({
        id: option.id,
        label: option.label,
        ...(option.icon === undefined ? {} : { icon: option.icon }),
      }))}
      onSelect={id => {
        if (id !== value) onChange(id)
      }}
    >
      <button
        type="button"
        className={styles.chip}
        aria-label={`${label}: ${current?.label ?? value}`}
        disabled={disabled}
        title={label}
      >
        <span className={styles.icon}>{icon ?? <LockIcon />}</span>
        <span>{current?.label ?? value}</span>
        <span className={styles.chevron}><ChevronIcon /></span>
      </button>
    </Menu>
  )
}
