// Handles integration record lifecycle
import { supabaseAdmin } from '../../_shared/supabaseClient.ts'

export async function createIntegration(club_id: string, api_key_encrypted: string) {
  const webhook_uuid = crypto.randomUUID()
  const { data, error } = await supabaseAdmin.from('integrations').insert({
    club_id,
    provider: 'catapult',
    api_key_encrypted,
    webhook_uuid
  }).select('*').single()
  if (error) throw error
  return data
}

export async function getIntegrationByClub(club_id: string) {
  const { data, error } = await supabaseAdmin.from('integrations').select('*').eq('club_id', club_id).eq('provider','catapult').maybeSingle()
  if (error) throw error
  return data
}
