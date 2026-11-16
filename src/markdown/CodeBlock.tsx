import { useCallback, useEffect, useRef, useState } from 'react'
import type { MarkdownLabels } from '../chat-protocol/labels'
import { highlightCode, languageLabel } from './highlight'
import styles from './code-block.module.css'

export interface CodeBlockProps {
  code: string
  lang?: string | null
  /**
   * 是否着色。流式中的尾块传 false：围栏还在增长，重新 tokenize 整段是 O(长度)，
   * 而这块每次追加都会变；定型后（冻结或结算）再一次着色即可。
   */
  highlight?: boolean
  /** 缺省时不渲染复制按钮（组件内不出现任何字面量） */
  labels?: MarkdownLabels
  onCopy?: (code: string) => void
}

/** 代码块：语言标签 + 复制按钮 + 可选的语法高亮 */
export function CodeBlock({ code, lang, highlight = true, labels, onCopy }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  const label = languageLabel(lang)

  useEffect(() => () => { if (timer.current !== 0) window.clearTimeout(timer.current) }, [])

  const copy = useCallback(async () => {
    try {
      if (onCopy) onCopy(code)
      else await navigator.clipboard.writeText(code)
    } catch {
      return
    }
    setCopied(true)
    if (timer.current !== 0) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1200)
  }, [code, onCopy])

  return (
    <div className={styles.block} data-lang={label ?? undefined}>
      <div className={styles.header}>
        <span className={styles.lang}>{label ?? ''}</span>
        {labels ? (
          <button
            type="button"
            className={styles.copy}
            aria-label={copied ? labels.copied : labels.copy}
            onClick={() => { void copy() }}
          >
            {copied ? labels.copied : labels.copy}
          </button>
        ) : null}
      </div>
      <pre className={styles.pre}>
        {highlight ? (
          // Prism 的输出已经对源码做过转义，这里只放它生成的 span
          <code className={styles.code} dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} />
        ) : (
          <code className={styles.code}>{code}</code>
        )}
      </pre>
    </div>
  )
}
