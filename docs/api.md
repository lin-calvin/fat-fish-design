# fat-fish-design · API 参考

一套无状态依赖的聊天 UI 组件库。组件只接收 props 与回调，不做请求、不写存储、不持有业务状态。

- 源码入口：`src/ui`（原子控件）、`src/chat`（聊天复合组件）、`src/markdown`
- 类型契约：`src/chat-protocol/types.ts`、`src/chat-protocol/labels.ts`
- 可运行示例：`examples/minimal.tsx`、`examples/full.tsx`（随 `tsc --noEmit` 一起校验）

---

## 0. 接入

```ts
// 设计 token（必需，一次即可；暗色靠 body 上的属性切换）
import './tokens/theme.css'
import './tokens/extra.css'
import './tokens/global.css'

// 组件
import { Composer, MessageList, Sider } from './chat'
import { Button, IconButton, Menu, Modal } from './ui/atoms'
import { ToastProvider, useToast } from './ui/toast'
import { EmptyState } from './ui/empty'
import { MarkdownText } from './markdown/MarkdownText'

// 文案
import { zh } from './chat-protocol/labels.zh'
```

暗色主题：

```ts
document.body.toggleAttribute('data-ds-dark-theme', dark)
```

---

## 1. 五条约定

| 约定 | 含义 |
| --- | --- |
| **props 是唯一真相** | 组件不订阅 store；所有会话/消息/草稿数据由调用方持有 |
| **文案外部注入** | 组件内没有任何中英文字面量，全部来自 `labels` prop |
| **副作用走端口** | 复制、打开附件、录音通过 `ChatUiPorts` / `SpeechPort` 注入 |
| **样式只认 token** | 组件 CSS 不写颜色字面量，只引用 `--dsw-*` / `--ds-*` |
| **增长型文本用派生缓存** | `MarkdownText` 的 `cacheKey` 相同且文本只追加时，单次更新成本与全文长度无关 |

---

## 2. 类型

### Message

```ts
interface Message {
  id: string
  role: 'user' | 'assistant'
  blocks: readonly Block[]
  status: 'settled' | 'streaming' | 'error' | 'stopped'
  /** 每次重新生成 / 编辑重发 +1；同时用作 React key 与 markdown 缓存 key */
  attempt: number
  error?: { code?: string; message: string }
  createdAt?: number
  /** 仅用户消息：输入区回填用 */
  attachments?: readonly Attachment[]
}
```

### Block

```ts
type Block =
  | { kind: 'text'; text: string; citations?: readonly Citation[] }
  | { kind: 'thinking'; text: string; durationMs?: number }
  | { kind: 'tool'; id: string; name: string; status: 'running' | 'done' | 'error'; summary?: string; detail?: string }
  | { kind: 'image'; attachment: Attachment }
```

### 其它

```ts
interface Citation { index: number; title: string; url: string; site?: string }

interface Attachment {
  id: string; name: string; size: number; mime: string
  kind: 'image' | 'file'
  url?: string
  status?: 'pending' | 'uploading' | 'ready' | 'error'
  progress?: number          // 0–1
  error?: string
}

interface SessionSummary { id: string; title: string; updatedAt: number; pinned?: boolean }

interface ComposerValue {
  text: string
  attachments: readonly Attachment[]
}

const emptyComposerValue: ComposerValue
```

### 端口

```ts
interface SpeechPort {
  start(onTranscript: (text: string) => void): void
  stop(): void
  isRecording?(): boolean
}
```

组件按需接收单个端口，而不是一个聚合对象：

| 端口 | 传法 | 缺省行为 |
| --- | --- | --- |
| 语音 | `<Composer speech={speech} />` | 不渲染麦克风按钮 |
| 打开附件 | `<Composer onOpenAttachment={...} />`、`<MessageItem ... />` | 无动作 |
| 复制 | `onCopy` 回调 | 由调用方决定；示例里用 `navigator.clipboard` |

`ChatUiPorts` 只是把这三者打包的类型，方便调用方自己用 Context 传递，组件本身不读它。

---

## 3. 文案（labels）

