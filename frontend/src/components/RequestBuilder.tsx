import { useMemo, useState } from 'react'
import { httpRequest, type HttpMethod } from '../lib/httpClient'

type Props = {
  baseUrl: string
  defaultHeaders?: Record<string, string>
  mock?: boolean
}

type HeaderKV = { id: string; key: string; value: string }

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function RequestBuilder({ baseUrl, defaultHeaders = {}, mock = true }: Props) {
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [path, setPath] = useState<string>('')
  const [headers, setHeaders] = useState<HeaderKV[]>(() =>
    Object.entries(defaultHeaders).map(([k, v], i) => ({ id: String(i), key: k, value: v }))
  )
  const [bodyText, setBodyText] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<any>(null)

  // Keep default headers in sync if parent changes (e.g., apiKey)
  useMemo(() => {
    const existingKeys = new Set(headers.map((h: HeaderKV) => h.key.toLowerCase()))
    const toAdd: HeaderKV[] = []
    for (const [k, v] of Object.entries(defaultHeaders)) {
      if (!existingKeys.has(k.toLowerCase())) toAdd.push({ id: crypto.randomUUID(), key: k, value: v })
    }
    if (toAdd.length) setHeaders((prev: HeaderKV[]) => [...toAdd, ...prev])
  }, [defaultHeaders, headers])

  const parsedBody = useMemo(() => {
    if (!bodyText.trim()) return undefined
    try {
      return JSON.parse(bodyText)
    } catch {
      return bodyText // send as text if not valid JSON
    }
  }, [bodyText])

  function updateHeader(id: string, patch: Partial<HeaderKV>) {
    setHeaders((prev: HeaderKV[]) => prev.map((h: HeaderKV) => (h.id === id ? { ...h, ...patch } : h)))
  }
  function addHeader() {
    setHeaders((prev: HeaderKV[]) => [{ id: crypto.randomUUID(), key: '', value: '' }, ...prev])
  }
  function removeHeader(id: string) {
    setHeaders((prev: HeaderKV[]) => prev.filter((h: HeaderKV) => h.id !== id))
  }

  async function send() {
    setSending(true)
    setResponse(null)
    const hdrs: Record<string, string> = {}
    for (const h of headers) if (h.key) hdrs[h.key] = h.value

    const res = await httpRequest({ baseUrl, path, method, headers: hdrs, body: parsedBody, timeoutMs: 15000, mock })
    setResponse(res)
    setSending(false)
  }

  return (
    <div className="request-builder">
      <div className="row">
        <select value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)}>
          {METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input className="path" placeholder="/v1/resource" value={path} onChange={(e) => setPath(e.target.value)} />
        <button className="primary" disabled={sending} onClick={send}>{sending ? 'Enviando…' : 'Enviar'}</button>
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h3>Headers</h3>
            <button onClick={addHeader}>+ Adicionar</button>
          </div>
          <div className="headers">
            {headers.map(h => (
              <div className="header-row" key={h.id}>
                <input placeholder="Header" value={h.key} onChange={(e) => updateHeader(h.id, { key: e.target.value })} />
                <input placeholder="Valor" value={h.value} onChange={(e) => updateHeader(h.id, { value: e.target.value })} />
                <button className="ghost" onClick={() => removeHeader(h.id)}>×</button>
              </div>
            ))}
            {headers.length === 0 && <div className="muted">Nenhum header</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Body (JSON ou texto)</h3></div>
          <textarea rows={12} placeholder='{"exemplo": true}' value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
        </div>
      </div>

      {response && (
        <div className="panel">
          <div className="panel-header">
            <h3>Resposta</h3>
            <span className={`badge ${response.ok ? 'ok' : 'err'}`}>{response.status} {response.statusText}</span>
            <span className="muted">{response.durationMs} ms</span>
          </div>
          <pre className="code-block">{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
