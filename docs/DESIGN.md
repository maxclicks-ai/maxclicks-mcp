# maxclicks MCP Server: Design

> Status: M1 and M3 implemented. The server is a from-scratch rewrite over the real Public API v1 (the previous server targeted an API that no longer exists). Phase 1 (API-key auth) streamable HTTP + stdio, the tool layer over the `maxclicks` SDK, `/health`, the served `server-card.json`, and Phase 2 (OAuth 2.1 sign-in) are built and tested end to end against the local platform. Hosting (prod Caddy for `mcp.maxclicks.ai`) is the remaining milestone (Section 7).

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

- Remote (streamable HTTP): read the key from the `Authorization: Bearer <key>` header, or else the `X-Maxclicks-API-Key` header. A key in the URL path is not accepted: a URL reaches access logs and browser history, and a client that cannot set headers signs in with OAuth instead (Phase 2).
- Local (stdio): read `MAXCLICKS_API_KEY` from the environment.

Each session holds one `Maxclicks` SDK client built from its key. Every tool call runs through that client, so the caller's space and permissions are enforced by the API, not re-implemented here.

This is exactly the pattern integrations.json advertises (`Authorization: Bearer`), so a Phase 1 server is immediately listable.

### Phase 2: OAuth 2.1 for one-click connect (implemented)

So users connect by signing in instead of pasting a key. The platform runs an OAuth 2.1 authorization server for the Public API and this server; its issuer is the API origin (`https://api.maxclicks.ai`). A client discovers everything from a `401`:

1. Any request without a valid credential answers `401` with `WWW-Authenticate: Bearer resource_metadata="https://mcp.maxclicks.ai/.well-known/oauth-protected-resource/mcp", scope="read write"`.
2. That document (RFC 9728, also served at the root with the origin as its resource) names the authorization server, whose metadata (RFC 8414) advertises Client ID Metadata Documents (`client_id_metadata_document_supported`) and lists dynamic client registration (RFC 7591), authorization with PKCE S256, token and revocation endpoints.
3. The user signs in to maxclicks, picks one workspace and the permissions to grant, and the client receives an access token bound to this server's URL (RFC 8707) plus a rotating refresh token.

What this server enforces:

- Every request is authenticated, never just the first one of a session. A session is bound to the key or connection that opened it and refuses every other credential, so a session id is never a credential.
- A credential is verified with `GET /v1/me`, at most once per minute and never past an OAuth token's expiry. An OAuth token whose `oauth.resource` is not `MCP_PUBLIC_URL` is refused with `error="invalid_token"`, so a token approved for the Public API does not work here.
- Tool calls use the newest token the client presents, so a refreshed token needs no new session.
- API keys keep working through the same header, and stdio still reads `MAXCLICKS_API_KEY`.

Configuration: `MCP_PUBLIC_URL` is this server's canonical URL and must equal the platform's configured MCP resource exactly (`http://localhost:7004/mcp` locally). The authorization server is the origin of `MAXCLICKS_BASE_URL`.

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
- `list_attributes` (per schema)

Records (contacts and objects):
- `list_records`, `get_record`
- `create_record`, `upsert_record`, `update_record`, `delete_record`
- `get_record_deletion`, `cancel_record_deletion`
- `get_contact_audit_trail`

Events:
- `fire_event`, `fire_events_batch`, `get_event_status`, `list_events`

Templates:
- `list_templates`, `get_template`, `send_template`

Broadcasts:
- `list_broadcasts`, `get_broadcast`, `update_broadcast`, `send_broadcast`
- `list_broadcast_runs`, `get_broadcast_metrics`

Segments:
- `list_segments`, `get_segment`, `create_segment`, `delete_segment`
- `count_segment`, `list_segment_contacts`

Sending setup (read):
- `list_domains`, `get_domain`
- `list_senders`
- `list_topics`, `get_topic`

Suppressions (admin key):
- `list_suppressions`, `create_suppression`, `delete_suppression`
- `batch_create_suppressions`, `batch_delete_suppressions`

Webhooks:
- `list_webhooks`, `get_webhook`, `create_webhook`, `update_webhook`, `delete_webhook`, `rotate_webhook_secret`

Workflows:
- `list_workflows`, `get_workflow`, `trigger_workflow`
- `pause_workflow`, `unpause_workflow`
- `list_workflow_runs`, `get_workflow_run`

Conventions:
- Tool inputs are zod schemas mirroring the SDK's typed inputs. `schema` (id or slug) and record ids are explicit arguments.
- Errors: SDK calls throw `MaxclicksError`; each tool catches and returns a structured MCP tool error carrying `status`, `code`, and `message` (never a raw stack).
- Pagination: read tools accept `limit`/`offset` and return the page plus `hasMore`; large sweeps are the caller's job (one page per call) to keep responses bounded.
- The public form and email redirect endpoints are intentionally omitted (they are browser flows, not agent actions).
- Authoring surfaces the Public API does not expose (schema, attribute, template, domain, sender, and topic writes, plus bulk imports and API-key management) have no tools here. They live in the maxclicks app.

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
      templates.ts broadcasts.ts segments.ts domains.ts senders.ts topics.ts
      suppressions.ts webhooks.ts workflows.ts
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
3. M3: Phase 2 OAuth. Done: the platform's authorization server (DCR, RFC 8414, PKCE S256, rotating refresh tokens) plus this server's RFC 9728 metadata, `401` challenge and per-request audience checks.

## 8. Open items

- Which domain hosts `integrations.json`: `maxclicks.ai` (recommended, most discoverable) vs `api.maxclicks.ai`. server-card.json is served by the MCP host regardless.
- Tool granularity: 1:1 with the API (listed above) vs a smaller consolidated set. Start 1:1, consolidate if the tool list feels noisy in practice.
