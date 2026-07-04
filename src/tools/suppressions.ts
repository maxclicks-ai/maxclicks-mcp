import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Maxclicks } from 'maxclicks'
import { jsonResult, runTool } from './helpers.js'

export function registerSuppressionTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'create_suppression',
    {
      title: 'Create suppression',
      description: 'Suppress an email identifier for the space (do-not-contact). Requires an admin API key.',
      inputSchema: {
        identifier: z.string().describe('The email address to suppress.'),
        reason: z.enum(['manual', 'legal']),
        notes: z.string().nullable().optional(),
      },
    },
    args => runTool(async () => jsonResult(await client.suppressions.create(args)))
  )

  server.registerTool(
    'delete_suppression',
    {
      title: 'Delete suppression',
      description: 'Remove a suppression by id, re-allowing communication to that identifier. Requires an admin API key.',
      inputSchema: { id: z.string().describe('The suppression id.') },
    },
    args => runTool(async () => jsonResult(await client.suppressions.delete(args.id)))
  )
}
