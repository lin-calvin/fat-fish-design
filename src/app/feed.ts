/**
 * 调用方唯一需要的“合并器”：把高频 token 合并成最多 maxHz 次 setState。
 * 它不持有真相——攒好的文本交回 onFlush，由调用方写自己的 state。
 */
export interface TokenFeed {
  push(delta: string): void
  flush(): void
  dispose(): void
}

export function createTokenFeed(options: {
  /** 0 = 不合并（每个 delta 直接交回） */
  maxHz?: number
  onFlush: (accumulated: string) => void
}): TokenFeed {
  const maxHz = options.maxHz ?? 30
  let buffer = ''
  let frame = 0
  let lastPaint = 0

  const flushNow = () => {
    if (buffer === '') return
    const text = buffer
    buffer = ''
    lastPaint = performance.now()
    options.onFlush(text)
  }

  const loop = (now: number) => {
    frame = 0
    const interval = maxHz > 0 ? 1000 / maxHz : 0
    if (now - lastPaint < interval) {
      schedule()
      return
    }
    flushNow()
    if (buffer !== '') schedule()
  }

  const schedule = () => {
    if (frame !== 0 || buffer === '') return
    frame = requestAnimationFrame(loop)
  }

  return {
    push(delta) {
      buffer += delta
      if (maxHz <= 0) flushNow()
      else schedule()
    },
    flush() {
      flushNow()
    },
    dispose() {
      if (frame !== 0) cancelAnimationFrame(frame)
      frame = 0
      buffer = ''
    },
  }
}
