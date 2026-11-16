import { memo, type ReactNode } from 'react'
import type { RootContent } from 'mdast'
import type { MarkdownLabels } from '../chat-protocol/labels'
import { CodeBlock } from './CodeBlock'

/**
 * mdast 的联合类型由 micromark 插件（math/gfm）扩充，逐个声明成本高且易随插件版本漂移。
 * 这里把内部节点放宽成结构类型，只在组件边界保留 RootContent 的类型约束。
 */
type MdNode = {
  type: string
  value?: string
  url?: string
  alt?: string | null
  depth?: number
  ordered?: boolean
  start?: number | null
  align?: readonly (string | null)[] | null
  lang?: string | null
  meta?: string | null
  children?: readonly MdNode[]
}

function inlines(nodes: readonly MdNode[] | undefined, prefix: string): ReactNode[] {
  return (nodes ?? []).map((node, index) => inline(node, `${prefix}.${index}`))
}

function inline(node: MdNode, key: string): ReactNode {
  switch (node.type) {
    case 'text':
      return node.value ?? ''
    case 'strong':
      return <strong key={key}>{inlines(node.children, key)}</strong>
    case 'emphasis':
      return <em key={key}>{inlines(node.children, key)}</em>
    case 'delete':
      return <del key={key}>{inlines(node.children, key)}</del>
    case 'inlineCode':
      return <code key={key}>{node.value}</code>
    case 'link':
      return (
        <a key={key} href={node.url} target="_blank" rel="noreferrer noopener">
          {inlines(node.children, key)}
        </a>
      )
    case 'break':
      return <br key={key} />
    case 'inlineMath':
      return <span key={key} className="math">{node.value}</span>
    case 'image':
      return <span key={key} className="image-ref">[image {node.alt ?? ''}]</span>
    default:
      return node.children ? <span key={key}>{inlines(node.children, key)}</span> : null
  }
}

export interface BlockRenderOptions {
  /** 是否给代码块着色：定型块（冻结/结算）为 true，流式尾块为 false */
  highlight?: boolean
  labels?: MarkdownLabels | undefined
  onCopy?: ((code: string) => void) | undefined
}

function children(node: MdNode, prefix: string, options: BlockRenderOptions): ReactNode[] {
  return (node.children ?? []).map((child, index) => (
    <MarkdownBlock key={`${prefix}.${index}`} node={child as unknown as RootContent} {...options} />
  ))
}

/**
 * 单块渲染：按 node 引用 memo。
 * 冻结块的 node 对象跨帧稳定，所以流式更新时只有尾部一两块真正重渲。
 */
export const MarkdownBlock = memo(function MarkdownBlock({
  node: raw,
  highlight = true,
  labels,
  onCopy,
}: { node: RootContent } & BlockRenderOptions) {
  const node = raw as unknown as MdNode
  switch (node.type) {
    case 'paragraph':
      return <p>{inlines(node.children, 'p')}</p>
    case 'heading': {
      const depth = node.depth ?? 1
      const Tag = `h${Math.min(6, depth)}` as 'h1'
      return <Tag>{inlines(node.children, 'h')}</Tag>
    }
    case 'code':
      return (
        <CodeBlock
          code={node.value ?? ''}
          lang={node.lang}
          highlight={highlight}
          labels={labels}
          onCopy={onCopy}
        />
      )
    case 'math':
      return <div className="math-block">{node.value}</div>
    case 'blockquote':
      return <blockquote>{children(node, 'q', { highlight, labels, onCopy })}</blockquote>
    case 'list':
      return node.ordered ? (
        <ol start={node.start ?? 1}>{children(node, 'ol', { highlight, labels, onCopy })}</ol>
      ) : (
        <ul>{children(node, 'ul', { highlight, labels, onCopy })}</ul>
      )
    case 'listItem':
      return <li>{children(node, 'li', { highlight, labels, onCopy })}</li>
    case 'table':
      return (
        <table>
          <thead>
            <tr>
              {(node.children?.[0]?.children ?? []).map((cell, index) => (
                <th key={index} style={{ textAlign: (node.align?.[index] ?? undefined) as never }}>
                  {inlines(cell.children, 'th')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(node.children ?? []).slice(1).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {(row.children ?? []).map((cell, index) => (
                  <td key={index} style={{ textAlign: (node.align?.[index] ?? undefined) as never }}>
                    {inlines(cell.children, 'td')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'thematicBreak':
      return <hr />
    case 'html':
    case 'definition':
    case 'footnoteDefinition':
      return null
    default:
      return node.children ? <div>{children(node, 'x', { highlight, labels, onCopy })}</div> : null
  }
})
