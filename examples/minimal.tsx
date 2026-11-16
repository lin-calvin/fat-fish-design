/**
 * 最小可用示例：只渲染一条对话，不做任何状态管理与网络请求。
 * 这个文件在 tsconfig 的 include 里，`npx tsc --noEmit` 会校验它。
 */
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
      {/* MessageList 自己会滚动，父级必须给它一个受限高度（flex:1 + min-height:0） */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <MessageList
          messages={messages}
          labels={zh.message}
          markdownLabels={zh.markdown}
        />
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
