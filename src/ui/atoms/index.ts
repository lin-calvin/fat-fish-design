/**
 * 原子控件层：纯受控、无 store / i18n / 数据访问依赖。
 * 所有文案（按钮名、关闭按钮名、菜单名、选择器名）都从 props 注入。
 */
export { Button } from './Button'
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button'

export { IconButton } from './IconButton'
export type { IconButtonProps, IconButtonSize, IconButtonTone } from './IconButton'

export { Tag } from './Tag'
export type { TagProps, TagTone } from './Tag'

export { Pill } from './Pill'
export type { PillProps } from './Pill'

export { Switch } from './Switch'
export type { SwitchProps } from './Switch'

export { Checkbox } from './Checkbox'
export type { CheckboxProps } from './Checkbox'

export { Tooltip } from './Tooltip'
export type { TooltipPlacement, TooltipProps } from './Tooltip'

export { Menu } from './Menu'
export type { MenuItemSpec, MenuProps } from './Menu'

export { Modal } from './Modal'
export type { ModalProps } from './Modal'

export { Select } from './Select'
export type { SelectOption, SelectProps } from './Select'
