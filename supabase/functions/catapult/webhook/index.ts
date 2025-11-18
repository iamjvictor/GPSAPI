import { badRequest, ok, internalError, unauthorized } from '../../_shared/httpResponses.ts'
import { supabaseAdmin, getClubByWebhookUUID } from '../../_shared/supabaseClient.ts'
import { verifyHmacSha256Hex, decryptString } from '../../_shared/crypto.ts'
import { normalizeMetric } from '../../_shared/normalization/index.ts'

interface WebhookContext {
  club_id: string
  api_key?: string
}

async function parsePath(pathname: string) {
  // Expected path: /functions/v1/catapult/webhook/:uuid
  const parts = pathname.split('/')
  return parts[parts.length - 1]
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return badRequest('method not allowed')
  const url = new URL(req.url)
  const uuid = await parsePath(url.pathname)
  if (!uuid) return badRequest('missing webhook uuid')

  const club = await getClubByWebhookUUID(uuid)
  if (!club) return unauthorized('invalid webhook')

  const rawText = await req.text()
  // Fetch club credentials to obtain webhook secret (encrypted)
  const { data: cred, error: credErr } = await supabaseAdmin
    .from('club_credentials')
    .select('webhook_secret_encrypted')
    .eq('club_id', club.id)
    .eq('provider', 'catapult')
    .maybeSingle()
  if (credErr) return internalError('failed to load credentials', credErr)
  let webhookSecret: string | undefined
  if (cred?.webhook_secret_encrypted) {
    try { webhookSecret = await decryptString(cred.webhook_secret_encrypted) } catch {}
  }
  // Validate signature if header present (placeholder header name)
  const signature = req.headers.get('x-catapult-signature')
  if (signature && webhookSecret) {
    const valid = await verifyHmacSha256Hex(webhookSecret, rawText, signature)
    if (!valid) return unauthorized('invalid signature')
  }

  let payload: any
  try { payload = JSON.parse(rawText) } catch { payload = { raw: rawText } }

  // Persist raw log
  const { error: logError } = await supabaseAdmin.from('webhook_logs').insert({
    club_id: club.id,
    provider: 'catapult',
    payload,
    status: 'pending'
  })
  if (logError) return internalError('failed to persist log', logError)

  // Simplified metric extraction
  const metrics: any[] = Array.isArray(payload.metrics) ? payload.metrics : []
  const normalized = metrics.map(m => normalizeMetric({
    club_id: club.id,
    athlete_external_id: String(m.athlete_id ?? 'unknown'),
    session_external_id: String(m.session_id ?? 'unknown'),
    speed_mps: m.speed_mps,
    distance_m: m.distance_m,
    max_speed_mps: m.max_speed_mps,
    timestamp: m.timestamp || new Date().toISOString()
  }))

  if (normalized.length) {
    const { error: insertError } = await supabaseAdmin.from('metrics').insert(normalized)
    if (insertError) return internalError('failed to insert metrics', insertError)
  }

  await supabaseAdmin.from('webhook_logs').update({ status: 'processed' }).eq('club_id', club.id)

  return ok({ received: true, count: normalized.length })
}

// Bind in Deno runtime without requiring Deno types in Node/TS editors
// deno-lint-ignore no-explicit-any
const _g: any = globalThis as any
if (_g?.Deno?.serve) _g.Deno.serve(handler)
