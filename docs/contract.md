# 组件契约（v0.1）

组件库的唯一原则：**props 是唯一真相，端口是唯一副作用入口，文案全部外部注入**。

- `src/chat-protocol/types.ts` — 领域类型（Message / Block / Attachment / ComposerValue / SpeechPort / ComposerValue）
- `src/chat-protocol/labels.ts` — `UiLabels` 分片，组件只能从这里取文案
- `src/tokens/theme.css` + `extra.css` — 可用 CSS 变量（`--dsw-alias-*` / `--dsw-static-*` / `--dsw-radius-*` / `--dsw-shadow-*` / `--ds-*`）

## 目录

```
src/ui/atoms       Button IconButton Tag Pill Switch Checkbox Tooltip Menu Modal Select
src/ui/toast       ToastProvider useToast
src/ui/empty       EmptyState
src/chat/message   MessageItem ThinkingBlock BranchSwitcher
src/chat/composer  PromptInput Composer
src/chat/list      MessageList
src/chat/sider     Sider SessionItem
src/markdown       MarkdownText（增量解析 + 绘制合并，已完成）
```

## 通用规则

1. 组件不接受 store、不做 fetch、不读写 localStorage、没有模块级可变状态。
2. 所有文案来自 `labels` prop；组件内不得出现中英文字面量。
3. 样式用同目录 `.module.css`，颜色/圆角/阴影/字号只引用 token。
4. 图标按钮必须有 `aria-label`；Modal 用原生 `<dialog>`；Menu 支持 ↑/↓/Home/End/Escape。
5. StrictMode 双渲染安全，effect 清理监听器与定时器。

## MarkdownText

```ts
{
  text: string
  streaming?: boolean
  cacheKey?: string      // `${message.id}:${message.attempt}`；缺省 = 不缓存
  maxHz?: number         // 内部绘制合并上限，0 = 不合并
  className?: string
}
```

保证：同 `cacheKey` 且文本只追加时，单次更新成本与全文长度无关（O(尾部)）；`streaming` 变 false 时整篇重解析一次。

## App 层职责（不在库内）

- 会话数组、消息数组、streaming 状态、草稿、附件、持久化、路由
- SSE 客户端与 `token → props` 转换（`src/app/feed.ts` 是参考实现，40 行）
- 假数据的「服务端」：`src/app/fixtures.ts`
