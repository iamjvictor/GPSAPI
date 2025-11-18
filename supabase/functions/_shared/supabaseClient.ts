// Shared Supabase admin client for Edge Functions
// Uses service role for privileged operations (never expose to frontend)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export async function getClubByWebhookUUID(uuid: string) {
  const { data, error } = await supabaseAdmin
    .from('clubs')
    .select('id, name, webhook_uuid, catapult_api_key')
    .eq('webhook_uuid', uuid)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
