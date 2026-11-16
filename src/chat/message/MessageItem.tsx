import clsx from 'clsx'
import { AssistantMessage } from './AssistantMessage'
import styles from './MessageItem.module.css'
import type { MessageItemProps } from './types'
import { UserMessage } from './UserMessage'

/**
 * 单条消息的渲染入口。
 * 纯受控：所有状态要么来自 props，要么是组件内的临时 UI 状态（折叠、编辑草稿、复制反馈）。
 */
export function MessageItem({
  message,
  isLast = false,
  streaming,
  labels,
  markdownLabels,
  branch,
  onRegenerate,
  onContinue,
  onStop,
  onCopy,
  onRetry,
  onEdit,
  onSwitchBranch,
  renderBlock,
}: MessageItemProps) {
  const isUser = message.role === 'user'
  const streamingNow = streaming ?? message.status === 'streaming'

  return (
    <article
      className={clsx(styles.root, isUser && styles.userRoot)}
      aria-label={isUser ? labels.user : labels.assistant}
      data-role={message.role}
      data-status={message.status}
      data-attempt={message.attempt}
    >
      {isUser ? (
        <UserMessage
          message={message}
          labels={labels}
          markdownLabels={markdownLabels}
          branch={branch}
          onCopy={onCopy}
          onEdit={onEdit}
          onSwitchBranch={onSwitchBranch}
        />
      ) : (
        <AssistantMessage
          message={message}
          isLast={isLast}
          streaming={streamingNow}
          labels={labels}
          markdownLabels={markdownLabels}
          branch={branch}
          onRegenerate={onRegenerate}
          onContinue={onContinue}
          onStop={onStop}
          onCopy={onCopy}
          onRetry={onRetry}
          onSwitchBranch={onSwitchBranch}
          renderBlock={renderBlock}
        />
      )}
    </article>
  )
}
