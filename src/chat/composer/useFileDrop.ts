import { useCallback, useRef, useState, type DragEvent } from 'react'

const hasFiles = (event: DragEvent<HTMLElement>): boolean =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files')

export interface FileDropState {
  /** 是否有文件正悬停在输入区上 */
  dragging: boolean
  handlers: {
    onDragEnter: (event: DragEvent<HTMLElement>) => void
    onDragLeave: (event: DragEvent<HTMLElement>) => void
    onDragOver: (event: DragEvent<HTMLElement>) => void
    onDrop: (event: DragEvent<HTMLElement>) => void
  }
}

/**
 * 输入区拖拽投放。
 * dragenter / dragleave 会随子元素反复触发，所以用计数器而不是布尔值：
 * 只有计数归零才算真正离开。
 */
export const useFileDrop = (onFiles: ((files: File[]) => void) | undefined): FileDropState => {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  const dropRef = useRef(onFiles)
  dropRef.current = onFiles
  const accept = onFiles !== undefined

  const reset = useCallback(() => {
    depth.current = 0
    setDragging(false)
  }, [])

  const onDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!accept || !hasFiles(event)) {
        return
      }
      depth.current += 1
      setDragging(true)
    },
    [accept]
  )

  const onDragLeave = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!accept || !hasFiles(event)) {
        return
      }
      depth.current -= 1
      if (depth.current <= 0) {
        reset()
      }
    },
    [accept, reset]
  )

  const onDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) {
        return
      }
      // 不 preventDefault 浏览器会把文件当导航打开
      event.preventDefault()
      event.dataTransfer.dropEffect = accept ? 'copy' : 'none'
    },
    [accept]
  )

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) {
        return
      }
      event.preventDefault()
      reset()
      const files = Array.from(event.dataTransfer?.files ?? [])
      if (accept && files.length > 0) {
        dropRef.current?.(files)
      }
    },
    [accept, reset]
  )

  return { dragging, handlers: { onDragEnter, onDragLeave, onDragOver, onDrop } }
}
