/**
 * 真实的 Messages API 适配器：SSE → ChatEvent。
 *
 * 这一层是调用方代码，不属于组件库。换模型 / 换网关只改这个文件，
 * 组件与状态管理都不需要动。
 */
import type { Citation } from '../chat-protocol/types'

export type ChatEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'thinking-delta'; text: string }
  | { type: 'search-results'; sources: readonly Citation[] }
  | { type: 'title'; title: string }
  | { type: 'usage'; input: number; output: number }
  | { type: 'done'; stopReason?: string }
  | { type: 'error'; message: string; retryable?: boolean }

export interface TransportMessage {
  readonly role: 'user' | 'assistant'
  readonly text: string
}

export interface TransportRequest {
  readonly text: string
  readonly thinking: boolean
  readonly search: boolean
  /** 之前的轮次（不含本轮提问） */
  readonly history?: readonly TransportMessage[]
}

export interface ChatTransport {
  send(request: TransportRequest): AsyncGenerator<ChatEvent>
  abort(): void
}

export interface TransportOptions {
  readonly apiKey: string
  /** 默认 https://api.deepseek.com */
  readonly origin?: string
  /** 默认 deepseek-flash */
  readonly model?: string
  readonly system?: string
}

const DEFAULT_ORIGIN = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-flash'
const DEFAULT_SYSTEM = '你是一个乐于助人的助手。回答使用简体中文。'

/** 只取消费所需的字段，其余原样保留 */
type SseEvent = { event?: string; data: string }

interface AnthropicDelta {
  type?: string
  text?: string
  thinking?: string
  stop_reason?: string
  title?: string
}

interface AnthropicEvent {
  type?: string
  index?: number
  message?: { usage?: { input_tokens?: number; output_tokens?: number } }
  content_block?: {
    type?: string
    text?: string
    content?: readonly { type?: string; url?: string; title?: string; page_age?: string }[]
  }
  delta?: AnthropicDelta
  usage?: { input_tokens?: number; output_tokens?: number }
  error?: { type?: string; message?: string }
}

function sourcesOf(block: AnthropicEvent['content_block']): Citation[] {
  const items = block?.content ?? []
  const sources: Citation[] = []
  for (const item of items) {
    if (item.type !== 'web_search_result' || typeof item.url !== 'string') continue
    sources.push({
      index: sources.length + 1,
      title: typeof item.title === 'string' && item.title !== '' ? item.title : item.url,
      url: item.url,
    })
  }
  return sources
}

export function createTransport(options: TransportOptions): ChatTransport {
  const origin = options.origin ?? DEFAULT_ORIGIN
  let controller: AbortController | null = null

  return {
    abort() {
      controller?.abort()
    },

    async *send(request) {
      controller = new AbortController()
      const signal = controller.signal

      const messages = [
        ...(request.history ?? []).map(message => ({ role: message.role, content: message.text })),
        { role: 'user', content: request.text },
      ]

      const response = await fetch(`${origin}/anthropic/v1/messages`, {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model ?? DEFAULT_MODEL,
          system: options.system ?? DEFAULT_SYSTEM,
          max_tokens: 4096,
          messages,
          thinking: { type: request.thinking ? 'enabled' : 'disabled' },
          tools: request.search ? [{ type: 'deepseek_web_search', name: 'deepseek_web_search' }] : [],
          safety_check: { level: 'high' },
          title: { enabled: true },
        }),
      })

      if (!response.ok || response.body === null) {
        const detail = await response.text().catch(() => '')
        yield {
          type: 'error',
          message: `HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
          retryable: response.status === 429 || response.status >= 500,
        }
        return
      }

      for await (const sse of parseSse(response.body)) {
        if (signal.aborted) return
        const payload = safeJson(sse.data)
        if (payload === null) continue
        const event = payload as AnthropicEvent

        switch (event.type) {
          case 'message_start': {
            const usage = event.message?.usage
            if (usage?.input_tokens !== undefined) {
              yield { type: 'usage', input: usage.input_tokens, output: usage.output_tokens ?? 0 }
            }
            break
          }
          case 'content_block_start': {
            const block = event.content_block
            if (block?.type === 'text' && block.text) yield { type: 'text-delta', text: block.text }
            if (block?.type === 'thinking' && block.text) yield { type: 'thinking-delta', text: block.text }
            if (block?.type === 'web_search_tool_result') {
              const sources = sourcesOf(block)
              if (sources.length > 0) yield { type: 'search-results', sources }
            }
            break
          }
          case 'content_block_delta': {
            const delta = event.delta
            if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
              yield { type: 'text-delta', text: delta.text }
            } else if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
              yield { type: 'thinking-delta', text: delta.thinking }
            }
            break
          }
          case 'message_delta': {
            if (event.delta?.title) yield { type: 'title', title: event.delta.title }
            if (event.usage?.output_tokens !== undefined) {
              yield { type: 'usage', input: event.usage.input_tokens ?? 0, output: event.usage.output_tokens }
            }
            if (event.delta?.stop_reason === 'refusal') {
              yield { type: 'error', message: '模型拒绝了这次请求' }
            }
            yield { type: 'done', ...(event.delta?.stop_reason ? { stopReason: event.delta.stop_reason } : {}) }
            break
          }
          case 'message_stop':
            return
          case 'error':
            yield { type: 'error', message: event.error?.message ?? '流式响应出错' , retryable: true }
            return
          default:
            break
        }
      }
    },
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * 最小 SSE 解析：按空行切事件，拼接多行 data:。
 * 兼容 \r\n，跳过注释行（:keep-alive）。
 */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      let index = buffer.indexOf('\n\n')
      while (index !== -1) {
        const chunk = buffer.slice(0, index)
        buffer = buffer.slice(index + 2)
        const event = readChunk(chunk)
        if (event !== null) yield event
        index = buffer.indexOf('\n\n')
      }
    }
    const tail = readChunk(buffer)
    if (tail !== null) yield tail
  } finally {
    reader.releaseLock()
  }
}

function readChunk(chunk: string): SseEvent | null {
  let event: string | undefined
  const data: string[] = []
  for (const line of chunk.split('\n')) {
    if (line === '' || line.startsWith(':')) continue
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).trim())
  }
  if (data.length === 0) return null
  const joined = data.join('\n')
  if (joined === '[DONE]') return null
  return event === undefined ? { data: joined } : { event, data: joined }
}
