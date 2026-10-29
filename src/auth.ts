import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { Maxclicks, type Me } from 'maxclicks';
import { config } from './config.js';

const BEARER_PREFIX = 'Bearer ';

/** A verified credential: a workspace API key, or an OAuth access token acting as its connection's key. */
export interface Credential {
  readonly token: string;
  /** The key or connection the credential acts as; a session stays bound to it. */
  readonly apiKeyId: string;
  readonly oauth: {
    readonly resource: string;
    readonly scopes: readonly string[];
    readonly expiresAt: string;
  } | null;
}

const verifiedCredentials = new Map<
  string,
  { readonly credential: Credential; readonly verifiedAt: number }
>();

/** The bearer token from `Authorization`, or else from the `X-Maxclicks-API-Key` header. Never from the URL. */
export function extractBearerToken(req: Request): string | null {
  const authorization = req.header('authorization');
  if (authorization)
    return authorization.toLowerCase().startsWith(BEARER_PREFIX.toLowerCase())
      ? authorization.slice(BEARER_PREFIX.length).trim() || null
      : authorization;

  const custom = req.header('x-maxclicks-api-key');
  return custom && custom.length > 0 ? custom : null;
}

/**
 * Verifies a token with `GET /v1/me`, at most once per token per cache window and never past an OAuth token's
 * expiry. Throws `MaxclicksAuthenticationError` for an invalid or expired token.
 */
export async function verifyCredential(
  token: string,
  baseUrl: string | undefined
): Promise<Credential> {
  const cacheKey = createHash('sha256').update(token).digest('hex');
  const now = Date.now();
  const cached = verifiedCredentials.get(cacheKey);
  if (
    cached &&
    now - cached.verifiedAt < config.credentialCacheMilliseconds &&
    (cached.credential.oauth === null || Date.parse(cached.credential.oauth.expiresAt) > now)
  )
    return cached.credential;

  const me = (await new Maxclicks({ apiKey: token, baseUrl }).me()) as Me & {
    oauth?: Credential['oauth'];
  };
  const credential: Credential = { token, apiKeyId: me.apiKey.id, oauth: me.oauth ?? null };
  if (verifiedCredentials.size >= config.maximumCachedCredentials) verifiedCredentials.clear();
  verifiedCredentials.set(cacheKey, { credential, verifiedAt: now });
  return credential;
}
