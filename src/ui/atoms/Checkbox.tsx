import styles from './Checkbox.module.css'

export type CheckboxProps = {
  checked: boolean
  onChange: (next: boolean) => void
  /** 可见文案，同时就是控件的无障碍名称 */
  label: string
  disabled?: boolean
}

/** 原生 input[type=checkbox]，键盘与表单语义都由浏览器提供。 */
export const Checkbox = ({ checked, onChange, label, disabled = false }: CheckboxProps) => (
  <label className={styles.checkbox}>
    <input
      type="checkbox"
      className={styles.input}
      checked={checked}
      disabled={disabled}
      onChange={event => onChange(event.currentTarget.checked)}
    />
    <span className={styles.label}>{label}</span>
  </label>
)
