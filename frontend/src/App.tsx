import { useEffect, useMemo, useState } from 'react'
import { EnvConfig } from './components/EnvConfig'
import { RequestBuilder } from './components/RequestBuilder'
import { loadConfig, saveConfig } from './lib/storage'

export type AppConfig = {
  baseUrl: string
  apiKey: string
  mock: boolean
}

export default function App() {
  const [config, setConfig] = useState<AppConfig>(() => loadConfig())

  useEffect(() => {
    saveConfig(config)
  }, [config])

  const headersFromConfig = useMemo(() => {
    const h: Record<string, string> = {}
    if (config.apiKey) h['Authorization'] = `Bearer ${config.apiKey}`
    return h
  }, [config.apiKey])

  return (
    <div className="container">
      <header>
        <h1>Catapult Tester</h1>
        <p className="subtitle">Interface de testes para avançar sem a API key</p>
      </header>

      <EnvConfig value={config} onChange={setConfig} />

      <section className="card">
        <h2>Request Builder</h2>
        <RequestBuilder
          baseUrl={config.baseUrl}
          defaultHeaders={headersFromConfig}
          mock={config.mock}
        />
      </section>

      <footer>
        <small>
          Dica: as configurações ficam salvas no navegador. Ao obter a API key, basta alterar na parte superior.
        </small>
      </footer>
    </div>
  )
}
