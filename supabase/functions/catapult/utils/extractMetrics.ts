// Extracts metrics array from webhook payload
export function extractMetrics(payload: any): any[] {
  if (!payload) return []
  if (Array.isArray(payload.metrics)) return payload.metrics
  return []
}
