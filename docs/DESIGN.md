# maxclicks MCP Server: Design

> Status: M1 implemented. The server is a from-scratch rewrite over the real Public API v1 (the previous server targeted an API that no longer exists). Phase 1 (API-key auth) streamable HTTP + stdio, all 25 tools over the `maxclicks` SDK, `/health`, and the served `server-card.json` are built and smoke tested. Hosting (discovery files on `maxclicks.ai`, prod Caddy) and Phase 2 (OAuth) are the remaining milestones (Section 7).

## 1. Why a rewrite

The old `src/server.ts` was written against a fictional backend: it called `create-schema`, `create-attribute`, `create-object-schema`, `apiKeys.check`, page/per_page pagination, and named-array responses. None of that exists in the real maxclicks Public API v1, which is read only for schemas and attributes and unifies records under a schema-scoped surface. The rewrite is built entirely on the real contract, through the official `maxclicks` Node SDK.

Ground truth for the API: the `maxclicks-openapi` spec and the `maxclicks-node` SDK. The MCP server is a thin, well-described tool layer over that SDK. It invents no endpoints.

## 2. Goal: be publishable to integrations.sh

integrations.sh is a decentralized registry: you publish discovery metadata on your own domain and your listing is pulled from your site (no PR, no gatekeeper). Its own reference example (Resend) authenticates its MCP surface with a plain API key sent as an `Authorization: Bearer` token, so OAuth is not required to be listed.

Requirements and how we satisfy them:

| Requirement | How maxclicks satisfies it |
| --- | --- |
| `/.well-known/integrations.json` (v3): credentials map + surfaces array | Served on `maxclicks.ai`. Declares an `api_key` credential and two surfaces: `http` (the API, spec = our OpenAPI) and `mcp` (this server). |
| `/.well-known/mcp/server-card.json` (SEP-1649) | Served by this MCP server at `mcp.maxclicks.ai/.well-known/mcp/server-card.json`. |
| MCP transport `streamable-http` | This server exposes streamable HTTP at `mcp.maxclicks.ai/mcp`. |
| `/openapi.json` (optional) | The `maxclicks-openapi` bundle, served on `maxclicks.ai/openapi.json`. |
| `/llms.txt` (optional) | Already served by ops/landing. |
| Strict JSON, `application/json` content-type | All routes set the correct content-type. |

## 3. Authentication

### Phase 1 (ship first): API key, bearer

No backend change. The client presents a maxclicks API key; the server validates it and acts as that key.

- Remote (streamable HTTP): read the key from, in order, the `Authorization: Bearer <key>` header, the `X-Maxclicks-API-Key` header, or a leading URL path segment (`/{key}/mcp`, for hosted setups that cannot set headers). Validate once per session with `sdk.me()`; reject with `401` on failure.
- Local (stdio): read `MAXCLICKS_API_KEY` from the environment.

Each session holds one `Maxclicks` SDK client built from its key. Every tool call runs through that client, so the caller's space and permissions are enforced by the API, not re-implemented here.

This is exactly the pattern integrations.json advertises (`Authorization: Bearer`), so a Phase 1 server is immediately listable.

### Phase 2 (fast follow): OAuth 2.1 for one-click connect

So users connect by logging in instead of pasting a key. We already run a standards OAuth 2.0 Authorization Server for integrations (`/integration/oauth/authorize`, `/integration/oauth/token`, PKCE per RFC 7636, refresh tokens, space-scoped sessions). The gaps for generic MCP clients are bounded:

1. Dynamic Client Registration (RFC 7591): MCP clients self register; today our AS keys clients by a pre-registered `integrationVendor.clientId`. Add a `/register` endpoint that mints ephemeral public clients.
2. Discovery: serve `/.well-known/oauth-protected-resource` (RFC 9728) on `mcp.maxclicks.ai` pointing at the AS, and `/.well-known/oauth-authorization-server` (RFC 8414) on `api.maxclicks.ai` advertising authorize/token/register.
3. Resource and audience: honor the MCP `resource` parameter and issue an MCP-scoped session token (equivalent in scope to an API key for a user in a space), rather than a full vendor `IntegrationSession`.

When Phase 2 lands, flip `server-card.json` to include `authentication: { type: "oauth2", authorization_server: "https://api.maxclicks.ai" }` and add an `oauth2` credential to integrations.json. Phase 1 bearer keys keep working.

## 4. Transports and hosting

