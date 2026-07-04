import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { EventInput, Maxclicks } from 'maxclicks'
import { jsonResult, runTool } from './helpers.js'
import { schemaField } from './shared.js'

const eventInputField = z
  .record(z.unknown())
  .describe(
    'Flat event payload. Optional `eventId` (deduplication) and `occurredAt` (ISO date-time) plus any custom attribute keys defined on the event schema.'
  )

export function registerEventTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'fire_event',
    {
      title: 'Fire event',
      description:
        'Fire a single trigger event of an event schema. Asynchronous: returns the accepted count, not a stored record.',
      inputSchema: { schema: schemaField, input: eventInputField },
    },
    args => runTool(async () => jsonResult(await client.events.fire(args.schema, args.input as EventInput)))
  )

  server.registerTool(
    'fire_events_batch',
    {
      title: 'Fire events (batch)',
      description: 'Fire up to 500 events of one schema. Returns per-item results and a summary.',
      inputSchema: {
        schema: schemaField,
        events: z.array(z.record(z.unknown())).min(1).max(500).describe('1 to 500 flat event payloads.'),
        onError: z
          .enum(['continue', 'abort'])
          .optional()
          .describe('continue (default) fires all valid items; abort stops at the first invalid item.'),
      },
    },
    args =>
      runTool(async () =>
        jsonResult(await client.events.fireBatch(args.schema, args.events as EventInput[], { onError: args.onError }))
      )
  )

  server.registerTool(
    'get_event',
    {
      title: 'Get event',
      description: 'Fetch one previously-fired event by its platform id.',
      inputSchema: { id: z.string().describe('The event platform id.') },
    },
    args => runTool(async () => jsonResult(await client.events.get(args.id)))
  )
}
