import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { pageResult, runTool } from './helpers.js';
import { limitField, offsetField, schemaField } from './shared.js';

export function registerAttributeTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_attributes',
    {
      title: 'List attributes',
      description:
        'List a schema attributes (base and custom) so you know which keys a record or event can set. Attributes are read only through this API: if a needed attribute does not exist, ask the user to add it in the maxclicks app.',
      inputSchema: { schema: schemaField, limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.attributes.list(args.schema, args)))
  );
}
