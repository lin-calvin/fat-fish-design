/** 演示用设置：只存 localStorage，不含任何服务端逻辑 */
export interface AppSettings {
  apiKey: string
  model: string
  useRealApi: boolean
}

const STORAGE_KEY = 'ffd:settings'
const DEFAULTS: AppSettings = { apiKey: '', model: 'deepseek-flash', useRealApi: false }

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULTS.apiKey,
      model: typeof parsed.model === 'string' && parsed.model !== '' ? parsed.model : DEFAULTS.model,
      useRealApi: parsed.useRealApi === true,
    }
  } catch {
    return DEFAULTS
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // 隐私模式或配额耗尽：忽略，不影响当前会话
  }
}
