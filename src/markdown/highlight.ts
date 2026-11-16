/**
 * 语法高亮：只在「块已定型」时调用（冻结块，或结算后的整篇）。
 * 流式中的尾块保持纯文本，避免每个 token 都重新 tokenize 整段围栏。
 */
import Prism from 'prismjs'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-diff'

/** 常见的围栏别名 → Prism 语言名 */
const ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  py: 'python',
  md: 'markdown',
  yml: 'yaml',
  patch: 'diff',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  css: 'css',
  jsonc: 'json',
  json5: 'json',
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 返回可直接注入的 HTML；未识别的语言返回转义后的纯文本。
 * 传入的代码来自模型输出，Prism 自身会对文本做转义，这里不额外信任任何标记。
 */
export function highlightCode(code: string, lang: string | null | undefined): string {
  const name = lang ? (ALIASES[lang.toLowerCase()] ?? lang.toLowerCase()) : ''
  const grammar = name ? Prism.languages[name] : undefined
  if (!grammar) return escapeHtml(code)
  try {
    return Prism.highlight(code, grammar, name)
  } catch {
    return escapeHtml(code)
  }
}

/** 展示用的语言标签（保持作者写的原文，别名不展开） */
export function languageLabel(lang: string | null | undefined): string | null {
  return lang ? lang.trim().toLowerCase() : null
}
