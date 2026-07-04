# Discovery manifests (draft)

Review copies of the metadata files that make maxclicks listable on integrations.sh.

Where each file is served in production:

| File | Served by | Public URL |
| --- | --- | --- |
| `integrations.json` | ops/landing | `https://maxclicks.ai/.well-known/integrations.json` |
| `mcp/server-card.json` | this MCP server | `https://mcp.maxclicks.ai/.well-known/mcp/server-card.json` |
| `openapi.json` (from `maxclicks-openapi`) | ops/landing | `https://maxclicks.ai/openapi.json` |
| `llms.txt` | ops/landing (already live) | `https://maxclicks.ai/llms.txt` |

All must return strict JSON with an `application/json` content-type (an HTML 404 or an error object is rejected by the registry).

Phase 2 (OAuth) additions, when ready:

- `mcp/server-card.json` gains `"authentication": { "type": "oauth2", "authorization_server": "https://api.maxclicks.ai" }`.
- `integrations.json` gains an `oauth2` credential and the MCP surface references it.
- `https://mcp.maxclicks.ai/.well-known/oauth-protected-resource` (RFC 9728) and `https://api.maxclicks.ai/.well-known/oauth-authorization-server` (RFC 8414) are published.

Verify (from the publishing checklist):

```bash
curl -sS https://maxclicks.ai/.well-known/integrations.json | jq .
curl -sS https://maxclicks.ai/openapi.json | jq .
curl -sS https://mcp.maxclicks.ai/.well-known/mcp/server-card.json | jq .
```
