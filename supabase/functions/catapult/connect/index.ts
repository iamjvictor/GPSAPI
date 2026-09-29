import { ok, badRequest, internalError } from '../../_shared/httpResponses.ts'
import { supabaseAdmin } from '../../_shared/supabaseClient.ts'
import { encryptString } from '../../_shared/crypto.ts'
import { getCatapultClient } from '../services/catapultApi.ts'

// Expected JSON body for connect
interface ConnectInput {
  club_name: string
  api_token: string
  webhook_secret?: string
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return badRequest('method not allowed')

  // Parse and validate input
  let body: Partial<ConnectInput> = {}
  try { body = await req.json() } catch { return badRequest('invalid json') }
  const clubName = (body.club_name || '').toString().trim()
  const apiToken = (body.api_token || (body as any).api_key || '').toString().trim()
  const webhookSecret = (body.webhook_secret || '').toString()
  if (!clubName) return badRequest('missing club_name')
  if (!apiToken) return badRequest('missing api_token')

  try {
    // Validate token (optional but recommended)
    const client = getCatapultClient(apiToken)
    const isValid = await client.validateApiKey(apiToken)

    // Find or create club
    const { data: existing, error: selErr } = await supabaseAdmin
      .from('clubs')
      .select('id, name, webhook_uuid')
      .eq('name', clubName)
      .maybeSingle()
    if (selErr) return internalError('failed to query club', selErr)

    let club_id: string
    let webhook_uuid = existing?.webhook_uuid || crypto.randomUUID()
    if (existing) {
      club_id = existing.id
      if (!existing.webhook_uuid) {
        const { error: updErr } = await supabaseAdmin.from('clubs').update({ webhook_uuid }).eq('id', club_id)
        if (updErr) return internalError('failed to update club', updErr)
      }
    } else {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('clubs')
        .insert({ name: clubName, webhook_uuid })
        .select('id, webhook_uuid')
        .single()
      if (insErr) return internalError('failed to create club', insErr)
      club_id = inserted.id
      webhook_uuid = inserted.webhook_uuid
    }

    // Encrypt secrets
    const apiTokenEnc = await encryptString(apiToken)
    const webhookSecretEnc = webhookSecret ? await encryptString(webhookSecret) : null

    // Upsert club credentials
    const { error: credErr } = await supabaseAdmin
      .from('club_credentials')
      .upsert({
        club_id,
        provider: 'catapult',
        api_token_encrypted: apiTokenEnc,
        webhook_secret_encrypted: webhookSecretEnc
      }, { onConflict: 'club_id,provider' })
    if (credErr) return internalError('failed to save credentials', credErr)

    // Build webhook URL from request origin
    const origin = new URL(req.url).origin
    const webhook_url = `${origin}/functions/v1/catapult/webhook/${webhook_uuid}`

    const integration_status = isValid ? 'connected' : 'pending'
    return ok({ club_id, webhook_url, integration_status })
  } catch (e) {
    return internalError('unexpected error', (e as Error).message)
  }
}

// Supabase Edge Functions export pattern without direct Deno reference
// deno-lint-ignore no-explicit-any
const _g: any = globalThis as any
if (_g?.Deno?.serve) _g.Deno.serve(handler)
