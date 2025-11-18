import { supabaseAdmin } from '../../_shared/supabaseClient.ts'
import { ok, internalError } from '../../_shared/httpResponses.ts'

export default async function handler(_req: Request): Promise<Response> {
  try {
    // Find failed webhooks
    const { data, error } = await supabaseAdmin
      .from('webhook_logs')
      .select('*')
      .eq('status', 'error')
      .limit(50)
    if (error) return internalError('query error', error)

    // Placeholder retry logic
    for (const row of data) {
      // Attempt reprocess (not implemented)
      await supabaseAdmin.from('webhook_logs').update({ status: 'pending' }).eq('id', row.id)
    }

    return ok({ retried: data.length })
  } catch (e) {
    return internalError('cron failure', (e as Error).message)
  }
}

// deno-lint-ignore no-explicit-any
const _g: any = globalThis as any
if (_g?.Deno?.serve) _g.Deno.serve(handler)
