import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Message } from '../../chat-protocol/types'
import { BranchSwitcher } from './BranchSwitcher'
import { CopyButton } from './CopyButton'
import { IconButton } from './Controls'
import { EditIcon } from './icons'
import { MessageFile, MessageImage } from './MessageFile'
import styles from './MessageItem.module.css'
import type { UserMessageProps } from './types'

/** 用户消息只做纯文本：把所有 text block 按顺序拼起来。 */
function messageText(message: Message): string {
  return message.blocks
    .filter((block): block is Extract<Message['blocks'][number], { kind: 'text' }> => block.kind === 'text')
    .map(block => block.text)
    .join('\n\n')
}

/**
 * 用户气泡。
 * 悬停 / 键盘聚焦时露出「复制 / 编辑」；编辑是内联 textarea：
 * Enter 保存、Shift+Enter 换行、Esc 取消，保存时回调 onEdit(message, text)。
 */
export function UserMessage({
  message,
  labels,
  markdownLabels,
  branch,
  onCopy,
  onEdit,
  onSwitchBranch,
}: UserMessageProps) {
  const text = useMemo(() => messageText(message), [message])
  const attachments = message.attachments ?? []
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 输入框跟着内容长高，到上限后内部滚动
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!editing || !textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 202)}px`
  }, [editing, draft])

  const cancel = () => {
    setDraft(text)
    setEditing(false)
  }

  const save = () => {
    const value = draft.trim()
    if (value === '') return
    setEditing(false)
    setDraft(value)
    onEdit?.(message, value)
  }

  return (
    <>
      {attachments.length > 0 ? (
        <div className={styles.files}>
          {attachments.map(attachment =>
            attachment.kind === 'image' ? (
              <MessageImage key={attachment.id} attachment={attachment} />
            ) : (
              <MessageFile key={attachment.id} attachment={attachment} />
            ),
          )}
        </div>
      ) : null}

      {editing ? (
        <div className={styles.editor}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            aria-label={labels.edit}
            autoFocus
            rows={1}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return
              if (event.key === 'Escape') {
                event.preventDefault()
                cancel()
                return
              }
              if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey) return
              // 触屏软键盘上 Enter 应该是换行，不当作保存
              const coarse =
                typeof window !== 'undefined' &&
                window.matchMedia?.('(pointer: coarse)').matches === true
              if (coarse) return
              event.preventDefault()
              save()
            }}
          />
        </div>
      ) : (
        <>
          {text ? <div className={styles.bubble}>{text}</div> : null}
          <div className={styles.row}>
            <div className={styles.actions}>
              {text && onCopy ? (
                <CopyButton
                  text={text}
                  label={markdownLabels.copy}
                  copiedLabel={markdownLabels.copied}
                  onCopy={onCopy}
                />
              ) : null}
              {onEdit ? (
                <IconButton
                  label={labels.edit}
                  icon={<EditIcon />}
                  onClick={() => {
                    setDraft(text)
                    setEditing(true)
                  }}
                />
              ) : null}
            </div>
            {branch && branch.total > 1 && message.blocks[branch.blockIndex] && onSwitchBranch ? (
              <BranchSwitcher
                current={branch.current}
                total={branch.total}
                labels={labels}
                onChange={index => onSwitchBranch(message, branch.blockIndex, index)}
              />
            ) : null}
          </div>
        </>
      )}
    </>
  )
}
