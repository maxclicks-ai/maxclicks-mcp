import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Maxclicks } from 'maxclicks'
import { jsonResult, pageResult, runTool } from './helpers.js'
import { limitField, offsetField, schemaField } from './shared.js'

export function registerAttributeTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_attributes',
    {
      title: 'List attributes',
      description:
        'List a schema attributes (base and custom) so you know which keys a record or event can set. Attributes are read only through this API: if a needed attribute does not exist, ask the user to add it in the maxclicks app.',
      inputSchema: { schema: schemaField, limit: limitField, offset: offsetField },
    },
    args => runTool(async () => pageResult(await client.attributes.list(args.schema, args)))
  )

  server.registerTool(
    'get_attribute',
    {
      title: 'Get attribute',
      description: 'Fetch a single attribute by base:<key>, a custom attribute id, or a raw key.',
      inputSchema: {
        schema: schemaField,
        attribute: z.string().describe('base:<key>, a custom attribute id, or a raw attribute key.'),
      },
    },
    args => runTool(async () => jsonResult(await client.attributes.get(args.schema, args.attribute)))
  )
}
