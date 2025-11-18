// Core shared types
export interface IntegrationRecord {
  id: string
  club_id: string
  provider: 'catapult'
  api_key_encrypted?: string
  webhook_uuid: string
  created_at?: string
}

export interface RawWebhookLog {
  id: string
  club_id: string
  provider: 'catapult'
  received_at: string
  payload: any
  status: 'pending' | 'processed' | 'error'
  error_message?: string
}

export interface NormalizedMetric {
  club_id: string
  session_external_id: string
  athlete_external_id: string
  speed_kmh?: number
  distance_m?: number
  max_speed_kmh?: number
  zones?: Record<string, number>
  collected_at: string
}
