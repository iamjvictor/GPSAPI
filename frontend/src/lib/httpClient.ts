export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RequestOptions = {
  baseUrl: string
  path: string
  method: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
  mock?: boolean
}

export type HttpResponse<T = unknown> = {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  data: T | null
  durationMs: number
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

function toUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, '')
  const p = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  return `${base}${p}`
}

export async function httpRequest<T = unknown>(opts: RequestOptions): Promise<HttpResponse<T>> {
  const { baseUrl, path, method, headers = {}, body, timeoutMs = 10000, mock } = opts
  const url = toUrl(baseUrl, path)
  const start = performance.now()

  if (mock) {
    // Simple mock by echoing back the request in a predictable shape
    await sleep(400)
    const mockData: any = {
      mock: true,
      url,
      method,
      headers,
      body: body ?? null,
      message: 'Resposta simulada (sem API key)'
    }
    const durationMs = Math.round(performance.now() - start)
    return { ok: true, status: 200, statusText: 'OK (mock)', headers: {}, data: mockData as T, durationMs }
  }

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method === 'GET' || method === 'DELETE' ? undefined : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const text = await resp.text()

    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    const durationMs = Math.round(performance.now() - start)
    const headersObj: Record<string, string> = {}
    resp.headers.forEach((v, k) => (headersObj[k] = v))

    return {
      ok: resp.ok,
      status: resp.status,
      statusText: resp.statusText,
      headers: headersObj,
      data: data as T,
      durationMs,
    }
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start)
    return {
      ok: false,
      status: err?.name === 'AbortError' ? 408 : 0,
      statusText: err?.message || 'Network Error',
      headers: {},
      data: null,
      durationMs,
    }
  } finally {
    clearTimeout(id)
  }
}
