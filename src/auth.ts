import type { Request } from 'express'
import { Maxclicks } from 'maxclicks'

const BEARER_PREFIX = 'Bearer '
const VALIDATION_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 1000

const lastValidatedAt = new Map<string, number>()

/**
 * Resolves the caller's API key from a request: a leading URL path segment
 * (`/{key}/mcp`), then the `Authorization: Bearer` header, then the
 * `X-Maxclicks-API-Key` header. Returns `null` when none is present.
 */
export function extractApiKey(req: Request): string | null {
  const pathKey = typeof req.params.apiKey === 'string' && req.params.apiKey.length > 0 ? req.params.apiKey : null
  if (pathKey) return pathKey

  const authorization = req.header('authorization')
  if (authorization)
    return authorization.toLowerCase().startsWith(BEARER_PREFIX.toLowerCase())
      ? authorization.slice(BEARER_PREFIX.length)
      : authorization

  const custom = req.header('x-maxclicks-api-key')
  return custom && custom.length > 0 ? custom : null
}

/**
 * Builds a `Maxclicks` client for an API key, validating it via `me()` at most
 * once per key per TTL window (throws `MaxclicksAuthenticationError` on a bad key).
 */
export async function resolveClient(apiKey: string, baseUrl?: string): Promise<Maxclicks> {
  const client = new Maxclicks({ apiKey, baseUrl })
  const now = Date.now()
  const last = lastValidatedAt.get(apiKey)
  if (last === undefined || now - last > VALIDATION_TTL_MS) {
    await client.me()
    if (lastValidatedAt.size >= MAX_CACHE_ENTRIES) lastValidatedAt.clear()
    lastValidatedAt.set(apiKey, now)
  }
  return client
}
