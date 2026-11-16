import clsx from 'clsx'
import { useCallback, useLayoutEffect, useRef, type MutableRefObject } from 'react'
import styles from './TextArea.module.css'

/**
 * 浏览器是否原生支持 `field-sizing: content`。
 * 支持时高度完全由 CSS 控制，JS 兜底不参与，避免两套机制互相覆盖。
 */
const NATIVE_FIELD_SIZING = (() => {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
    return false
  }
  try {
    return CSS.supports('field-sizing', 'content')
  } catch {
    return false
  }
})()

export interface TextAreaProps {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  /** 无障碍名称 */
  label: string
  /** 超过这个行数后内部滚动 */
  maxRows: number
  className?: string
  /** 外部需要读写光标位置时传入（语音转写插入用） */
  textareaRef?: MutableRefObject<HTMLTextAreaElement | null>
  /** 粘贴文件时接管，未提供则走默认文本粘贴 */
  onFiles?: (files: File[]) => void
}

/**
 * 内部共用的文本框：受控、自增高、IME 安全的 Enter 提交、文件粘贴接管。
 * PromptInput 与 Composer 都渲染它，保证两处输入行为完全一致。
 */
export const TextArea = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  autoFocus = false,
  label,
  maxRows,
  className,
  textareaRef,
  onFiles,
}: TextAreaProps) => {
  const localRef = useRef<HTMLTextAreaElement | null>(null)

  /** 同时喂给内部引用和外部引用 */
  const assignRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      localRef.current = node
      if (textareaRef) {
        textareaRef.current = node
      }
    },
    [textareaRef]
  )

  /** 仅在不支持 field-sizing 时执行：先归零高度量出 scrollHeight，再夹到最大行数 */
  const resize = useCallback(() => {
    const element = localRef.current
    if (!element || NATIVE_FIELD_SIZING) {
      return
    }
    element.style.height = 'auto'
    const computed = getComputedStyle(element)
    const lineHeight = parseFloat(computed.lineHeight) || 24
    const padding =
      (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0)
    const border =
      (parseFloat(computed.borderTopWidth) || 0) + (parseFloat(computed.borderBottomWidth) || 0)
    const maxHeight = lineHeight * maxRows + padding + border
    const contentHeight = element.scrollHeight + border
    element.style.height = `${Math.min(contentHeight, maxHeight)}px`
    element.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden'
  }, [maxRows])

  // 首次挂载、外部改值（如语音插入、回填草稿）和 maxRows 变化都要重新量一次
  useLayoutEffect(() => {
    resize()
  }, [resize, value])

  return (
    <textarea
      ref={assignRef}
      className={clsx(styles.textarea, className)}
      rows={1}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-label={label}
      onChange={(event) => {
        onChange(event.currentTarget.value)
        // DOM 值此时已是新值，可以立刻量高度
        resize()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.shiftKey) {
          return
        }
        // 先阻止默认的换行，再判断是否处于输入法组词中：
        // 组词中的 Enter 属于确认候选词，不能当成发送。
        event.preventDefault()
        if (event.nativeEvent.isComposing || event.keyCode === 229) {
          return
        }
        onSubmit()
      }}
      onPaste={(event) => {
        const files = Array.from(event.clipboardData.files)
        if (files.length > 0 && onFiles) {
          event.preventDefault()
          onFiles(files)
        }
      }}
    />
  )
}
