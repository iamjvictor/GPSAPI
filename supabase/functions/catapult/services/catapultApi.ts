// Catapult API abstraction (real + mock switch)

export interface CatapultApiClient {
  getSession(id: string): Promise<any>
  createWebhook(config: { url: string; secret?: string }): Promise<{ id: string }>
  validateApiKey(key: string): Promise<boolean>
}

const BASE_URL = Deno.env.get('CATAPULT_API_BASE') ?? 'https://api.catapultsports.com'
const MOCK_MODE = (Deno.env.get('MOCK_MODE') ?? 'true') === 'true'

export class RealCatapultApi implements CatapultApiClient {
  constructor(private apiKey: string) {}
  async getSession(id: string) {
    const res = await fetch(`${BASE_URL}/sessions/${id}`, { headers: { Authorization: `Bearer ${this.apiKey}` } })
    return res.json()
  }
  async createWebhook(config: { url: string; secret?: string }) {
    // Placeholder - depends on actual Catapult API
    return { id: 'webhook-123' }
  }
  async validateApiKey(key: string) {
    // Could perform a lightweight endpoint call
    return !!key && key.length > 10
  }
}

export class MockCatapultApi implements CatapultApiClient {
  async getSession(id: string) { return { id, mock: true } }
  async createWebhook(config: { url: string }) { return { id: 'mock-webhook' } }
  async validateApiKey(key: string) { return true }
}

export function getCatapultClient(apiKey?: string): CatapultApiClient {
  if (MOCK_MODE) return new MockCatapultApi()
  if (!apiKey) throw new Error('apiKey required in real mode')
  return new RealCatapultApi(apiKey)
}
