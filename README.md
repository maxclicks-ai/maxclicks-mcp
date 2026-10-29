# maxclicks MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official [Model Context Protocol](https://modelcontextprotocol.io) server for the [maxclicks](https://maxclicks.ai) Public API. It lets any MCP client (Claude, Cursor, and others) manage contacts and objects, fire events, send templates, manage webhooks, and trigger workflows in your maxclicks space.

> This server is a from-scratch rewrite over the real maxclicks Public API v1, built on the official `maxclicks` Node SDK. See [docs/DESIGN.md](docs/DESIGN.md) for the architecture, the tool catalog, the authentication phases, and how it is published to integrations.sh.

## Release preview

This implementation is not published to npm yet. Build from source using the development steps below. The hosted endpoint has not been verified by this release check; the local transports below are the supported preview paths.

## Connect

### Remote (Streamable HTTP): sign in with OAuth

Add the server URL to an MCP client that supports MCP authorization, such as Claude, ChatGPT, Cursor, VS Code or Claude Code:

```bash
claude mcp add --transport http maxclicks https://mcp.maxclicks.ai/mcp
```

The client meets the server's `401`, finds the authorization server from its metadata, identifies itself (by its Client ID Metadata Document URL, or by registering) and opens a maxclicks sign-in page. There you pick one workspace and what the client may do (Read, Write, and Admin for suppressions). The client then holds a short-lived access token for this server and renews it on its own. The connection is listed under Settings, Developers, API keys, and deleting it there disconnects the client.

### Remote (Streamable HTTP): API key

A client that cannot sign in can send a maxclicks API key as a bearer token instead:

```
Authorization: Bearer <your_api_key>
```

Create a key at `https://app.maxclicks.ai/-/settings/developers`. Keys are scoped to one space.

### Self-hosted HTTP

After building, run `node build/index.js --http --host 127.0.0.1`. The local Streamable HTTP endpoint is `http://127.0.0.1:7004/mcp`. Set `MCP_PUBLIC_URL` to the URL clients use (it must equal the platform's configured MCP resource exactly, `http://localhost:7004/mcp` for local development) and `MAXCLICKS_BASE_URL` to the API (`http://localhost:7002/v1` locally); the authorization server is that API's origin.

### Local (stdio)

```bash
MAXCLICKS_API_KEY='<your_api_key>' node /absolute/path/to/maxclicks-mcp/build/index.js
```

With your key in the environment (for Claude Desktop and other stdio clients):

```json
{
  "mcpServers": {
    "maxclicks": {
      "command": "node",
      "args": ["/absolute/path/to/maxclicks-mcp/build/index.js"],
      "env": { "MAXCLICKS_API_KEY": "<your_api_key>" }
    }
  }
}
```

## What it can do

Discovery is read only (the API does not create schemas or attributes): use `list_schemas` and `list_attributes` to learn your data model, then write.

- Meta: `whoami`
- Schemas and attributes (read): `list_schemas`, `get_schema`, `list_attributes`
- Records: `list_records`, `get_record`, `create_record`, `upsert_record`, `update_record`, `delete_record`, `get_record_deletion`, `cancel_record_deletion`, `get_contact_audit_trail`
- Events: `fire_event`, `fire_events_batch`, `get_event_status`, `list_events`
- Templates: `list_templates`, `get_template`, `send_template`
- Broadcasts: `list_broadcasts`, `get_broadcast`, `update_broadcast`, `send_broadcast`, `list_broadcast_runs`, `get_broadcast_metrics`
- Segments: `list_segments`, `get_segment`, `create_segment`, `delete_segment`, `count_segment`, `list_segment_contacts`
- Sending setup (read): `list_domains`, `get_domain`, `list_senders`, `list_topics`, `get_topic`
- Suppressions (admin key): `list_suppressions`, `create_suppression`, `delete_suppression`, `batch_create_suppressions`, `batch_delete_suppressions`
- Webhooks: `list_webhooks`, `get_webhook`, `create_webhook`, `update_webhook`, `delete_webhook`, `rotate_webhook_secret`
- Workflows: `list_workflows`, `get_workflow`, `trigger_workflow`, `pause_workflow`, `unpause_workflow`, `list_workflow_runs`, `get_workflow_run`

Authoring surfaces the Public API deliberately does not expose (schemas, attributes, templates, domains, senders, topics, imports, API keys) stay in the maxclicks app, so there are no tools for them here.

## Development

```bash
npm --prefix ../maxclicks-node ci --ignore-scripts
npm run sdk:link # build and install the sibling SDK tarball without changing manifests
npm run check   # type check
npm run build   # compile to build/
npm run start   # run stdio; requires MAXCLICKS_API_KEY
npm pack        # rebuild and pack the current source
npm run inspector  # open the MCP inspector
```

`sdk:link` also installs this package's other dependencies. The release dependency is `maxclicks@^1.1.0`; the old bundled tarball is not used. Until that SDK is published, a fresh `npm ci` against the public registry cannot resolve it. After publication, refresh the lockfile's SDK registry metadata and validate again. No SDK tarball URL or integrity is claimed in the lockfile before publication. After both packages are published and verified, `npx -y maxclicks-mcp` will use the same default stdio transport.

## License

MIT
