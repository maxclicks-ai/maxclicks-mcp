import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Maxclicks } from 'maxclicks'
import { jsonResult, pageResult, runTool } from './helpers.js'
import { limitField, offsetField } from './shared.js'

export function registerSchemaTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_schemas',
    {
      title: 'List schemas',
      description:
        'List the space schemas (contact, object, event) with their ids, slugs, types, and attribute counts. Start here to discover the data model before reading or writing records or firing events.',
      inputSchema: {
        type: z
          .array(z.enum(['contact', 'object', 'event']))
          .optional()
          .describe('Filter by one or more schema types.'),
        limit: limitField,
        offset: offsetField,
      },
    },
    args => runTool(async () => pageResult(await client.schemas.list(args)))
  )

  server.registerTool(
    'get_schema',
    {
      title: 'Get schema',
      description: 'Fetch a single schema by id or slug.',
      inputSchema: { schema: z.string().describe('The schema id or slug.') },
    },
    args => runTool(async () => jsonResult(await client.schemas.get(args.schema)))
  )
}
