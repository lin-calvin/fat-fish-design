import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { mathFromMarkdown } from 'mdast-util-math'
import { gfm } from 'micromark-extension-gfm'
import { math } from 'micromark-extension-math'
import type { Root } from 'mdast'

/** 计数器：PoC 里只用来观察，不参与渲染逻辑 */
export const parseStats = {
  calls: 0,
  chars: 0,
  ms: 0,
  maxMs: 0,
  /** 每 TRACE_BUCKET 个 token 一格，用于看“每次解析字符数”随长度的曲线 */
  trace: [] as number[],
}

const TRACE_BUCKET = 100
let traceSlot = 0

export function setTraceSlot(tokenIndex: number): void {
  traceSlot = Math.floor(tokenIndex / TRACE_BUCKET)
}

export function resetParseStats(): void {
  parseStats.calls = 0
  parseStats.chars = 0
  parseStats.ms = 0
  parseStats.maxMs = 0
  parseStats.trace = []
  traceSlot = 0
}

const OPTIONS = {
  extensions: [gfm(), math({ singleDollarTextMath: true })],
  mdastExtensions: [gfmFromMarkdown(), mathFromMarkdown()],
} as never

export function parseMarkdown(source: string): Root {
  const started = performance.now()
  const root = fromMarkdown(source, OPTIONS)
  const elapsed = performance.now() - started
  parseStats.calls += 1
  parseStats.chars += source.length
  parseStats.ms += elapsed
  if (elapsed > parseStats.maxMs) parseStats.maxMs = elapsed
  parseStats.trace[traceSlot] = (parseStats.trace[traceSlot] ?? 0) + source.length
  return root
}
