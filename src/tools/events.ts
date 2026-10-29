import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EventInput, Maxclicks } from 'maxclicks';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, schemaField } from './shared.js';

const eventInputField = z
  .record(z.unknown())
  .describe(
    'Flat event payload: optional `eventId` (your occurrence id; reuse it with identical input to retry safely), `occurredAt` (ISO date-time), `contactId` or `objectId` (the subject), plus any custom attribute keys defined on the event schema.'
  );

export function registerEventTools(server: McpServer, client: () => Maxclicks): void {
  server.registerTool(
    'fire_event',
    {
      title: 'Fire event',
      description:
        'Fire one event of an event schema. Acceptance is durable but is not readiness: the receipt carries the event `id` and `readinessAtAcceptance`. Read get_event_status with that `id` to learn when the event is ready.',
      inputSchema: { schema: schemaField, input: eventInputField },
    },
    (args) =>
      runTool(async () =>
        jsonResult(await client().events.fire(args.schema, args.input as EventInput))
      )
  );

  server.registerTool(
    'get_event_status',
    {
      title: 'Get event status',
      description:
        "Read an accepted event's readiness by the `id` from its fire receipt: pending, ready, failed or outcome_unknown. failed and outcome_unknown are final for that occurrence.",
      inputSchema: {
        schema: schemaField,
        id: z.string().describe('The event `id` from the fire receipt.'),
      },
    },
    (args) => runTool(async () => jsonResult(await client().events.status(args.schema, args.id)))
  );

  server.registerTool(
    'fire_events_batch',
    {
      title: 'Fire events (batch)',
      description: 'Fire up to 500 events of one schema. Returns per-item results and a summary.',
      inputSchema: {
        schema: schemaField,
        events: z
          .array(z.record(z.unknown()))
          .min(1)
          .max(500)
          .describe('1 to 500 flat event payloads.'),
        onError: z
          .enum(['continue', 'abort'])
          .optional()
          .describe(
            'continue (default) fires all valid items; abort stops at the first invalid item.'
          ),
      },
    },
    (args) =>
      runTool(async () =>
        jsonResult(
          await client().events.fireBatch(args.schema, args.events as EventInput[], {
            onError: args.onError,
          })
        )
      )
  );

  server.registerTool(
    'list_events',
    {
      title: 'List events',
      description:
        "Read an event schema's history, newest first. Cursor-paginated: follow `pagination.nextCursor` for the next page.",
      inputSchema: {
        schema: schemaField,
        from: z
          .string()
          .optional()
          .describe('Start of the time range (ISO 8601). Defaults to the 7 days before `to`.'),
        to: z.string().optional().describe('End of the time range (ISO 8601). Defaults to now.'),
        cursor: z
          .string()
          .optional()
          .describe("Opaque cursor from a previous page's `pagination.nextCursor`."),
        limit: limitField,
      },
    },
    (args) => runTool(async () => pageResult(await client().events.list(args)))
  );
}
