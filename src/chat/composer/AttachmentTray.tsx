import clsx from 'clsx'
import type { ComposerLabels } from '../../chat-protocol/labels'
import type { Attachment } from '../../chat-protocol/types'
import { formatSize, toPercent } from './format'
import { IconClose, IconFile, IconRetry } from './icons'
import styles from './AttachmentTray.module.css'

export interface AttachmentTrayProps {
  items: readonly Attachment[]
  labels: ComposerLabels
  onRemove?: (id: string) => void
  onRetry?: (id: string) => void
  onOpen?: (attachment: Attachment) => void
}

/**
 * 输入区上方的附件条。
 * 图片显示缩略图，文件显示「图标 + 名称 + 大小」；上传中给进度条，失败给重试，
 * 每个可操作项都带 aria-label。
 */
export const AttachmentTray = ({
  items,
  labels,
  onRemove,
  onRetry,
  onOpen,
}: AttachmentTrayProps) => {
  if (items.length === 0) {
    return null
  }

  return (
    <div className={styles.tray} role="list">
      {items.map((item) => (
        <AttachmentItem
          key={item.id}
          item={item}
          labels={labels}
          onRemove={onRemove}
          onRetry={onRetry}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

const AttachmentItem = ({
  item,
  labels,
  onRemove,
  onRetry,
  onOpen,
}: {
  item: Attachment
  labels: ComposerLabels
  onRemove?: (id: string) => void
  onRetry?: (id: string) => void
  onOpen?: (attachment: Attachment) => void
}) => {
  const status = item.status ?? 'ready'
  const uploading = status === 'uploading'
  const failed = status === 'error'
  const image = item.kind === 'image' && item.url !== undefined
  const percent = toPercent(item.progress)
  const errorText = item.error ?? labels.uploadFailed

  const body = image ? (
    <img className={styles.thumb} src={item.url} alt={item.name} draggable={false} />
  ) : (
    <>
      <span className={styles.cardIcon}>
        <IconFile />
      </span>
      <span className={styles.cardText}>
        <span className={styles.cardName} title={item.name}>
          {item.name}
        </span>
        <span className={styles.cardSize}>{formatSize(item.size)}</span>
      </span>
    </>
  )

  return (
    <div
      role="listitem"
      className={clsx(
        styles.item,
        image ? styles.imageItem : styles.fileItem,
        failed && styles.failed
      )}
      title={failed ? errorText : item.name}
    >
      {onOpen ? (
        <button
          type="button"
          className={image ? styles.imageBody : styles.fileBody}
          aria-label={item.name}
          onClick={() => onOpen(item)}
        >
          {body}
        </button>
      ) : (
        <div className={image ? styles.imageBody : styles.fileBody}>{body}</div>
      )}

      {uploading ? (
        <div
          className={styles.progress}
          role="progressbar"
          aria-label={item.name}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
      ) : null}

      {failed ? (
        <div className={styles.errorRow}>
          <span className={styles.errorText}>{errorText}</span>
          {onRetry ? (
            <button
              type="button"
              className={styles.retry}
              aria-label={labels.retryUpload}
              title={labels.retryUpload}
              onClick={() => onRetry(item.id)}
            >
              <IconRetry />
            </button>
          ) : null}
        </div>
      ) : null}

      {onRemove ? (
        <button
          type="button"
          className={clsx(styles.remove, failed && styles.removeAlways)}
          aria-label={labels.removeAttachment}
          title={labels.removeAttachment}
          onClick={() => onRemove(item.id)}
        >
          <IconClose />
        </button>
      ) : null}
    </div>
  )
}
