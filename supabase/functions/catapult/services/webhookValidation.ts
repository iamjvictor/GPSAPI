// Webhook validation logic
import { verifyHmacSha256Hex } from '../../_shared/crypto.ts'

export async function validateWebhookSignature(secret: string | undefined, rawBody: string, signatureHeader: string | null) {
  if (!secret || !signatureHeader) return true // allow if no secret configured
  return verifyHmacSha256Hex(secret, rawBody, signatureHeader)
}
