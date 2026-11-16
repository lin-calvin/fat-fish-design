import styles from './Switch.module.css'

export type SwitchProps = {
  checked: boolean
  onChange: (next: boolean) => void
  /** 无障碍名称，由调用方提供本地化文案 */
  label: string
  disabled?: boolean
}

/**
 * 双态开关。用原生 button + role="switch"，Space / Enter 直接可用，
 * 视觉状态只跟随 aria-checked，不会和读屏读到的状态脱节。
 */
export const Switch = ({ checked, onChange, label, disabled = false }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    className={styles.switch}
    onClick={() => onChange(!checked)}
  >
    <span className={styles.track} aria-hidden="true">
      <span className={styles.thumb} />
    </span>
  </button>
)
