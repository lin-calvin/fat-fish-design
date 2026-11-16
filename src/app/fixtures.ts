import type { Message, SessionSummary } from '../chat-protocol/types'

const now = Date.now()
const minute = 60_000
const hour = 3_600_000
const day = 86_400_000

export const seedSessions: readonly SessionSummary[] = [
  { id: 's1', title: '增量 markdown 的性能问题', updatedAt: now - 2 * minute },
  { id: 's2', title: 'React 18 并发渲染与 transition', updatedAt: now - 40 * minute },
  { id: 's3', title: '把 SSE 事件合并成 props 更新', updatedAt: now - 3 * hour },
  { id: 's4', title: '为什么 composer 要单独命名', updatedAt: now - day - 2 * hour },
  { id: 's5', title: 'DeepSeek Harness 的 UI 分层', updatedAt: now - 3 * day },
]

const longAnswer = `先说结论：**流式回答的压力不在列表，而在那条正在变长的消息**。

## 三个可观测的成本

1. 解析：每来一个 token 都重解析整篇，工作量是回答长度的二次方；
2. 提交：每次提交都会触发 React reconcile 与 DOM 文本更新；
3. 分配：每棵 AST 都是新对象，长回答下 GC 峰值跟着长度走。

\`\`\`ts
// 冻结前缀，只重解析尾部
const keep = Math.max(0, blocks.length - 1)
const frozen = blocks.slice(0, keep)
\`\`\`

> 合并改变的是频率，冻结改变的是单次成本，两者是乘的关系。

| 方案 | 单次成本 | 更新节奏 |
| --- | --- | --- |
| 全量解析 | O(全文) | 按帧 |
| 增量解析 | O(尾部) | 按帧 |
| 增量 + 合并 | O(尾部) | 20–30Hz |

所以答案不是"要不要 addToken"，而是"缓存是不是派生数据"。`

export const seedThreads: Record<string, readonly Message[]> = {
  s1: [
    {
      id: 'm1',
      role: 'user',
      attempt: 1,
      status: 'settled',
      createdAt: now - 8 * minute,
      blocks: [{ kind: 'text', text: '流式输出长回答时，前端应该怎么做渲染优化？' }],
    },
    {
      id: 'm2',
      role: 'assistant',
      attempt: 1,
      status: 'settled',
      createdAt: now - 7 * minute,
      blocks: [
        {
          kind: 'thinking',
          text: '先要区分两类成本：解析成本和提交成本。前者跟回答长度有关，后者跟更新频率有关。再看是否可以把两者解耦……',
          durationMs: 12_000,
        },
        {
          kind: 'text',
          text: longAnswer,
          citations: [
            { index: 1, title: 'DeepSeek 全家桶应用 API', url: 'https://api-docs.deepseek.com/guides/build_a_chatbot', site: 'api-docs.deepseek.com' },
            { index: 2, title: 'chat-demo', url: 'https://github.com/deepseek-ai/chat-demo', site: 'github.com' },
          ],
        },
      ],
    },
    {
      id: 'm3',
      role: 'user',
      attempt: 1,
      status: 'settled',
      createdAt: now - 5 * minute,
      blocks: [{ kind: 'text', text: '那缓存算不算第二真相？' }],
    },
    {
      id: 'm4',
      role: 'assistant',
      attempt: 1,
      status: 'settled',
      createdAt: now - 4 * minute,
      blocks: [
        {
          kind: 'text',
          text: '不算。缓存是 `text` 的**纯函数派生结果**：命中就用，失效就重算，结果与全量解析逐字节一致。真危险的只有"追加动作本身成为权威数据"，那样卸载、重放、时间旅行都会失效。',
        },
      ],
    },
  ],
  s2: [
    {
      id: 'm5',
      role: 'user',
      attempt: 1,
      status: 'settled',
      createdAt: now - 50 * minute,
      blocks: [{ kind: 'text', text: 'startTransition 在流式更新里应该怎么用？' }],
    },
    {
      id: 'm6',
      role: 'assistant',
      attempt: 1,
      status: 'settled',
      createdAt: now - 45 * minute,
      blocks: [
        {
          kind: 'text',
          text: '把每个 token 的 `setState` 包进 `startTransition`，输入框与滚动的更新就永远抢占它。再配合组件内部的 rAF 合并，频率和优先级两件事就都收敛了。',
        },
      ],
    },
  ],
  s3: [],
  s4: [],
  s5: [],
}

/** 一次“假服务端”生成：返回按 token 切好的文本 */
export function planAnswer(): string[] {
  const text = `这是一段用来演示流式渲染的回答。它会一段一段地出现，而界面上只有最后一个块在变。

## 它会经历什么

- 每 8ms 到达一个 token；
- 调用方把它们合并成每帧最多一次状态更新；
- 渲染器冻结除尾块以外的 AST，只重新解析尾部。

\`\`\`ts
for await (const event of transport.send(request)) {
  if (event.type === 'text-delta') feed.push(event.text)
}
\`\`\`

最后一句用来确认结算：全量重解析之后，引用与脚注都能正确解析。`

  const tokens: string[] = []
  for (let index = 0; index < text.length; index += 3) {
    tokens.push(text.slice(index, index + 3))
  }
  return tokens
}
