import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpeechPort } from '../../chat-protocol/types'

/**
 * 语音输入的按钮态管理。
 * 组件库不实现录音，只负责 start / stop 与「录音中」这个视图状态：
 * 转写结果由 port 通过回调交回，再交给调用方写进 text。
 */
export const useSpeech = (
  speech: SpeechPort | undefined,
  onTranscript: (text: string) => void
): { recording: boolean; toggle: () => void } => {
  const [recording, setRecording] = useState(false)
  const recordingRef = useRef(false)
  const speechRef = useRef(speech)
  const transcriptRef = useRef(onTranscript)
  speechRef.current = speech
  transcriptRef.current = onTranscript

  const set = useCallback((next: boolean) => {
    recordingRef.current = next
    setRecording(next)
  }, [])

  const toggle = useCallback(() => {
    const port = speechRef.current
    if (!port) {
      return
    }
    if (recordingRef.current) {
      set(false)
      port.stop()
      return
    }
    set(true)
    port.start((text) => {
      // 迟到回调不应把已经重新开始的录音关掉，只认当前这一次
      if (!recordingRef.current) {
        return
      }
      set(false)
      if (text) {
        transcriptRef.current(text)
      }
    })
  }, [set])

  // speech 端口被换掉时释放上一路录音
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current = false
        speechRef.current?.stop()
      }
    }
  }, [speech])

  return { recording, toggle }
}
