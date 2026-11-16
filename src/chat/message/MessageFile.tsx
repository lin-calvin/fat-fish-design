import clsx from 'clsx'
import type { Attachment } from '../../chat-protocol/types'
import { FileIcon, ImageIcon } from './icons'
import styles from './MessageFile.module.css'

/** 纯展示的大小格式化：只有单位符号，没有可翻译文案。 */
function formatSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return ''
  if (size < 1024) return `${Math.round(size)} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 消息里的图片附件：有 url 时渲染缩略图（点击在新窗口打开原件），
 * 没有 url 时退回带文件名的占位块。
 */
export function MessageImage({ attachment }: { attachment: Attachment }) {
  const { url, name } = attachment
  const body = url ? (
    <img src={url} alt={name} />
  ) : (
    <span className={styles.imagePlaceholder}>
      <ImageIcon />
      <span>{name}</span>
    </span>
  )
  return url ? (
    <a
      className={styles.image}
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      title={name}
    >
      {body}
    </a>
  ) : (
    <div className={styles.image} title={name}>
      {body}
    </div>
  )
}

/**
 * 消息里的文件附件：名称 + 大小（失败时显示错误原因）。
 * 有 url 时可点击新窗口打开。
 */
export function MessageFile({ attachment }: { attachment: Attachment }) {
  const { url, name, size, error } = attachment
  const failed = attachment.status === 'error'
  const meta = failed && error ? error : formatSize(size)
  const body = (
    <>
      <span className={styles.fileIcon} aria-hidden="true">
        <FileIcon />
      </span>
      <span className={styles.fileBody}>
        <span className={styles.fileName}>{name}</span>
        {meta ? <span className={styles.fileMeta}>{meta}</span> : null}
      </span>
    </>
  )
  const className = clsx(styles.file, failed && styles.fileError)
  return url ? (
    <a className={className} href={url} target="_blank" rel="noreferrer noopener" title={name}>
      {body}
    </a>
  ) : (
    <div className={className} title={name}>
      {body}
    </div>
  )
}
