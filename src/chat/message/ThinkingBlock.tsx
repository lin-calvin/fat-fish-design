import clsx from 'clsx'
import { useId, useMemo, useState } from 'react'
import type { MarkdownLabels, MessageLabels } from '../../chat-protocol/labels'
import { MarkdownText } from '../../markdown/MarkdownText'
import { ChevronDownIcon, ThinkIcon } from './icons'
import markdownStyles from './markdown.module.css'
import styles from './ThinkingBlock.module.css'

export interface ThinkingBlockProps {
  text: string
  durationMs?: number
  running?: boolean
  labels: MessageLabels
  markdownLabels: MarkdownLabels
}

/** 首行预览：跳过开头空行，只取第一段非空文本。 */
function firstLine(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() !== '') return line.trim()
  }
  return ''
}

/**
 * 思考块。
 * 折叠态只渲染一行纯文本预览——不挂 MarkdownText，也不做任何解析；
 * 展开后才把整段交给 MarkdownText。
 * 默认跟随运行状态：思考中展开，结束后自动折起；用户手动开合后以其选择为准。
 */
export function ThinkingBlock({
  text,
  durationMs,
  running = false,
  labels,
  markdownLabels,
}: ThinkingBlockProps) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const open = manualOpen ?? running
  // 组件实例级的稳定 cacheKey：不跨消息复用，也不随重渲变化（StrictMode 安全）
  const cacheKey = useId()
  const preview = useMemo(() => firstLine(text), [text])

  const title = !running && durationMs !== undefined
    ? labels.thinkingFor(Math.max(0, Math.round(durationMs / 1000)))
    : labels.thinking

  return (
    <div className={clsx(styles.thinking, running ? styles.running : styles.done)}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-label={title}
        onClick={() => setManualOpen(!open)}
      >
        <span className={styles.icon} aria-hidden="true">
          <ThinkIcon />
        </span>
        <span className={styles.title}>{title}</span>
        <span className={clsx(styles.chevron, open && styles.chevronOpen)} aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>
      {open ? (
        <div className={clsx(markdownStyles.markdown, styles.body)}>
          <MarkdownText text={text} streaming={running} cacheKey={cacheKey} maxHz={30} labels={markdownLabels} />
        </div>
      ) : preview ? (
        <div className={styles.preview}>{preview}</div>
      ) : null}
    </div>
  )
}
