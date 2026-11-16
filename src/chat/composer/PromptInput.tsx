import styles from './PromptInput.module.css'
import { TextArea } from './TextArea'

export interface PromptInputProps {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  /** 无障碍名称 */
  label: string
  /** 默认 8，超过后内部滚动 */
  maxRows?: number
}

/**
 * 纯文本输入框：只要一个受控的 textarea，不带附件、开关和语音。
 * 需要完整输入区时用 Composer。
 */
export const PromptInput = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  autoFocus = false,
  label,
  maxRows = 8,
}: PromptInputProps) => (
  <div
    className={styles.frame}
    data-disabled={disabled ? 'true' : undefined}
    style={{ '--max-rows': String(maxRows) } as React.CSSProperties}
  >
    <TextArea
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      label={label}
      maxRows={maxRows}
      className={styles.input}
    />
  </div>
)
