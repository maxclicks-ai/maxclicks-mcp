import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, offsetField } from './shared.js';

const triggerField = z.enum([
  'contact upserted',
  'contact deleted',
  'object upserted',
  'object deleted',
  'event fired',
  'email event',
]);

const emailEventTypesField = z
  .array(
    z.enum([
      'scheduled',
      'sending failed',
      'sent',
      'rejected',
      'unsubscribed',
      'bounced',
      'complained',
      'delivered',
      'opened',
      'clicked',
      'delivery delayed',
    ])
  )
  .describe('Required and non-empty only when trigger is "email event".');

const conditionField = z
  .union([
    z.object({ type: z.literal('none') }),
    z.object({ type: z.literal('segment'), segmentId: z.string() }),
    z.object({
      type: z.literal('custom filter'),
      requirements: z
        .string()
        .describe('Natural-language description of the filter criteria.'),
    }),
  ])
  .describe(
    'Delivery condition. Defaults to { type: "none" }. A "custom filter" is AI-generated from requirements (billed, "ai" rate bucket).'
  );

const idField = z.string().describe('The webhook id.');

export function registerWebhookTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_webhooks',
    {
      title: 'List webhooks',
      description: 'List the space outgoing webhooks, newest first.',
      inputSchema: { limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.webhooks.list(args)))
  );

  server.registerTool(
    'get_webhook',
    {
      title: 'Get webhook',
      description: 'Fetch a webhook by id.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.webhooks.get(args.id)))
  );

  server.registerTool(
    'create_webhook',
    {
      title: 'Create webhook',
      description:
        'Create an outgoing webhook. The response includes the signing secret, shown only on create and rotate: save it.',
      inputSchema: {
        url: z.string().url(),
        trigger: triggerField,
        emailEventTypes: emailEventTypesField.optional(),
        schemaId: z
          .string()
          .nullable()
          .optional()
          .describe('Schema id or slug. Required for every trigger except "email event".'),
        condition: conditionField.optional(),
      },
    },
    (args) => runTool(async () => jsonResult(await client.webhooks.create(args)))
  );

  server.registerTool(
    'update_webhook',
    {
      title: 'Update webhook',
      description:
        'Update a webhook url, email event types, condition, and/or status. Trigger and schema are not updatable.',
      inputSchema: {
        id: idField,
        url: z.string().url().optional(),
        emailEventTypes: emailEventTypesField.optional(),
        condition: conditionField.optional(),
        status: z.enum(['live', 'paused']).optional(),
      },
    },
    (args) =>
      runTool(async () => {
        const { id, ...params } = args;
        return jsonResult(await client.webhooks.update(id, params));
      })
  );

  server.registerTool(
    'delete_webhook',
    {
      title: 'Delete webhook',
      description: 'Permanently delete a webhook.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.webhooks.delete(args.id)))
  );

  server.registerTool(
    'rotate_webhook_secret',
    {
      title: 'Rotate webhook secret',
      description: 'Rotate a webhook signing secret. The old secret stops verifying immediately.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.webhooks.rotateSecret(args.id)))
  );
}
