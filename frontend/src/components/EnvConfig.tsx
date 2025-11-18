import type React from 'react'
import type { AppConfig } from '../App'

type Props = {
  value: AppConfig
  onChange: (next: AppConfig) => void
}

export function EnvConfig({ value, onChange }: Props) {
  return (
    <section className="card">
      <h2>Configuração</h2>
      <div className="grid">
        <label className="field">
          <span>Base URL</span>
          <input
            type="url"
            placeholder="http://localhost:3000"
            value={value.baseUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, baseUrl: e.target.value })}
          />
        </label>
        <label className="field">
          <span>API Key</span>
          <input
            type="text"
            placeholder="(opcional por enquanto)"
            value={value.apiKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, apiKey: e.target.value })}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={value.mock}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, mock: e.target.checked })}
          />
          <span>Mock mode (sem chamadas reais)</span>
        </label>
      </div>
    </section>
  )
}
