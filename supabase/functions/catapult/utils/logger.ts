// Simple logging to webhook_logs (placeholder)
import { supabaseAdmin } from '../../_shared/supabaseClient.ts'

export async function logWebhook(club_id: string, provider: string, message: string, level: 'info'|'error'='info') {
  await supabaseAdmin.from('webhook_logs').insert({ club_id, provider, payload: { message, level, ts: new Date().toISOString() }, status: 'processed' })
}
