import clsx from 'clsx'
import { Fragment } from 'react'
import type { Citation, Block, Message } from '../../chat-protocol/types'
import { MarkdownText } from '../../markdown/MarkdownText'
import { BranchSwitcher } from './BranchSwitcher'
import { CopyButton } from './CopyButton'
import { IconButton, TextButton } from './Controls'
import { ContinueIcon, RefreshIcon, StopIcon, WarningIcon } from './icons'
import markdownStyles from './markdown.module.css'
import { MessageImage } from './MessageFile'
import styles from './MessageItem.module.css'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolCard, type ToolBlock } from './ToolCard'
import type { AssistantMessageProps } from './types'

/** 引用角标：一行「来源」小链接，不做悬浮卡。 */
function Citations({ citations, label }: { citations: readonly Citation[]; label: string }) {
  return (
    <div className={styles.citations}>
      <span className={styles.citationsLabel}>{label}</span>
      {citations.map(citation => (
        <a
          key={citation.index}
          className={styles.citation}
          href={citation.url}
          target="_blank"
          rel="noreferrer noopener"
          title={citation.title || citation.site || citation.url}
        >
          <span className={styles.citationIndex} aria-hidden="true">
            {citation.index}
          </span>
          <span className={styles.citationText}>{citation.title || citation.site || citation.url}</span>
        </a>
      ))}
    </div>
  )
}

/** 助手消息里所有 text block 拼起来的纯文本，用于复制按钮。 */
function copyableText(blocks: readonly Block[]): string {
  return blocks
    .filter((block): block is Extract<Block, { kind: 'text' }> => block.kind === 'text')
    .map(block => block.text)
    .join('\n\n')
}

/**
 * 助手消息：按 blocks 顺序渲染，最后一个 text block 承接流式光标。
 * 操作条只出现在最后一条消息上，且每个按钮都在对应回调存在时才渲染。
 */
export function AssistantMessage({
  message,
  isLast,
  streaming,
  labels,
  markdownLabels,
  branch,
  onRegenerate,
  onContinue,
  onStop,
  onCopy,
  onRetry,
  onSwitchBranch,
  renderBlock,
}: AssistantMessageProps) {
  const blocks = message.blocks
  const text = copyableText(blocks)

  let lastTextIndex = -1
  blocks.forEach((block, index) => {
    if (block.kind === 'text') lastTextIndex = index
  })

  const waiting = streaming && blocks.length === 0
  const showBranch =
    branch !== undefined &&
    branch.total > 1 &&
    blocks[branch.blockIndex] !== undefined &&
    onSwitchBranch !== undefined
  const showBottom = isLast || showBranch

  const render = (block: Block, index: number) => {
    const custom = renderBlock?.(block, message, index)
    if (custom !== undefined) {
      return <Fragment key={`custom-${index}`}>{custom}</Fragment>
    }
    switch (block.kind) {
      case 'text':
        return (
          <div className={styles.block} key={`text-${index}`}>
            <div className={markdownStyles.markdown}>
              <MarkdownText
                text={block.text}
                cacheKey={`${message.id}:${message.attempt}:${index}`}
                streaming={streaming && index === lastTextIndex}
                maxHz={30}
                labels={markdownLabels}
              />
            </div>
            {block.citations && block.citations.length > 0 ? (
              <Citations citations={block.citations} label={labels.citations} />
            ) : null}
          </div>
        )
      case 'thinking':
        return (
          <ThinkingBlock
            key={`thinking-${index}`}
            text={block.text}
            durationMs={block.durationMs}
            running={streaming && index === blocks.length - 1}
            labels={labels}
            markdownLabels={markdownLabels}
          />
        )
      case 'tool':
        return <ToolCard key={`tool-${index}`} block={block as ToolBlock} labels={labels} />
      case 'image':
        return (
          <div className={styles.block} key={`image-${index}`}>
            <MessageImage attachment={block.attachment} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={styles.message}>
      {blocks.map(render)}

      {waiting ? (
        <div className={styles.waiting} aria-hidden="true">
          <span className={styles.waitingDot} />
          <span className={styles.waitingDot} />
          <span className={styles.waitingDot} />
        </div>
      ) : null}

      {message.status === 'error' ? (
        <div className={styles.notice} role="alert">
          <span className={styles.noticeIcon}>
            <WarningIcon />
          </span>
          <span className={styles.noticeBody}>
            <span>{labels.failed}</span>
            {message.error?.message ? <span>{message.error.message}</span> : null}
          </span>
        </div>
      ) : null}

      {message.status === 'stopped' && !streaming ? (
        <div className={styles.note}>{labels.stopped}</div>
      ) : null}

      {showBottom ? (
        <div className={styles.bottom}>
          {showBranch && branch && onSwitchBranch ? (
            <BranchSwitcher
              current={branch.current}
              total={branch.total}
              labels={labels}
              onChange={index => onSwitchBranch(message, branch.blockIndex, index)}
            />
          ) : null}
          {isLast ? (
            <div className={clsx(styles.actions, styles.actionsAlways)}>
              {streaming ? (
                onStop ? (
                  <TextButton
                    label={labels.stop}
                    icon={<StopIcon />}
                    onClick={() => onStop(message)}
                  />
                ) : null
              ) : message.status === 'error' ? (
                onRetry ? (
                  <TextButton
                    label={labels.regenerate}
                    icon={<RefreshIcon />}
                    onClick={() => onRetry(message)}
                  />
                ) : null
              ) : message.status === 'stopped' ? (
                onContinue ? (
                  <TextButton
                    label={labels.continue}
                    icon={<ContinueIcon />}
                    onClick={() => onContinue(message)}
                  />
                ) : null
              ) : (
                <>
                  {text && onCopy ? (
                    <CopyButton
                      text={text}
                      label={markdownLabels.copy}
                      copiedLabel={markdownLabels.copied}
                      onCopy={onCopy}
                    />
                  ) : null}
                  {onRegenerate ? (
                    <IconButton
                      label={labels.regenerate}
                      icon={<RefreshIcon />}
                      onClick={() => onRegenerate(message)}
                    />
                  ) : null}
                </>
              )}
            </div>
          ) : null}
          {isLast && !streaming && message.status === 'settled' && onContinue ? (
            <TextButton
              className={styles.continueButton}
              label={labels.continue}
              icon={<ContinueIcon />}
              onClick={() => onContinue(message)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
