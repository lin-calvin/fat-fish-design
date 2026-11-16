import type { RootContent } from 'mdast'
import { parseMarkdown } from './parse'

export interface PositionedBlock {
  readonly node: RootContent
  /** 绝对源码偏移，跨帧稳定，用作 React key */
  readonly key: number
}

export interface IncrementalResult {
  frozen: readonly PositionedBlock[]
  tail: readonly PositionedBlock[]
  /** 本次真正交给 parser 的字符数（0 表示命中开放围栏快路径） */
  parsedChars: number
  openFence: boolean
}

/**
 * 保留为“可能变化”的尾块数量。
 * 追加文本最多重塑**最后一个**块，所以 1 就够；官方与 harness 取 2 作安全余量，
 * 但块大小差异极大时（一个 1200 行围栏 + 一张表），多留一块会让每次更新重解析整段围栏。
 */
let UNSTABLE_TAIL_BLOCKS = 1

export function setUnstableTailBlocks(count: number): void {
  UNSTABLE_TAIL_BLOCKS = Math.max(1, count)
  caches.clear()
}
const MAX_CACHES = 40

interface OpenFence {
  startOffset: number
  lang: string | null
  meta: string | null
  value: string
  textLength: number
  /** 已消费内容的末尾片段，用于跨分块识别闭合围栏（``` 可能被切在两次到达之间） */
  tailProbe: string
}

interface Cache {
  frozen: PositionedBlock[]
  /** 开围栏之前的尾部块（围栏期间仍需渲染它们） */
  tailBefore: PositionedBlock[]
  offset: number
  textLength: number
  openFence: OpenFence | null
}

const caches = new Map<string, Cache>()

export function resetCaches(): void {
  caches.clear()
}

/** 无缓存路径：每次整篇解析（基准对照组） */
export function parseFull(text: string): PositionedBlock[] {
  const root = parseMarkdown(text)
  return root.children.map(node => ({ node, key: node.position?.start.offset ?? 0 }))
}

function cacheFor(key: string): Cache {
  let cache = caches.get(key)
  if (cache) return cache
  if (caches.size >= MAX_CACHES) {
    const oldest = caches.keys().next().value
    if (oldest !== undefined) caches.delete(oldest)
  }
  cache = { frozen: [], tailBefore: [], offset: 0, textLength: 0, openFence: null }
  caches.set(key, cache)
  return cache
}

const FENCE_LINE = /^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*$/

function hasClosingFence(chunk: string): boolean {
  return chunk.split('\n').some(line => FENCE_LINE.test(line))
}

const FENCE_OPEN = /^[ \t]{0,3}(?:`{3,}|~{3,})/

/** 尾块是否是一个尚未闭合的代码围栏（开围栏无法冻结，需要单独走快路径） */
function isOpenFence(text: string, startOffset: number): boolean {
  const source = text.slice(startOffset)
  const lines = source.split('\n')
  if (!FENCE_OPEN.test(lines[0] ?? '')) return false
  if (lines.length < 2) return true
  return !lines.slice(1).some(line => FENCE_LINE.test(line))
}

function fenceNode(fence: OpenFence): RootContent {
  return { type: 'code', lang: fence.lang, meta: fence.meta, value: fence.value } as RootContent
}

/**
 * 增量解析：同 key 下文本只允许追加。
 * 返回“冻结块 + 尾部块”，冻结块的对象引用跨次稳定，React 直接 memo 命中。
 */
export function updateIncremental(cacheKey: string, text: string, streaming: boolean): IncrementalResult {
  const cache = cacheFor(cacheKey)

  // 非追加（重新生成 / 编辑重发）→ 整体丢弃缓存
  if (text.length < cache.textLength) {
    cache.frozen = []
    cache.offset = 0
    cache.openFence = null
  }

  // 结算：整篇重解析一次（引用式链接、脚注是文档级解析，前缀冻结会算错），
  // 同时清空缓存，下一次流式从零开始。
  if (!streaming) {
    const root = parseMarkdown(text)
    const blocks = root.children.map(node => ({ node, key: node.position?.start.offset ?? 0 }))
    cache.frozen = []
    cache.offset = 0
    cache.openFence = null
    cache.textLength = text.length
    return { frozen: [], tail: blocks, parsedChars: text.length, openFence: false }
  }

  // 快路径：仍处在未闭合围栏里，且新追加内容没有闭合它 → 一次解析都不做
  if (cache.openFence !== null) {
    const appended = text.slice(cache.openFence.textLength)
    const probe = cache.openFence.tailProbe + appended
    if (!hasClosingFence(probe)) {
      const value = cache.openFence.value + appended
      cache.openFence = {
        ...cache.openFence,
        value,
        textLength: text.length,
        tailProbe: probe.slice(-64),
      }
      cache.textLength = text.length
      return {
        frozen: cache.frozen,
        tail: [...cache.tailBefore, { node: fenceNode(cache.openFence), key: cache.openFence.startOffset }],
        parsedChars: 0,
        openFence: true,
      }
    }
    cache.openFence = null
  }

  const base = cache.offset
  const slice = text.slice(base)
  const root = parseMarkdown(slice)
  const children = root.children

  const keep = Math.max(0, children.length - UNSTABLE_TAIL_BLOCKS)
  const newlyFrozen: PositionedBlock[] = children.slice(0, keep).map(node => ({
    node,
    key: base + (node.position?.start.offset ?? 0),
  }))

  if (newlyFrozen.length > 0) {
    const last = newlyFrozen[newlyFrozen.length - 1]!.node
    cache.offset = base + (last.position?.end.offset ?? slice.length)
    cache.frozen = [...cache.frozen, ...newlyFrozen]
  }

  const tail: PositionedBlock[] = children.slice(keep).map(node => ({
    node,
    key: base + (node.position?.start.offset ?? 0),
  }))

  // 开围栏检测：最后一块是未闭合代码围栏时，记录它，下一帧起走零解析快路径
  const last = tail[tail.length - 1]
  const startOffset = last?.key
  if (last && startOffset !== undefined && last.node.type === 'code' && isOpenFence(text, startOffset)) {
    cache.openFence = {
      startOffset,
      lang: last.node.lang ?? null,
      meta: last.node.meta ?? null,
      value: last.node.value,
      textLength: text.length,
      tailProbe: last.node.value.slice(-64),
    }
  }

  cache.textLength = text.length
  return { frozen: cache.frozen, tail, parsedChars: slice.length, openFence: cache.openFence !== null }
}
