# maxclicks MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official [Model Context Protocol](https://modelcontextprotocol.io) server for the [maxclicks](https://maxclicks.ai) Public API. It lets any MCP client (Claude, Cursor, and others) manage contacts and objects, fire events, send templates, manage webhooks, and trigger workflows in your maxclicks space.

> This server is a from-scratch rewrite over the real maxclicks Public API v1, built on the official `maxclicks` Node SDK. See [docs/DESIGN.md](docs/DESIGN.md) for the architecture, the tool catalog, the authentication phases, and how it is published to integrations.sh.

## Connect

### Hosted (remote)

Streamable HTTP endpoint: `https://mcp.maxclicks.ai/mcp`. Authenticate with a maxclicks API key sent as a bearer token:

```
Authorization: Bearer <your_api_key>
```

Create a key at `https://app.maxclicks.ai/-/settings/developers`. Keys are scoped to one space.

### Local (stdio)

```bash
npx -y maxclicks-mcp
```

With your key in the environment (for Claude Desktop and other stdio clients):

```json
{
  "mcpServers": {
    "maxclicks": {
      "command": "npx",
      "args": ["-y", "maxclicks-mcp"],
      "env": { "MAXCLICKS_API_KEY": "<your_api_key>" }
    }
  }
}
```

## What it can do

Discovery is read only (the API does not create schemas or attributes): use `list_schemas` and `list_attributes` to learn your data model, then write.

- Meta: `whoami`
- Schemas and attributes (read): `list_schemas`, `get_schema`, `list_attributes`, `get_attribute`
- Records: `list_records`, `get_record`, `create_record`, `upsert_record`, `update_record`, `delete_record`, `get_contact_audit_trail`
- Events: `fire_event`, `fire_events_batch`, `get_event`
- Email: `send_template`
- Suppressions (admin key): `create_suppression`, `delete_suppression`
- Webhooks: `list_webhooks`, `get_webhook`, `create_webhook`, `update_webhook`, `delete_webhook`, `rotate_webhook_secret`
- Workflows: `trigger_workflow`

## Development

```bash
npm install
npm run check   # type check
npm run build   # compile to build/
npm run start   # run the streamable-http server
npm run inspector  # open the MCP inspector
```

The server depends on the `maxclicks` SDK. Until it is published to npm, link it locally (`npm pack` in `maxclicks-node` and install the tarball, or a `file:` dependency).

## License

MIT
