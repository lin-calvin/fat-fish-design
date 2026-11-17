# 示例

两个可运行文件都在 `examples/`，并且被 `tsconfig.json` 的 `include` 收录——`npx tsc --noEmit` 会一起校验，文档里的代码不会过时。

---

## 1. 最小示例（50 行）

只渲染一条对话，不做状态管理、不发请求。

```tsx
import { useState } from 'react'
import { Composer, MessageList } from '../src/chat'
import { zh } from '../src/chat-protocol/labels.zh'
import { emptyComposerValue, type ComposerValue, type Message } from '../src/chat-protocol/types'

const messages: Message[] = [
  {
    id: 'u1',
    role: 'user',
    attempt: 1,
    status: 'settled',
    blocks: [{ kind: 'text', text: '流式输出长回答时，前端应该怎么做渲染优化？' }],
  },
  {
    id: 'a1',
    role: 'assistant',
    attempt: 1,
    status: 'settled',
    blocks: [
      { kind: 'thinking', text: '先区分解析成本和提交成本。', durationMs: 3000 },
      {
        kind: 'text',
        text: '把**解析**限制在尾部，把**提交**合并到帧级，两者互不替代。',
        citations: [{ index: 1, title: 'chat-demo', url: 'https://github.com/deepseek-ai/chat-demo' }],
      },
    ],
  },
]

export function MinimalChat() {
  const [draft, setDraft] = useState<ComposerValue>(emptyComposerValue)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* MessageList 自己会滚动，父级必须给它受限高度 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <MessageList messages={messages} labels={zh.message} markdownLabels={zh.markdown} />
      </div>
      <div style={{ padding: 16 }}>
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={() => setDraft(emptyComposerValue)}
          status="idle"
          labels={zh.composer}
        />
      </div>
    </div>
  )
}
```

要点只有两条：

1. `MessageList` 需要父级给 `flex: 1; min-height: 0`（或固定高度），否则它不会内部滚动。
2. 文案与数据都从外面进来，组件本身不需要 Provider。

---

## 2. 完整示例

`examples/full.tsx` 包含：会话侧栏、消息流、输入区、轻提示、假服务端、rAF 合并器。核心就是下面这段（其余都是状态管理样板）：

```tsx
const send = async () => {
  const text = draft.text.trim()
  if (status !== 'idle' || text === '') return

  const assistantId = `a-${Date.now()}`
  setThreads(current => ({
    ...current,
    [activeId]: [
      ...(current[activeId] ?? []),
      { id: `u-${Date.now()}`, role: 'user', attempt: 1, status: 'settled', blocks: [{ kind: 'text', text }] },
      { id: assistantId, role: 'assistant', attempt: 1, status: 'streaming', blocks: [{ kind: 'text', text: '' }] },
    ],
  }))
  setDrafts(current => ({ ...current, [activeId]: emptyComposerValue }))
  setStatus('streaming')
  setFollow(value => value + 1)          // 用户上滚过也回到底部

  // ↓ 这就是“薄转换器”的全部内容：高频 token 合并成每帧最多一次 setState
  let buffer = ''
  let frame = 0
  const flush = () => {
    frame = 0
    if (buffer === '') return
    const delta = buffer
    buffer = ''
    patch(assistantId, message => ({ ...message, blocks: appendText(message.blocks, delta) }))
  }
  const push = (token: string) => {
    buffer += token
    if (frame === 0) frame = requestAnimationFrame(flush)
  }

  for await (const event of transport.send({ text })) {
    if (stopped.current) break
    if (event.type === 'text-delta') push(event.text)
  }
  if (frame !== 0) cancelAnimationFrame(frame)
  flush()

  patch(assistantId, message => ({ ...message, status: stopped.current ? 'stopped' : 'settled' }))
  setStatus('idle')
}
```

---

## 3. 接真后端要改的三处

组件一行都不用改。只需要替换下面三块。

### 3.1 transport：把 SSE 变成 token

已在 `src/app/transport.ts` 实现，直接用：

```ts
import { createTransport } from './transport'

const transport = createTransport({ apiKey, model: 'deepseek-flash' })
for await (const event of transport.send({ text, thinking, search, history })) {
  // text-delta / thinking-delta / search-results / title / usage / done / error
}
```

它负责：`POST /anthropic/v1/messages`、SSE 分包解析（`\r\n`、多行 `data:`、`:keep-alive`）、事件翻译、HTTP 错误分类（429/5xx 标 `retryable`）、`abort()`。

事件映射：

| API 事件 | 产出 |
|---|---|
| `content_block_start` (text / thinking) | 首块文本或思考增量 |
| `content_block_delta` `text_delta` / `thinking_delta` | `text-delta` / `thinking-delta` |
| `content_block_start` `web_search_tool_result` | `search-results`（url + title，缺 title 用 url） |
| `message_delta.delta.title` | `title` |
| `message_delta.usage` | `usage` |
| `message_delta.delta.stop_reason === 'refusal'` | `error` |
| `message_stop` | 结束 |
| HTTP 非 2xx | `error` + `retryable` |

`parseSse` 也导出了，可以单独测试（用 `ReadableStream` 喂不规则分块即可）。

### 3.2 状态机：把三个动作写对

| 动作 | 关键点 |
| --- | --- |
| 发送 | 先插入用户消息与占位助手消息（`status: 'streaming'`），再开流 |
| 停止 | 置 `stopped` 标志 + `abort()`；已产出内容要落盘为 `status: 'stopped'`，不要丢 |
| 重新生成 | 复制原提问、`attempt + 1`、把该消息的 `blocks` 清空重开流（`attempt` 变了 markdown 缓存才会失效） |

分支切换（`onSwitchBranch`）在真实数据里是「父子链 + 兄弟列表」：把兄弟消息按 `createdAt` 排序后算出 `current/total` 传给 `MessageItem.branch` 即可。

### 3.3 持久化：会话与附件

- 会话 / 消息 / 附件原件：IndexedDB（`sessions`、`messages`、`attachments` 三张表，附件存 Blob）；
- 设置与 API Key：localStorage；
- 图片预览的 `URL.createObjectURL` 必须在卸载或替换时 `revokeObjectURL`；
- 历史导入导出：ZIP（`fflate`），附件按 id 复用，导出时只带本地仍存在的原件。

---

## 4. 验证

```bash
npx tsc --noEmit                                   # 含 examples/ 两个文件
npx vite build                                     # 应用产物
npx vite --port 5499                               # 集成示例（?poc 是 markdown 基准页）
```

## 5. 相关示例

- `examples/minimal.tsx`：静态渲染
- `examples/full.tsx`：侧栏 + 消息流 + 输入区 + 提示 + 假服务端
- `examples/agent-seats.tsx`：输入区座位（模型 / 权限 / 计划 / 活动指示）
