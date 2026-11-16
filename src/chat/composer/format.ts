/** 人类可读的字节大小；只输出数字 + 单位符号，不含任何自然语言文案。 */
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export const formatSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return ''
  }
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 ? 0 : value < 10 ? 1 : 0
  return `${value.toFixed(digits)} ${UNITS[unit]}`
}

/** 0–1 的进度转成 0–100 的整数，越界值被夹紧，供进度条与 aria-valuenow 使用。 */
export const toPercent = (progress: number | undefined): number => {
  const value = progress ?? 0
  return Math.round(Math.min(1, Math.max(0, value)) * 100)
}
