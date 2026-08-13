import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, offsetField } from './shared.js';

const idField = z.string().describe('The broadcast id.');

const audienceField = z
  .union([
    z.object({ type: z.literal('all') }),
    z.object({ type: z.literal('segment'), segmentId: z.string().describe('The segment id.') }),
  ])
  .describe(
    'The audience. `all` targets every contact in the schema; `segment` targets a segment. A `custom filter` audience is authored in the maxclicks app and cannot be set here.'
  );

const scheduledForField = z
  .string()
  .nullable()
  .optional()
  .describe('ISO 8601 timestamp to send at. Null or omitted leaves the broadcast unscheduled.');

export function registerBroadcastTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_broadcasts',
    {
      title: 'List broadcasts',
      description: "List the space's broadcasts, newest first. Paginated.",
      inputSchema: { limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.broadcasts.list(args)))
  );

  server.registerTool(
    'get_broadcast',
    {
      title: 'Get broadcast',
      description: 'Fetch a broadcast by id.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.broadcasts.get(args.id)))
  );

  server.registerTool(
    'update_broadcast',
    {
      title: 'Update broadcast',
      description:
        'Partially update a broadcast. Rejected once sending has started. An explicit null clears a nullable field.',
      inputSchema: {
        id: idField,
        name: z.string().nullable().optional().describe('Human-readable name.'),
        description: z.string().nullable().optional().describe('Internal description.'),
        audience: audienceField.optional(),
        scheduledFor: scheduledForField,
      },
    },
    (args) =>
      runTool(async () => {
        const { id, ...params } = args;
        return jsonResult(await client.broadcasts.update(id, params));
      })
  );

  server.registerTool(
    'send_broadcast',
    {
      title: 'Send broadcast',
      description:
        'Send a broadcast. Moves it to "send now", or "send at" when scheduledFor is given. Sending itself is asynchronous.',
      inputSchema: {
        id: idField,
        scheduledFor: z
          .string()
          .optional()
          .describe('ISO 8601 timestamp to send at. Omit to send now.'),
      },
    },
    (args) =>
      runTool(async () => {
        const { id, ...params } = args;
        return jsonResult(await client.broadcasts.send(id, params));
      })
  );

  server.registerTool(
    'list_broadcast_runs',
    {
      title: 'List broadcast runs',
      description: "List a broadcast's runs, one reduced record per recipient contact. Paginated.",
      inputSchema: { id: idField, limit: limitField, offset: offsetField },
    },
    (args) =>
      runTool(async () =>
        pageResult(
          await client.broadcasts.listRuns(args.id, { limit: args.limit, offset: args.offset })
        )
      )
  );

  server.registerTool(
    'get_broadcast_metrics',
    {
      title: 'Get broadcast metrics',
      description: "Fetch a broadcast's aggregated email metrics.",
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.broadcasts.getMetrics(args.id)))
  );
}