```ts
interface UiLabels {
  common: { close; cancel; confirm; delete; copy; copied; retry }
  message: { user; assistant; regenerate; continue; edit; stop; stopped; failed;
             thinking; thinkingFor(seconds); tool; citations;
             branch(current, total); previousBranch; nextBranch; scrollToBottom }
  // thinking / search 只是给调用方拼 toggles 用的文案，组件本身不认识它们
  composer: { placeholder; send; stop; thinking; search; attach; voice; voiceStop;
              blocked; removeAttachment; uploadFailed; retryUpload; dropHere }
  sider: { newChat; rename; delete; deleteTitle; deleteDescription; empty;
           today; yesterday; earlier; collapse; expand; more; cancel; untitled }
  markdown: { copy; copied; footnotes }
}
```

```ts
import { zh } from './chat-protocol/labels.zh'
import { en } from './chat-protocol/labels.zh'   // 同文件导出

// 局部覆盖
const labels = {
  ...zh,
  composer: { ...zh.composer, placeholder: '问点什么…' },
}
```

组件按片接收，例如 `<Composer labels={labels.composer} />`、`<Sider labels={labels.sider} />`。

---

## 4. 组件

### 4.1 原子控件（`src/ui/atoms`）

| 组件 | 签名要点 |
| --- | --- |
| `Button` | `variant?: 'primary'\|'ghost'\|'outline'\|'danger'\|'toolbar'`（默认 `primary`）、`size?: 'sm'\|'md'\|'lg'`（默认 `md`）、`block?`、`icon?`，其余透传 `<button>` |
| `IconButton` | `icon`、`label`（必填，作为无障碍名称）、`tone?: 'default'\|'brand'\|'danger'`、`size?: 'sm'\|'md'` |
| `Tag` | `children`、`tone?: 'neutral'\|'brand'\|'success'\|'warning'\|'danger'`，只读 |
| `Pill` | `children`、`active?`、`onClick?`、`disabled?`；无 `onClick` 时渲染 `<span>` |
| `Switch` | `checked`、`onChange(next: boolean)`、`label`（无障碍名称）、`disabled?` |
| `Checkbox` | 同上；`label` 是可见文字 |
| `Tooltip` | `content`、`children: ReactElement`、`placement?: 'top'\|'bottom'`（默认 `top`）、`delayMs?`（默认 120） |
| `Menu` | `items: MenuItemSpec[]`、`onSelect(id)`、`children: ReactElement`、`placement?: 'bottom-start'\|'bottom-end'`、`label` |
| `Modal` | `open`、`title`、`children?`、`footer?`、`onClose`、`size?: 'sm'\|'md'\|'lg'`、`closeLabel` |
| `Select` | `<T extends string>`：`value`、`options: {value,label}[]`、`onChange(next: T)`、`label`、`placeholder?`、`size?: 'sm'\|'md'`（`sm` 用于输入区工具条） |

```tsx
<Menu
  label="会话操作"
  items={[
    { id: 'rename', label: '重命名' },
    { id: 'delete', label: '删除', danger: true, separatorBefore: true },
  ]}
  onSelect={id => (id === 'rename' ? startRename() : remove())}
>
  <IconButton icon={<MoreIcon />} label="更多操作" />
</Menu>
```

行为要点：

- **Modal** 用原生 `<dialog>` + `showModal()`：Esc、背景 inert、top layer、焦点还原都由浏览器负责；**不要**再加手写焦点陷阱。
- **Menu / Select / Tooltip** 的面板挂在 `body`（若存在打开的 `<dialog>` 则挂进该 dialog），用触发元素 rect 定位，因此不会被滚动容器裁掉。
- **Menu** 键盘：↑/↓ 循环（跳过 `aria-disabled`）、Home/End、Enter/Space、Esc 关闭并归还焦点、Tab 关闭后继续遍历。
- **Select** 打开时聚焦当前项，`placeholder` 用于 `value` 未命中任何选项时。

### 4.2 提示与空态（`src/ui/toast`、`src/ui/empty`）

```ts
ToastProvider: { children, maxVisible?: number }   // 默认 3
useToast(): { show({ text, tone?: 'info'|'success'|'error', link?: { label, href } }) }
EmptyState: { title, description?, items?: readonly string[], onPick?(text), icon? }
```

