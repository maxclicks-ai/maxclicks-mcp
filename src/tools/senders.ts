import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { pageResult, runTool } from './helpers.js';
import { limitField, offsetField } from './shared.js';

export function registerSenderTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_senders',
    {
      title: 'List senders',
      description: "List the space's saved sender profiles. Paginated.",
      inputSchema: { limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.senders.list(args)))
  );
}
