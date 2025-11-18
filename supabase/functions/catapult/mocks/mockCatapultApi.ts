// Mock implementation useful for local tests without real Catapult token
export async function fetchMockSession(id: string) {
  return { id, name: 'Mock Session', started_at: new Date().toISOString(), mock: true }
}
