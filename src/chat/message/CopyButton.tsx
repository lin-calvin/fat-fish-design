import { useEffect, useRef, useState } from 'react'
import { IconButton } from './Controls'
import { CheckIcon, CopyIcon } from './icons'

/**
 * 复制按钮只负责“点了就回调 + 1 秒反馈”，真正的写剪贴板由调用方实现，
 * 组件不直接碰 navigator.clipboard。
 */
export function CopyButton({
  text,
  label,
  copiedLabel,
  onCopy,
}: {
  text: string
  label: string
  copiedLabel: string
  onCopy?: (text: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      clearTimeout(timer.current)
    },
    [],
  )

  return (
    <IconButton
      label={copied ? copiedLabel : label}
      icon={copied ? <CheckIcon /> : <CopyIcon />}
      onClick={() => {
        if (copied) return
        onCopy?.(text)
        setCopied(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1200)
      }}
    />
  )
}
