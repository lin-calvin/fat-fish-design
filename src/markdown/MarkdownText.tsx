import { memo, useMemo } from 'react'
import type { MarkdownLabels } from '../chat-protocol/labels'
import { parseFull, updateIncremental } from './incremental'
import { MarkdownBlock } from './render'
import { usePaintLag } from './usePaintLag'

export interface MarkdownTextProps {
  text: string
  streaming?: boolean
  /** 稳定标识（message.id + attempt）。缺省 = 不缓存，每次全量解析 */
  cacheKey?: string
  /** 内部合并的绘制上限；0 = 不合并（用于基准测试/截图） */
  maxHz?: number
  /** 代码块的复制按钮文案；缺省时不渲染复制按钮 */
  labels?: MarkdownLabels
  /** 自定义复制实现（默认 navigator.clipboard） */
  onCopy?: (code: string) => void
  className?: string
}

const MarkdownBody = memo(function MarkdownBody({
  text,
  streaming,
  cacheKey,
  labels,
  onCopy,
}: {
  text: string
  streaming: boolean
  cacheKey: string | null
  labels?: MarkdownLabels | undefined
  onCopy?: ((code: string) => void) | undefined
}) {
  const { frozen, tail } = useMemo(() => {
    if (cacheKey === null) return { frozen: [], tail: parseFull(text) }
    return updateIncremental(cacheKey, text, streaming)
  }, [cacheKey, text, streaming])

  return (
    <div className="ds-markdown">
      {/* 冻结块不会再变，可以直接着色；尾块在流式期间保持纯文本 */}
      {frozen.map(block => (
        <MarkdownBlock key={block.key} node={block.node} highlight labels={labels} onCopy={onCopy} />
      ))}
      {tail.map(block => (
        <MarkdownBlock key={block.key} node={block.node} highlight={!streaming} labels={labels} onCopy={onCopy} />
      ))}
      {streaming ? <span className="caret" /> : null}
    </div>
  )
})

/**
 * 对外只有一个 text prop。
 * 外层按 maxHz 合并绘制，内层做块级增量解析，调用方不需要知道这两件事。
 */
export function MarkdownText({
  text,
  streaming = false,
  cacheKey,
  maxHz = 30,
  labels,
  onCopy,
  className,
}: MarkdownTextProps) {
  const visible = usePaintLag(text, streaming, maxHz)
  return (
    <div className={className}>
      <MarkdownBody
        text={visible}
        streaming={streaming}
        cacheKey={cacheKey ?? null}
        labels={labels}
        onCopy={onCopy}
      />
    </div>
  )
}
