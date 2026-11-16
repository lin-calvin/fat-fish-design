import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './IconButton.module.css'

export type IconButtonTone = 'default' | 'brand' | 'danger'
export type IconButtonSize = 'sm' | 'md'

export type IconButtonProps = {
  icon: ReactNode
  /** 同时也作为无障碍名称，必须由调用方提供本地化文案 */
  label: string
  tone?: IconButtonTone
  size?: IconButtonSize
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

/** 只有图标的按钮，名称来自 props.label。 */
export const IconButton = ({
  icon,
  label,
  tone = 'default',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    className={clsx(styles.button, styles[tone], styles[size], className)}
    {...rest}
  >
    {icon}
  </button>
)
