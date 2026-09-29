import { normalizeMetric } from '../_shared/normalization/index.ts'

Deno.test('normalizeMetric converts speed', () => {
  const m = normalizeMetric({
    club_id: 'club1',
    athlete_external_id: 'ath1',
    session_external_id: 'sess1',
    speed_mps: 10,
    distance_m: 1000,
    max_speed_mps: 12,
    timestamp: new Date().toISOString()
  })
  if (m.speed_kmh !== 36) throw new Error('expected 36 km/h')
})
