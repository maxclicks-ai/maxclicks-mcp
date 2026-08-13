import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { registerAllTools } from './tools/index.js';
import { SERVER_NAME, VERSION } from './version.js';

const INSTRUCTIONS = `maxclicks lets you manage contacts, objects, events, email, webhooks, and workflows in a single space.

The data model is schema-based: every record and event belongs to a schema (a contact, object, or event schema). Before creating or updating records or firing events, call list_schemas and list_attributes to discover the available schemas (by id or slug) and their attribute keys.

Schemas and attributes are read only through this API. If a needed attribute does not exist, ask the user to add it in the maxclicks app; do not assume you can create it.

Records are flat: set base fields and any custom attribute keys at the top level. Contacts identify by id, then userId, then email, then phone; objects by id, then externalId. Use upsert_record to create-or-update, or create_record to fail on an existing identifier.`;

/** Builds a fully configured MCP server whose tools act as the given API client. */
export function buildServer(client: Maxclicks): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: VERSION },
    { instructions: INSTRUCTIONS }
  );
  registerAllTools(server, client);
  return server;
}
