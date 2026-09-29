// Basic cryptographic helpers (HMAC validation, AES-GCM encryption)

export async function hmacSha256Hex(secret: string, payload: string | Uint8Array) {
  const enc = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
  const signature = await crypto.subtle.sign('HMAC', key, enc)
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyHmacSha256Hex(secret: string, payload: string, expectedHex: string) {
  const calc = await hmacSha256Hex(secret, payload)
  // timing-safe compare
  if (calc.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < calc.length; i++) diff |= calc.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  return diff === 0
}

// ---- AES-256-GCM helpers ----

function uint8ToBase64(arr: Uint8Array): string {
  let s = ''
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i])
  return btoa(s)
}

function base64ToUint8(b64: string): Uint8Array {
  const s = atob(b64)
  const arr = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i)
  return arr
}

let cachedAesKey: CryptoKey | null = null
async function getAesKey(): Promise<CryptoKey> {
  if (cachedAesKey) return cachedAesKey
  const keyB64 = Deno.env.get('ENCRYPTION_KEY')
  if (!keyB64) throw new Error('ENCRYPTION_KEY missing. Provide a base64-encoded 32-byte key.')
  const raw = base64ToUint8(keyB64)
  if (raw.byteLength !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (base64).')
  cachedAesKey = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  return cachedAesKey
}

// Encrypts a string returning base64(iv|ciphertext). IV is 12 bytes.
export async function encryptString(plaintext: string): Promise<string> {
  const key = await getAesKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder().encode(plaintext)
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc)
  const ct = new Uint8Array(ctBuf)
  const out = new Uint8Array(iv.byteLength + ct.byteLength)
  out.set(iv, 0)
  out.set(ct, iv.byteLength)
  return uint8ToBase64(out)
}

export async function decryptString(payloadB64: string): Promise<string> {
  const key = await getAesKey()
  const buf = base64ToUint8(payloadB64)
  const iv = buf.slice(0, 12)
  const ct = buf.slice(12)
  const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(new Uint8Array(ptBuf))
}
