import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, offsetField } from './shared.js';

const idField = z.string().describe('The topic id.');

export function registerTopicTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_topics',
    {
      title: 'List topics',
      description: 'List the space communication topics. Paginated.',
      inputSchema: { limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.topics.list(args)))
  );

  server.registerTool(
    'get_topic',
    {
      title: 'Get topic',
      description: 'Fetch a communication topic by id.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.topics.get(args.id)))
  );
}
