import type { AppConfig } from '../App'

const KEY = 'gpsapi.frontend.config.v1'

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { baseUrl: 'http://localhost:3000', apiKey: '', mock: true }
    const parsed = JSON.parse(raw)
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : 'http://localhost:3000',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      mock: typeof parsed.mock === 'boolean' ? parsed.mock : true,
    }
  } catch {
    return { baseUrl: 'http://localhost:3000', apiKey: '', mock: true }
  }
}

export function saveConfig(cfg: AppConfig) {
  const toSave = JSON.stringify(cfg)
  localStorage.setItem(KEY, toSave)
}
