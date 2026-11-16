import { useCallback, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { MarkdownText } from '../markdown/MarkdownText'
import { parseFull, resetCaches, setUnstableTailBlocks, updateIncremental } from '../markdown/incremental'
import { parseStats, resetParseStats, setTraceSlot } from '../markdown/parse'
import { paintStats } from '../markdown/usePaintLag'
import { buildAnswer, tokenize, DEFAULT_SHAPE } from './fakeStream'

type Mode = 'baseline' | 'incremental'

interface ViewState {
  text: string
  streaming: boolean
  mode: Mode
}

export interface Summary {
  mode: Mode
  tokens: number
  chars: number
  wallMs: number
  parseCalls: number
  parsedChars: number
  avgCharsPerParse: number
  parseMsTotal: number
  parseMsMax: number
  updates: number
  paints: number
  trace: number[]
  settledOk: boolean
  settledChecks: string[]
  domLength: number
  domHash: number
}

const answer = buildAnswer(DEFAULT_SHAPE)
const tokens = tokenize(answer)

function settleChecks(): { ok: boolean; checks: string[] } {
  const dom = document.querySelector('.ds-markdown')?.textContent ?? ''
  const expected = ['第 23 段收尾', 'row-1199', 'item-119', '增量解析只重算尾巴']
  const checks = expected.map(item => `${dom.includes(item) ? 'ok' : 'MISSING'} ${item}`)
  return { ok: checks.every(line => line.startsWith('ok')), checks }
}

function domFingerprint(): { length: number; hash: number } {
  const text = document.querySelector('.ds-markdown')?.textContent ?? ''
  let hash = 0
  for (let index = 0; index < text.length; index += 7) hash = (hash * 31 + text.charCodeAt(index)) | 0
  return { length: text.length, hash }
}

function snapshot(mode: Mode, startedAt: number, tokenCount: number): Summary {
  const { ok, checks } = settleChecks()
  const dom = domFingerprint()
  return {
    mode,
    tokens: tokenCount,
    chars: answer.length,
    wallMs: Math.round(performance.now() - startedAt),
    parseCalls: parseStats.calls,
    parsedChars: parseStats.chars,
    avgCharsPerParse: parseStats.calls > 0 ? Math.round(parseStats.chars / parseStats.calls) : 0,
    parseMsTotal: Math.round(parseStats.ms * 10) / 10,
    parseMsMax: Math.round(parseStats.maxMs * 10) / 10,
    updates: paintStats.updates,
    paints: paintStats.paints,
    trace: Array.from({ length: parseStats.trace.length }, (_, index) => Math.round(parseStats.trace[index] ?? 0)),
    settledOk: ok,
    settledChecks: checks,
    domLength: dom.length,
    domHash: dom.hash,
  }
}

export function BenchPage() {
  const [view, setView] = useState<ViewState>({ text: '', streaming: false, mode: 'incremental' })
  const [summary, setSummary] = useState<Summary | null>(null)
  const [running, setRunning] = useState(false)
  const [bench, setBench] = useState(false)
  const busy = useRef(false)

  const propsFor = (mode: Mode) =>
    mode === 'incremental'
      ? { cacheKey: 'msg-1:1' }
      : { cacheKey: undefined as string | undefined }

  /** 基准：每个 token 强制渲染一次（flushSync），隔离“单次更新成本” */
  const runBench = useCallback(async (mode: Mode, limit = tokens.length) => {
    if (busy.current) return
    busy.current = true
    setRunning(true)
    setBench(true)
    resetCaches()
    resetParseStats()
    paintStats.updates = 0
    paintStats.paints = 0
    setSummary(null)
    setView({ text: '', streaming: true, mode })
    await new Promise(resolve => setTimeout(resolve, 30))

    const startedAt = performance.now()
    let acc = ''
    const total = Math.min(limit, tokens.length)
    for (let index = 0; index < total; index += 1) {
      acc += tokens[index]!
      setTraceSlot(index)
      flushSync(() => setView({ text: acc, streaming: true, mode }))
    }
    flushSync(() => setView({ text: acc, streaming: false, mode }))
    const result = snapshot(mode, startedAt, total)
    if (total < tokens.length) {
      result.settledOk = true
      result.settledChecks = ['（截断运行，跳过结算校验）']
    }
    setSummary(result)
    setRunning(false)
    setBench(false)
    busy.current = false
    return result
  }, [])

  /** 实时：模拟 100+ token/s 的 SSE，看“props 更新次数”与“实际绘制次数”的差 */
  const runLive = useCallback(async (mode: Mode, tps = 300, count = 3000) => {
    if (busy.current) return
    busy.current = true
    setRunning(true)
    setBench(false)
    resetCaches()
    resetParseStats()
    paintStats.updates = 0
    paintStats.paints = 0
    setSummary(null)
    setView({ text: '', streaming: true, mode })
    await new Promise(resolve => setTimeout(resolve, 30))

    const startedAt = performance.now()
    const interval = 1000 / tps
    let acc = ''
    for (let index = 0; index < Math.min(count, tokens.length); index += 1) {
      acc += tokens[index]!
      setTraceSlot(index)
      setView({ text: acc, streaming: true, mode })
      const due = startedAt + (index + 1) * interval
      const wait = due - performance.now()
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
    }
    setView({ text: acc, streaming: false, mode })
    await new Promise(resolve => setTimeout(resolve, 80))
    const result = snapshot(mode, startedAt, Math.min(count, tokens.length))
    if (count < tokens.length) {
      result.settledOk = true
      result.settledChecks = ['（截断运行，跳过结算校验）']
    }
    setSummary(result)
    setRunning(false)
    busy.current = false
    return result
  }, [])

  // 给 playwright 用
  ;(window as unknown as { __poc: unknown }).__poc = {
    setUnstableTailBlocks,
    runBench,
    runLive,
    answerLength: answer.length,
    tokenCount: tokens.length,
    /** 纯算法基准：不经过 React，直接按 token 调 updateIncremental */
    traceIncremental: (limit = tokens.length) => {
      resetCaches()
      const buckets: number[] = []
      const offsets: number[] = []
      let acc = ''
      let parsed = 0
      for (let index = 0; index < Math.min(limit, tokens.length); index += 1) {
        acc += tokens[index]!
        const result = updateIncremental('trace-key', acc, true)
        parsed += result.parsedChars
        const bucket = Math.floor(index / 100)
        buckets[bucket] = (buckets[bucket] ?? 0) + result.parsedChars
        if (index % 500 === 0) offsets.push(Math.round((result.frozen.length / Math.max(1, result.frozen.length + result.tail.length)) * 100))
      }
      const settled = updateIncremental('trace-key', acc, false)
      return { tokens: Math.min(limit, tokens.length), totalParsed: parsed, buckets, frozenPct: offsets, settleParsed: settled.parsedChars }
    },
    parseFullOnce: () => {
      resetParseStats()
      const started = performance.now()
      const blocks = parseFull(answer)
      return { blocks: blocks.length, ms: performance.now() - started, chars: parseStats.chars }
    },
  }

  return (
    <div className="page">
      <header>
        <strong>增量 markdown + 绘制合并 · PoC</strong>
        <span className="muted">
          合成回答 {answer.length.toLocaleString()} 字符 / {tokens.length.toLocaleString()} token
        </span>
      </header>

      <div className="controls">
        <button disabled={running} onClick={() => void runBench('baseline')}>基准 · 每 token 全量解析</button>
        <button disabled={running} onClick={() => void runBench('incremental')}>基准 · 每 token 增量解析</button>
        <button disabled={running} onClick={() => void runLive('baseline')}>实时 · 全量（无合并）</button>
        <button disabled={running} onClick={() => void runLive('incremental')}>实时 · 增量 + 30Hz 合并</button>
      </div>

      <section className="stats">
        {summary ? (
          <>
            <div className="grid">
              <span>模式</span><b>{summary.mode}</b>
              <span>解析次数</span><b>{summary.parseCalls.toLocaleString()}</b>
              <span>解析字符总量</span><b>{summary.parsedChars.toLocaleString()}</b>
              <span>平均每次解析字符</span><b className={summary.avgCharsPerParse > 3000 ? 'bad' : 'good'}>{summary.avgCharsPerParse.toLocaleString()}</b>
              <span>最长单次解析</span><b>{summary.parseMsMax} ms</b>
              <span>解析总耗时</span><b>{summary.parseMsTotal} ms</b>
              <span>props 更新</span><b>{summary.updates.toLocaleString()}</b>
              <span>实际绘制</span><b>{summary.paints === 0 ? '（基准不走合并）' : summary.paints.toLocaleString()}</b>
              <span>总耗时</span><b>{summary.wallMs.toLocaleString()} ms</b>
              <span>结算校验</span><b className={summary.settledOk ? 'good' : 'bad'}>{summary.settledChecks.join(' / ')}</b>
            </div>
            <div className="trace">
              {summary.trace.map((value, index) => (
                <i
                  key={index}
                  title={`每 100 token 解析 ${value} 字符`}
                  style={{ height: `${Math.min(100, (value / Math.max(...summary.trace, 1)) * 100)}%` }}
                />
              ))}
            </div>
            <div className="muted small">每根柱子 = 100 个 token 内解析的字符数</div>
          </>
        ) : (
          <div className="muted">选择上方任一测试。同一份文本，只改 renderer 的两个 prop。</div>
        )}
      </section>

      <main className="chat">
        <MarkdownText
          text={view.text}
          streaming={view.streaming}
          {...propsFor(view.mode)}
          maxHz={view.mode === 'incremental' && view.streaming && !bench ? 30 : 0}
        />
      </main>
    </div>
  )
}