```tsx
<ToastProvider>
  <App />
</ToastProvider>

function App() {
  const toast = useToast()
  return <Button onClick={() => toast.show({ text: '已保存', tone: 'success' })}>保存</Button>
}
```

队列是**实例级**的：同页两个 `ToastProvider` 互不影响；自动消失 3s，`prefers-reduced-motion` 下关闭动画。

### 4.3 消息（`src/chat/message`）

```ts
MessageItem: {
  message: Message
  isLast?: boolean
  streaming?: boolean                 // 缺省取 message.status === 'streaming'
  labels: MessageLabels
  markdownLabels: MarkdownLabels
  branch?: { current: number; total: number; blockIndex: number }   // 0-based
  onRegenerate?; onContinue?; onStop?; onCopy?; onRetry?
  onEdit?(message, text); onSwitchBranch?(message, blockIndex, branchIndex)
  renderBlock?(block, message, index): ReactNode | undefined
}
```

行为要点：

- 助手消息按 `blocks` 顺序渲染；`text` 交给 `MarkdownText`，`thinking` 交给 `ThinkingBlock`，`tool` 渲染成卡片，`image` 渲染图片或占位。
- **思考块折叠时不挂载 markdown 渲染器**，只有展开才解析——长思考不折叠会白烧解析。
- 用户消息的编辑态：Enter 保存、Shift+Enter 换行、Esc 取消；触屏（`pointer: coarse`）下 Enter 一律换行。
- `renderBlock` 返回 `undefined` 表示回退到默认渲染。
- `branch` 存在且 `total > 1` 时才显示切换器。

```tsx
<MessageItem
  message={message}
  isLast={index === messages.length - 1}
  labels={labels.message}
  markdownLabels={labels.markdown}
  onRegenerate={regenerate}
  onCopy={copy}
  onEdit={editUserMessage}
/>
```

### 4.4 输入（`src/chat/composer`）

```ts
Composer: {
  value: ComposerValue
  onChange(next: ComposerValue)
  onSubmit(): void
  onStop?(): void
  status: 'idle' | 'streaming' | 'blocked'
  blockedReason?: string
  toggles?: readonly ComposerToggle[]     // 工具条开关，按顺序渲染；不传就没有
  features?: { voice?: boolean }          // voice 缺省显示
  onPickFiles?(files: File[])
  onRemoveAttachment?(id: string)
  onRetryAttachment?(id: string)
  onOpenAttachment?(attachment: Attachment)
  speech?: SpeechPort
  labels: ComposerLabels
  slots?: {
    leading?: ReactNode      // 工具条最左
    model?: ReactNode        // 模型选择座位
    permission?: ReactNode   // 权限模式座位
    plan?: ReactNode         // 计划模式座位
    activity?: ReactNode     // 右侧活动指示
    trailing?: ReactNode     // 发送键之后
    overlay?: ReactNode      // 浮层座位：@ / / 触发菜单挂这里（绝对定位在输入框上方）
    dock?: ReactNode         // 输入区下方整块（队列提示、快捷键提示）
  }
}
```

行为要点：

- **Enter 提交、Shift+Enter 换行**；组词期间（`isComposing` 或 `keyCode === 229`）不提交、不吞字。
- 高度用 `field-sizing: content` 自适应，`1lh` 到 `maxRows` 行（默认 8）；不支持的浏览器走 JS 兜底。
- 拖拽用 depth 计数（不是布尔），只接受 `Files`；粘贴文件走 `onPickFiles`。
- `status === 'streaming'` 时发送键变停止键；`blocked` 时输入禁用并显示 `blockedReason ?? labels.blocked`。
- `features.voice !== false && speech` 才渲染麦克风。
- 工具条开关由调用方定义（不只是“深度思考/智能搜索”）：

```ts
interface ComposerToggle {
  id: string
  label: string            // 可见文案 + 无障碍名称
  icon?: ReactNode
  active: boolean
  disabled?: boolean
  onToggle: (next: boolean) => void
}
```

