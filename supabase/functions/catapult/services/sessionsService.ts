// Session handling service
import { supabaseAdmin } from '../../_shared/supabaseClient.ts'

export async function upsertSession(club_id: string, external_id: string, started_at: string) {
  const { data: existing, error: selErr } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('club_id', club_id)
    .eq('external_id', external_id)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing) return existing
  const { data, error } = await supabaseAdmin.from('sessions').insert({ club_id, external_id, started_at }).select('*').single()
  if (error) throw error
  return data
}
