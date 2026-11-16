import clsx from 'clsx'
import { useCallback, useRef, type CSSProperties, type ReactNode } from 'react'
import type { ComposerLabels } from '../../chat-protocol/labels'
import type { Attachment, ComposerValue, SpeechPort } from '../../chat-protocol/types'
import { AttachmentTray } from './AttachmentTray'
import styles from './Composer.module.css'
import { IconMic, IconPaperclip, IconSearch, IconSend, IconStop, IconThink } from './icons'
import { TextArea } from './TextArea'
import { useFileDrop } from './useFileDrop'
import { useSpeech } from './useSpeech'

export interface ComposerProps {
  value: ComposerValue
  onChange: (next: ComposerValue) => void
  onSubmit: () => void
  onStop?: () => void
  status: 'idle' | 'streaming' | 'blocked'
  blockedReason?: string
  features?: { thinking?: boolean; search?: boolean; voice?: boolean }
  onPickFiles?: (files: File[]) => void
  onRemoveAttachment?: (id: string) => void
  onRetryAttachment?: (id: string) => void
  onOpenAttachment?: (attachment: Attachment) => void
  speech?: SpeechPort
  labels: ComposerLabels
  slots?: { leading?: ReactNode; trailing?: ReactNode }
}

/** 超过这个行数后输入框内部滚动 */
const MAX_ROWS = 8

/**
 * 完整输入区：附件条 + 文本框 + 深度思考 / 智能搜索 + 语音 + 发送 / 停止。
 * 纯受控：文本、开关、附件都来自 value，内部只有焦点、拖拽、录音、附件展开这类视图状态。
 */
export const Composer = ({
  value,
  onChange,
  onSubmit,
  onStop,
  status,
  blockedReason,
  features,
  onPickFiles,
  onRemoveAttachment,
  onRetryAttachment,
  onOpenAttachment,
  speech,
  labels,
  slots,
}: ComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 语音回调、点击处理都可能比本次渲染晚，读最新值要经过 ref
  const valueRef = useRef(value)
  valueRef.current = value
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const blocked = status === 'blocked'
  const streaming = status === 'streaming'
  const canSend = !blocked && value.text.trim().length > 0

  /** 转写结果插到选区处，插完把光标放到新文本之后 */
  const handleTranscript = useCallback((transcript: string) => {
    const current = valueRef.current
    const text = current.text
    const element = textareaRef.current
    const start = element?.selectionStart ?? text.length
    const end = element?.selectionEnd ?? text.length
    onChangeRef.current({
      ...current,
      text: text.slice(0, start) + transcript + text.slice(end),
    })
    requestAnimationFrame(() => {
      const target = textareaRef.current
      if (!target) {
        return
      }
      target.focus({ preventScroll: true })
      const caret = start + transcript.length
      target.setSelectionRange(caret, caret)
    })
  }, [])

  const voice = useSpeech(speech, handleTranscript)
  const drop = useFileDrop(onPickFiles)

  const setText = (next: string) => onChange({ ...value, text: next })
  const setFlag = (key: 'thinking' | 'search', next: boolean) =>
    onChange({ ...value, [key]: next })

  const voiceVisible = features?.voice !== false && speech !== undefined
  const thinkingVisible = features?.thinking !== false
  const searchVisible = features?.search !== false

  return (
    <div
      className={clsx(styles.root, blocked && styles.blocked)}
      style={{ '--max-rows': String(MAX_ROWS) } as CSSProperties}
      onDragEnter={drop.handlers.onDragEnter}
      onDragLeave={drop.handlers.onDragLeave}
      onDragOver={drop.handlers.onDragOver}
      onDrop={drop.handlers.onDrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          textareaRef.current?.focus({ preventScroll: true })
        }
      }}
    >
      {drop.dragging ? (
        <div className={styles.dropMask}>
          <span className={styles.dropText}>{labels.dropHere}</span>
        </div>
      ) : null}

      <AttachmentTray
        items={value.attachments}
        labels={labels}
        onRemove={onRemoveAttachment}
        onRetry={onRetryAttachment}
        onOpen={onOpenAttachment}
      />

      <TextArea
        value={value.text}
        onChange={setText}
        onSubmit={() => {
          if (canSend) {
            onSubmit()
          }
        }}
        placeholder={labels.placeholder}
        disabled={blocked}
        label={labels.placeholder}
        maxRows={MAX_ROWS}
        className={styles.input}
        textareaRef={textareaRef}
        onFiles={onPickFiles}
      />

      <div className={styles.toolbar}>
        {slots?.leading ? <div className={styles.slot}>{slots.leading}</div> : null}

        <div className={styles.toggles}>
          {thinkingVisible ? (
            <Toggle
              label={labels.thinking}
              checked={value.thinking}
              disabled={blocked}
              icon={<IconThink />}
              onChange={(next) => setFlag('thinking', next)}
            />
          ) : null}
          {searchVisible ? (
            <Toggle
              label={labels.search}
              checked={value.search}
              disabled={blocked}
              icon={<IconSearch />}
              onChange={(next) => setFlag('search', next)}
            />
          ) : null}
        </div>

        <div className={styles.actions}>
          {voiceVisible ? (
            <button
              type="button"
              className={clsx(styles.iconButton, voice.recording && styles.recording)}
              aria-label={voice.recording ? labels.voiceStop : labels.voice}
              title={voice.recording ? labels.voiceStop : labels.voice}
              aria-pressed={voice.recording}
              aria-disabled={blocked || undefined}
              onClick={() => {
                if (!blocked) {
                  voice.toggle()
                }
              }}
            >
              {voice.recording ? <span className={styles.dot} /> : null}
              <IconMic />
            </button>
          ) : null}

          {onPickFiles ? (
            <>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={labels.attach}
                title={labels.attach}
                aria-disabled={blocked || undefined}
                onClick={() => {
                  if (!blocked) {
                    fileInputRef.current?.click()
                  }
                }}
              >
                <IconPaperclip />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? [])
                  event.currentTarget.value = ''
                  if (files.length > 0) {
                    onPickFiles(files)
                  }
                }}
              />
            </>
          ) : null}

          {streaming ? (
            <button
              type="button"
              className={clsx(styles.send, styles.stop)}
              aria-label={labels.stop}
              title={labels.stop}
              onClick={() => onStop?.()}
            >
              <IconStop />
            </button>
          ) : (
            <button
              type="button"
              className={styles.send}
              aria-label={labels.send}
              title={labels.send}
              aria-disabled={!canSend || undefined}
              onClick={() => {
                if (canSend) {
                  onSubmit()
                }
              }}
            >
              <IconSend />
            </button>
          )}
        </div>

        {slots?.trailing ? <div className={styles.slot}>{slots.trailing}</div> : null}
      </div>

      {blocked ? (
        <div className={styles.blockedNote} role="status">
          {blockedReason ?? labels.blocked}
        </div>
      ) : null}
    </div>
  )
}

/** 深度思考 / 智能搜索开关：role=switch，激活态用 ghost-active token */
const Toggle = ({
  label,
  checked,
  disabled,
  icon,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  icon: ReactNode
  onChange: (next: boolean) => void
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    className={clsx(styles.toggle, checked && styles.toggleOn)}
    disabled={disabled}
    onClick={() => onChange(!checked)}
  >
    <span className={styles.toggleIcon}>{icon}</span>
    <span className={styles.toggleLabel}>{label}</span>
  </button>
)