```tsx
const [thinking, setThinking] = useState(false)
const [search, setSearch] = useState(false)

<Composer
  value={draft}
  onChange={setDraft}
  onSubmit={send}
  status={status}
  labels={labels.composer}
  toggles={[
    { id: 'thinking', label: labels.composer.thinking, icon: <ThinkIcon />, active: thinking, onToggle: setThinking },
    { id: 'search', label: labels.composer.search, icon: <SearchIcon />, active: search, onToggle: setSearch },
  ]}
/>
```

`ThinkIcon` / `SearchIcon` 是可选的现成图标，也可以不传 `icon`。开关状态不属于 `ComposerValue`——它们是业务状态，留在调用方。
- 附件三态：`uploading`（进度条）/ `error`（重试 + 移除）/ `ready`（移除）。

`PromptInput` 是同一个文本框的独立版本（`value / onChange / onSubmit / placeholder / disabled / autoFocus / label / maxRows`），用于搜索框、内联改名等单行场景。

### 4.5 消息列表（`src/chat/list`）

```ts
MessageList: {
  messages: readonly Message[]
  stickToBottom?: boolean       // 默认 true
  followSignal?: number         // 值变化时强制回到底部并重新挂上闩锁
  labels: MessageLabels
  markdownLabels: MarkdownLabels
  renderMessage?(message): ReactNode | undefined
  emptyState?: ReactNode
  onRegenerate?; onContinue?; onStop?; onCopy?; onRetry?; onEdit?; onSwitchBranch?
}
```

行为要点：

- **滚动闩锁**：距底 ≤ 8px 视为贴底；用户上滚即解闩，回到底部再挂上。跟随时用 `ResizeObserver` + 瞬时 `scrollTo`（不用 `smooth`，流式追不上）。
- 内容容器里每个 `MessageRow` 都 `memo`，只有变化的 `message` 引用会重渲；回调走稳定引用，调用方可以放心传内联箭头函数。
- `followSignal` 用于「用户上滚阅读后自己发了消息」：发送时自增即可回底。
- `stickToBottom={false}` 时完全不干预滚动（不挂监听、不显示回底按钮）。
- 列表自身需要受限高度：父级应该给 `flex: 1; min-height: 0` 或固定高度。

### 4.6 会话侧栏（`src/chat/sider`）

```ts
Sider: {
  sessions: readonly SessionSummary[]
  activeId?: string | null
  collapsed?: boolean
  now?: number                    // 分组基准，默认 Date.now()
  labels: SiderLabels
  onSelect(id); onNew(); onRename(id, title); onDelete(id)
  onCollapseToggle?()
  footer?: ReactNode
}
```

按「今天 / 昨天 / 更早」分组（组内 `updatedAt` 倒序），活跃项 `aria-current="page"`；hover 或键盘聚焦显示「更多」，内含重命名（内联输入）与删除（二次确认，不依赖 Modal）；`collapsed` 时收成 60px 图标条。

### 4.6b 输入区座位（`src/chat/seats`）

面向 agent 场景的三个座位组件。它们只负责「当前值 + 交互」，选项、文案、语义全部由调用方给：

```ts
PermissionSelect: {
  value: string
  options: readonly { id: string; label: string; icon?: ReactNode }[]
  onChange(id: string): void
  label: string                      // 控件与菜单的无障碍名称
  icon?: ReactNode                   // 默认锁图标
  disabled?: boolean
  placement?: 'bottom-start' | 'bottom-end'
}

PlanToggle: { label: string; active: boolean; onToggle(next: boolean): void; icon?: ReactNode; disabled?: boolean }

ActivityIndicator: {
  status: 'idle' | 'running' | 'error'
  label?: string                     // idle 且无 label 时整个组件不渲染
  detail?: string                    // 例如 "12s"、"3 个工具调用"
  icon?: ReactNode
}
```

```tsx
<Composer
  …
  slots={{
    model: <Select label="模型" size="sm" value={model} options={models} onChange={setModel} />,
    permission: (
      <PermissionSelect
        label="权限模式"
        value={permission}
        options={[
          { id: 'read', label: '只读' },
          { id: 'workspace', label: '工作区可写' },
          { id: 'full', label: '完全访问' },
        ]}
        onChange={setPermission}
      />
    ),
    plan: <PlanToggle label="计划模式" active={plan} onToggle={setPlan} />,
    activity: <ActivityIndicator status={status === 'streaming' ? 'running' : 'idle'} label={status === 'streaming' ? '生成中' : undefined} />,
  }}
/>
```

