const DEFAULT_PUBLIC_URL = 'https://mcp.maxclicks.ai/mcp';
const DEFAULT_API_BASE_URL = 'https://api.maxclicks.ai/v1';

/** Settings the HTTP transport and the discovery documents share. */
export const config = {
  /** The canonical URL clients connect to; an OAuth token must have been issued for exactly this resource. */
  publicUrl: process.env.MCP_PUBLIC_URL ?? DEFAULT_PUBLIC_URL,
  defaultApiBaseUrl: DEFAULT_API_BASE_URL,
  documentationUrl: 'https://docs.maxclicks.ai/ai/mcp',
  scopes: {
    supported: ['read', 'write', 'admin'],
    /** What a client asks for unless it needs more; `admin` only manages suppressions. */
    challenged: ['read', 'write'],
  },
  credentialCacheMilliseconds: 60 * 1000,
  maximumCachedCredentials: 1000,
  metadataCacheSeconds: 3600,
} as const;
