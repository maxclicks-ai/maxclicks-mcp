const DEFAULT_PUBLIC_URL = 'https://mcp.maxclicks.ai/mcp';

/** The SEP-1649 server card served at `/.well-known/mcp/server-card.json`. */
export const SERVER_CARD = {
  url: process.env.MCP_PUBLIC_URL ?? DEFAULT_PUBLIC_URL,
};
