import { normalizeSpeed, toZones } from './convert.ts'
import type { NormalizedMetric } from '../types.ts'

export interface RawMetricInput {
  club_id: string
  athlete_external_id: string
  session_external_id: string
  speed_mps?: number
  distance_m?: number
  max_speed_mps?: number
  timestamp: string
}

export function normalizeMetric(raw: RawMetricInput): NormalizedMetric {
  return {
    club_id: raw.club_id,
    athlete_external_id: raw.athlete_external_id,
    session_external_id: raw.session_external_id,
    speed_kmh: raw.speed_mps ? normalizeSpeed(raw.speed_mps) : undefined,
    distance_m: raw.distance_m,
    max_speed_kmh: raw.max_speed_mps ? normalizeSpeed(raw.max_speed_mps) : undefined,
    zones: raw.max_speed_mps ? toZones(raw.max_speed_mps) : undefined,
    collected_at: raw.timestamp
  }
}