座位本身不是状态：`value` / `active` 由调用方持有，组件只在交互时回调。库不预设“只读/可写”这类语义，也不认识 agent 的权限模型。

### 4.7 Markdown（`src/markdown`）

```ts
MarkdownText: {
  text: string
  streaming?: boolean
  cacheKey?: string                  // 建议 `${message.id}:${message.attempt}`；缺省 = 不缓存
  maxHz?: number                     // 内部绘制合并上限，默认 30；0 = 不合并
  labels?: MarkdownLabels            // 代码块复制按钮文案；缺省时不渲染复制按钮
  onCopy?: (code: string) => void    // 自定义复制实现，默认 navigator.clipboard
  className?: string
}
```

性能契约：

| 条件 | 单次更新成本 |
| --- | --- |
| 同 `cacheKey` + 文本单调追加 | **O(尾部)**：冻结除最后一块以外的 AST，开放围栏零解析 |
| 首次出现 / 文本变短 / `cacheKey` 变化 | O(全文) |
| `streaming` 变 `false` | 一次 O(全文) 校验解析（引用、脚注自愈） |
| 任意时刻 | 每条消息最多 1 棵 AST 缓存，全局上限 40 条（FIFO 淘汰） |

**唯一约束**：同一 `cacheKey` 下文本只允许追加。重新生成或编辑重发必须让 `attempt` 变化，从而换 `cacheKey`。

代码块：语言标签 + 复制按钮（传 `labels` 才显示）+ Prism 高亮。高亮只在**块已定型**时做——冻结块随时着色，流式尾块保持纯文本，结算后整篇着色；这样围栏增长期间不会每帧重新 tokenize（与增量解析同一原则）。

尚未提供：引用角标的悬浮来源卡（当前渲染成一行链接）。

---

## 5. 性能：调用方该怎么做

1. **不要每 token `setState`**。用 rAF 或固定频率合并（参考 `src/app/feed.ts`，40 行）：

```ts
const feed = createTokenFeed({ maxHz: 30, onFlush: text => appendToLastMessage(text) })
for await (const event of transport.send(request)) {
  if (event.type === 'text-delta') feed.push(event.text)
}
```

2. **低优先级更新**：把流式的 `setState` 包进 `startTransition`，输入框与滚动就永远抢占它。
3. **`maxHz` 只给正在流式的那个 `MarkdownText` 开**；一次性渲染 50 条历史消息时全部用 `maxHz={0}`。
4. 需要 DOM 严格等于 props（截图回归 / SSR）时，`maxHz={0}` 并配合外部合并器。

---

## 6. 常见坑

| 现象 | 原因 / 处理 |
| --- | --- |
| 列表被宽表格撑出屏幕 | 父级需要 `min-width: 0`（flex item 默认 `min-width: auto`） |
| 列表不滚动、内容盖住输入区 | 父级没有受限高度：`flex: 1; min-height: 0` 或显式 height |
| 上滚阅读时被强制拉回底部 | 不要每帧调 `scrollTo`；用 `followSignal` 只在发送时回底 |
| 中文输入法下消息被提前发送 | Enter 处理里先 `preventDefault()`，再判 `isComposing`/`keyCode === 229` |
| 重新生成后内容串行/错乱 | `attempt` 没变，导致 markdown 缓存命中旧文本 |
| 思考块展开后卡顿 | 折叠时不要挂载 `MarkdownText`（当前实现已保证） |
| 同页两个聊天互相打断朗读 | 语音/朗读必须是实例端口，不能是模块级单例 |
| 弹窗里的下拉被遮住 | 组件已把浮层挂进打开的 `<dialog>`；自定义浮层要照做 |
| 流式时读屏器疯狂播报 | 不要给整个回答加 `aria-live`；只在结算时播报一次 |

---

## 7. 完整示例

- 最小示例（50 行，静态渲染）：`examples/minimal.tsx`
- 完整示例（侧栏 + 消息流 + 输入区 + 提示 + 假服务端 + 合并器）：`examples/full.tsx`
- 说明与「接真后端要改哪三处」：`docs/example.md`
