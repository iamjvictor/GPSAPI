// Imports de utilidades e serviços compartilhados
// - httpResponses: respostas padronizadas HTTP
// - supabaseClient: acesso admin ao banco + helper para buscar clube via webhook_uuid
// - crypto: verificação de assinatura HMAC + descriptografia do segredo
// - normalization: converte métricas brutas em estrutura normalizada (velocidade, zonas, etc.)
// - athletesService / sessionsService: garantem existência de atleta e sessão (relacional)
import { badRequest, ok, internalError, unauthorized } from '../../_shared/httpResponses.ts'
import { supabaseAdmin, getClubByWebhookUUID } from '../../._shared/supabaseClient.ts'
import { verifyHmacSha256Hex, decryptString } from '../../._shared/crypto.ts'
import { normalizeMetric } from '../../._shared/normalization/index.ts'
import { ensureAthlete } from '../services/athletesService.ts'
import { upsertSession } from '../.services/sessionsService.ts'

// Interface (não usada diretamente aqui) ilustrando possíveis campos contextuais
interface WebhookContext {
  club_id: string
  api_key?: string
}

// Extrai o UUID do webhook da parte final da URL
// Ex: /functions/v1/catapult/webhook/<webhook_uuid>
async function parsePath(pathname: string) {
  const parts = pathname.split('/')
  return parts[parts.length - 1]
}

export default async function handler(req: Request): Promise<Response> {
  // 1. Garante que o método é POST (webhooks devem enviar POST)
  if (req.method !== 'POST') return badRequest('method not allowed')

  // 2. Captura UUID do webhook a partir da URL
  const url = new URL(req.url)
  const uuid = await parsePath(url.pathname)
  if (!uuid) return badRequest('missing webhook uuid')

  // 3. Busca o clube associado ao UUID do webhook
  const club = await getClubByWebhookUUID(uuid)
  if (!club) return unauthorized('invalid webhook')

  // 4. Lê corpo bruto (texto) para possível validação HMAC
  const rawText = await req.text()

  // 5. Recupera credenciais (segredo criptografado) para validar assinatura
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
  // 6. Valida assinatura HMAC (se o cabeçalho estiver presente)
  const signature = req.headers.get('x-catapult-signature')
  if (signature && webhookSecret) {
    const valid = await verifyHmacSha256Hex(webhookSecret, rawText, signature)
    if (!valid) return unauthorized('invalid signature')
  }

  // 7. Tenta parsear JSON; se falhar, guarda como texto bruto
  let payload: any
  try { payload = JSON.parse(rawText) } catch { payload = { raw: rawText } }

  // 8. Persiste log bruto para auditoria antes de qualquer processamento
  const { error: logError } = await supabaseAdmin.from('webhook_logs').insert({
    club_id: club.id,
    provider: 'catapult',
    payload,
    status: 'pending'
  })
  if (logError) return internalError('failed to persist log', logError)

  // 9. Extrai array de métricas (suporta diferentes formatos: payload.metrics ou payload.data.metrics)
  const rawMetrics: any[] = Array.isArray(payload.metrics)
    ? payload.metrics
    : Array.isArray(payload.data?.metrics)
      ? payload.data.metrics
      : []

  // 10. Cache local para evitar múltiplos selects do mesmo atleta/sessão no mesmo lote
  const athleteCache = new Map<string, any>()
  const sessionCache = new Map<string, any>()

  const enriched: any[] = []
  for (const m of rawMetrics) {
    // 11. Determina IDs externos de atleta e sessão
    const athleteExternal = String(m.athlete_id ?? m.athlete_external_id ?? 'unknown')
    const sessionExternal = String(m.session_id ?? m.session_external_id ?? 'unknown')
    const ts = m.timestamp || new Date().toISOString()

    // 12. Garante existência do atleta (insere se não existir) usando cache
    let athleteRow = athleteCache.get(athleteExternal)
    if (!athleteRow) {
      try {
        athleteRow = await ensureAthlete(club.id, athleteExternal, m.athlete_name)
        athleteCache.set(athleteExternal, athleteRow)
      } catch (e) {
        return internalError('failed ensureAthlete', (e as Error).message)
      }
    }

    // 13. Garante existência da sessão (upsert) usando cache
    let sessionRow = sessionCache.get(sessionExternal)
    if (!sessionRow) {
      // Derive a started_at (prefer session_start / started_at / timestamp)
      const startedAt = m.session_start || m.started_at || ts
      try {
        sessionRow = await upsertSession(club.id, sessionExternal, startedAt)
        sessionCache.set(sessionExternal, sessionRow)
      } catch (e) {
        return internalError('failed upsertSession', (e as Error).message)
      }
    }

    // 14. Normaliza métrica (velocidade convertida, zonas, etc.) mantendo IDs externos para rastreio
    const base = normalizeMetric({
      club_id: club.id,
      athlete_external_id: athleteExternal,
      session_external_id: sessionExternal,
      speed_mps: m.speed_mps,
      distance_m: m.distance_m,
      max_speed_mps: m.max_speed_mps,
      timestamp: ts
    })
    
    enriched.push({
      ...base,
      athlete_id: athleteRow.id,   
      session_id: sessionRow.id     
    })
  }

  // 16. Insere lote de métricas enriquecidas
  if (enriched.length) {
    const { error: insertError } = await supabaseAdmin.from('metrics').insert(enriched)
    if (insertError) return internalError('failed to insert metrics', insertError)
  }

  // 17. Atualiza log para status 'processed'
  await supabaseAdmin.from('webhook_logs').update({ status: 'processed' }).eq('club_id', club.id)

  // 18. Retorna quantidade de métricas processadas
  return ok({ received: true, count: enriched.length })
}

// 19. Bind para execução no ambiente Deno (Edge Functions)
// deno-lint-ignore no-explicit-any
const _g: any = globalThis as any
if (_g?.Deno?.serve) _g.Deno.serve(handler)
