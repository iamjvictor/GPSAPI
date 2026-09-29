// Simple validation helpers (can be replaced by zod schemas)

export type Validator<T> = (input: unknown) => input is T

export function requireFields<T extends Record<string, any>>(obj: any, fields: (keyof T)[]): string[] {
  const missing: string[] = []
  for (const f of fields) if (obj == null || obj[f as string] == null) missing.push(String(f))
  return missing
}