- Remote: streamable HTTP at `https://mcp.maxclicks.ai/mcp` (primary; what integrations.sh lists). Deployed as the existing Docker container on port 7004, behind Caddy. The stage host `mcp-stage.maxclicks.ai` already exists; add an `mcp.maxclicks.ai` production block mirroring it.
- Local: stdio via `npx -y maxclicks-mcp`, for Claude Desktop and other stdio clients, keyed by `MAXCLICKS_API_KEY`.
- The HTTP host also serves `GET /health` and `GET /.well-known/mcp/server-card.json`.

Stack: the official MCP TypeScript SDK (`@modelcontextprotocol/sdk`) for the server, transports, and (Phase 2) auth hooks; `express` for the HTTP host and well-known routes; `zod` for tool input schemas; and `maxclicks` for all API calls.

## 5. Tool catalog

The API is schema-scoped, so tool descriptions steer the model to discover the data model first (`list_schemas`, `list_attributes`) before writing records or events. Unlike the old server, there are no create-schema or create-attribute tools: the Public API cannot create them. If a needed attribute does not exist, the user adds it in the app; the tool description says so.

Meta and discovery (read):
- `whoami` (me)
- `list_schemas` (filter by type), `get_schema`
- `list_attributes` (per schema), `get_attribute`

Records (contacts and objects):
- `list_records`, `get_record`
- `create_record`, `upsert_record`, `update_record`, `delete_record`
- `get_contact_audit_trail`

Events:
- `fire_event`, `fire_events_batch`, `get_event`

Email:
- `send_template`

Suppressions (admin key):
- `create_suppression`, `delete_suppression`

Webhooks:
- `list_webhooks`, `get_webhook`, `create_webhook`, `update_webhook`, `delete_webhook`, `rotate_webhook_secret`

Workflows:
- `trigger_workflow`

Conventions:
- Tool inputs are zod schemas mirroring the SDK's typed inputs. `schema` (id or slug) and record ids are explicit arguments.
- Errors: SDK calls throw `MaxclicksError`; each tool catches and returns a structured MCP tool error carrying `status`, `code`, and `message` (never a raw stack).
- Pagination: read tools accept `limit`/`offset` and return the page plus `hasMore`; large sweeps are the caller's job (one page per call) to keep responses bounded.
- The public form and email redirect endpoints are intentionally omitted (they are browser flows, not agent actions).

## 6. Repo layout (target)

```
maxclicks-mcp/
  src/
    index.ts              entry: parse args, pick transport
    server.ts             build the McpServer, register tools
    auth.ts               resolve an API key -> validated Maxclicks client
    transports/
      http.ts             streamable HTTP + express + health + well-known
      stdio.ts            stdio transport
    tools/
      meta.ts schemas.ts attributes.ts records.ts events.ts
      templates.ts suppressions.ts webhooks.ts workflows.ts
      index.ts            register-all
    serverCard.ts         server-card.json payload
  discovery/              draft manifests for the maxclicks.ai domain (review copies)
    integrations.json
    mcp/server-card.json
  docs/DESIGN.md
  Dockerfile .github/ scripts/ package.json README.md LICENSE tsconfig.json
```

The `maxclicks` SDK is a normal dependency. Until it is published to npm, dev uses a packed tarball or a `file:` link, and the Dockerfile installs the same. Deployment reuses the current Docker + Caddy setup; only the container entry (`build/index.js`) and the `mcp.maxclicks.ai` Caddy block change.

## 7. Milestones

1. M1: Phase 1 server. Streamable HTTP + stdio, all tools over the SDK, bearer/env auth, `/health`, `/.well-known/mcp/server-card.json`. Publish `npx maxclicks-mcp`.
2. M2: Discovery on the domain. Add `/.well-known/integrations.json`, `/openapi.json`, and confirm `/llms.txt` on `maxclicks.ai`; run the integrations.sh "Map integration surface" step to go live.
3. M3: Phase 2 OAuth. DCR + RFC 9728/8414 + MCP-scoped tokens on the existing `oauthService`; flip the metadata to advertise OAuth.

## 8. Open items

- Which domain hosts `integrations.json`: `maxclicks.ai` (recommended, most discoverable) vs `api.maxclicks.ai`. server-card.json is served by the MCP host regardless.
- Tool granularity: 1:1 with the API (listed above) vs a smaller consolidated set. Start 1:1, consolidate if the tool list feels noisy in practice.
- Whether to keep the legacy `/{key}/mcp` URL-path auth for hosted clients that cannot set headers.
