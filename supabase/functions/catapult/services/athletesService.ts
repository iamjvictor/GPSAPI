// Athlete mapping service
import { supabaseAdmin } from '../../_shared/supabaseClient.ts'

export async function ensureAthlete(club_id: string, external_id: string, name?: string) {
  const { data: existing, error: selErr } = await supabaseAdmin
    .from('athletes')
    .select('*')
    .eq('club_id', club_id)
    .eq('external_id', external_id)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing) return existing

  const { data, error } = await supabaseAdmin.from('athletes').insert({ club_id, external_id, name }).select('*').single()
  if (error) throw error
  return data
}
