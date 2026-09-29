import { ok, badRequest, internalError, unauthorized, forbidden } from '../../_shared/httpResponses.ts'
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
  // Permite apenas POST para criar/atualizar a conexão com Catapult
  if (req.method !== 'POST') return badRequest('method not allowed')

  // Parse and validate input
  let body: Partial<ConnectInput> = {}
  try { body = await req.json() } catch { return badRequest('invalid json') }
  // Token de API da Catapult (obrigatório). "webhook_secret" é opcional (usado para validar assinaturas)
  const apiToken = (body.api_token || (body as any).api_key || '').toString().trim()
  const webhookSecret = (body.webhook_secret || '').toString()
  if (!apiToken) return badRequest('missing api_token')

  try {

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const m = authHeader.match(/^Bearer\s+(.+)$/i)
    const accessToken = m?.[1]
    if (!accessToken) return unauthorized('missing bearer token')

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr || !userData?.user) return unauthorized('invalid token')

    // Busca o relacionamento do usuário com o time e obtém o team_id que usamos como club_id
    const userId = userData.user.id
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('user_and_team')
      .select('team_id')
      .eq('id', userId)
      .maybeSingle()
    if (profErr) return internalError('failed to load profile', profErr)
    if (!profile?.team_id) return forbidden('user has no associated team')
    const club_id = profile.team_id as string


    const client = getCatapultClient(apiToken)
    const isValid = await client.validateApiKey(apiToken)

    const { data: clubRow, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id, name, webhook_uuid')
      .eq('id', club_id)
      .maybeSingle()
    if (clubErr) return internalError('failed to load club', clubErr)
    if (!clubRow) return forbidden('club not found for user')

    let webhook_uuid = clubRow.webhook_uuid || crypto.randomUUID()
    if (!clubRow.webhook_uuid) {
      const { error: updErr } = await supabaseAdmin.from('clubs').update({ webhook_uuid }).eq('id', club_id)
      if (updErr) return internalError('failed to update club', updErr)
    }

    // Encrypt secrets
    // Criptografa o token da Catapult e, se enviado, o segredo do webhook (AES-GCM com ENCRYPTION_KEY)
    const apiTokenEnc = await encryptString(apiToken)
    const webhookSecretEnc = webhookSecret ? await encryptString(webhookSecret) : null

    // Upsert club credentials
    // Persiste/atualiza as credenciais na tabela club_credentials, únicas por (club_id, provider)
    const { error: credErr } = await supabaseAdmin
      .from('club_credentials')
      .upsert({
        club_id,
        provider: 'catapult',
        api_token_encrypted: apiTokenEnc,
        webhook_secret_encrypted: webhookSecretEnc
      }, { onConflict: 'club_id,provider' })
    if (credErr) return internalError('failed to save credentials', credErr)

    const origin = new URL(req.url).origin
    const webhook_url = `${origin}/functions/v1/catapult/webhook/${webhook_uuid}`

    let webhook_registration: 'created' | 'failed' | 'skipped' = 'skipped'
    let webhook_external_id: string | undefined
    let note: string | undefined
    try {
      const res = await client.createWebhook({ url: webhook_url, secret: webhookSecret || undefined })
      webhook_registration = 'created'
      webhook_external_id = res?.id
    } catch (e) {
      webhook_registration = 'failed'
      note = 'Could not auto-register webhook. Please register it manually in Catapult using the provided URL.'
    }

    const integration_status = isValid ? 'connected' : 'pending'
    return ok({ club_id, webhook_url, integration_status, webhook_registration, webhook_external_id, note })
  } catch (e) {
    return internalError('unexpected error', (e as Error).message)
  }
}

const _g: any = globalThis as any
if (_g?.Deno?.serve) _g.Deno.serve(handler)
