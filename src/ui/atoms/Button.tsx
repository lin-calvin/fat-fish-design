import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'toolbar'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
  children?: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

/** 带文案的主操作/次操作按钮；文案与图标都由调用方提供。 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={clsx(
      styles.button,
      styles[variant],
      styles[size],
      block && styles.block,
      className
    )}
    {...rest}
  >
    {icon != null ? <span className={styles.icon}>{icon}</span> : null}
    {children}
  </button>
)
