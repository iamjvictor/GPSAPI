// Standardized HTTP responses for Edge Functions
export function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  })
}

export const ok = (data: unknown) => json(200, { success: true, data })
export const created = (data: unknown) => json(201, { success: true, data })
export const badRequest = (message: string, details?: unknown) => json(400, { success: false, error: message, details })
export const unauthorized = (message = 'unauthorized') => json(401, { success: false, error: message })
export const forbidden = (message = 'forbidden') => json(403, { success: false, error: message })
export const notFound = (message = 'not found') => json(404, { success: false, error: message })
export const internalError = (message = 'internal error', details?: unknown) => json(500, { success: false, error: message, details })
