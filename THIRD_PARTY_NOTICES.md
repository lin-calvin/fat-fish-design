# Third-Party Notices

本项目以 [MIT](LICENSE) 发布。其中部分文件与设计来自第三方项目，各自保留原有许可证；本文件不改变这些条款。

## 派生自 DeepSeek 开源仓库

以下两个仓库均为 **MIT License，Copyright (c) 2026 DeepSeek**。

### deepseek-ai/chat-demo

- `src/tokens/theme.css`、`src/tokens/global.css`：直接取自 `chat-demo/src/app/theme.css` 与 `global.css`
  （设计 token 与线上 DeepSeek Web 的 `--dsw-*` 变量同源，实测 104/106 同名同义）。
- `src/chat-protocol/types.ts`、`src/ai`/`src/app` 中的部分数据结构与交互顺序参考其实现
  （会话、消息块、附件、停止/重新生成流程）。
- `src/markdown` 的排版规则（`.ds-markdown` 系列）参考其样式，规则与官方线上 CSS 高度一致。

### deepseek-ai/deepseek-harness

- `src/markdown/incremental.ts` 的「冻结前缀 + 尾部重解析 + 开放围栏」策略参考其
  `packages/client/ui-primitives/src/markdown/incremental.ts`。
- `src/tokens/extra.css` 的圆角/阴影/层级数值取自其 `ui-theme/src/styles`。
- 原子控件的键盘与浮层行为（Menu/Select/Tooltip/Modal）参考其 `ui-primitives` 的实现取舍。

> 上述参考均为「同一设计目标下的独立实现」，未整文件复制；需要逐字对照的文件已在上文列出。

## 运行时依赖

| 包 | 许可证 | 用途 |
| --- | --- | --- |
| react / react-dom | MIT | UI 运行时 |
| clsx | MIT | className 组合 |
| prismjs | MIT | 代码块语法高亮 |
| mdast-util-from-markdown / mdast-util-gfm / mdast-util-math | MIT | Markdown → AST |
| micromark-extension-gfm / micromark-extension-math | MIT | GFM 与数学语法 |
| @types/* | MIT | 类型声明（仅开发期） |

## 开发依赖

`vite`（MIT）、`@vitejs/plugin-react`（MIT）、`typescript`（Apache-2.0）。

## 品牌与商标

"DeepSeek"、"深度求索" 及其标识是 DeepSeek 的商标。本项目是**非官方**项目，与 DeepSeek 无关联、未获其背书。
仓库内的 `--dsw-*` 变量名与 DeepSeek 色阶仅作为设计 token 的实现细节存在；对外发布衍生作品前建议自行重命名。
