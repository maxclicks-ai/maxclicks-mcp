import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks, RecordInput } from 'maxclicks';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, offsetField, recordInputField, schemaField } from './shared.js';

const idField = z.string().describe('The record platform id.');
const deletionOperationIdField = z
  .string()
  .describe('The deletion `operationId` returned by delete_record.');

export function registerRecordTools(server: McpServer, client: () => Maxclicks): void {
  server.registerTool(
    'list_records',
    {
      title: 'List records',
      description: 'List records (contacts or objects) in a schema, oldest first. Paginated.',
      inputSchema: { schema: schemaField, limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client().records.list(args.schema, args)))
  );

  server.registerTool(
    'get_record',
    {
      title: 'Get record',
      description: 'Fetch one record by its platform id.',
      inputSchema: { schema: schemaField, id: idField },
    },
    (args) => runTool(async () => jsonResult(await client().records.get(args.schema, args.id)))
  );

  server.registerTool(
    'create_record',
    {
      title: 'Create record',
      description:
        'Strictly create a record (fails if an identifier already exists). Contacts identify by userId, then email, then phone; objects by externalId. To create-or-update instead, use upsert_record.',
      inputSchema: { schema: schemaField, input: recordInputField },
    },
    (args) =>
      runTool(async () =>
        jsonResult(await client().records.create(args.schema, args.input as RecordInput))
      )
  );

  server.registerTool(
    'upsert_record',
    {
      title: 'Upsert record',
      description:
        'Create or update a record by identity. Contact match cascade: id, then userId, then email, then phone. Object match: id, then externalId. Skipped identifier updates are reported in warnings.',
      inputSchema: { schema: schemaField, input: recordInputField },
    },
    (args) =>
      runTool(async () =>
        jsonResult(await client().records.upsert(args.schema, args.input as RecordInput))
      )
  );

  server.registerTool(
    'update_record',
    {
      title: 'Update record',
      description:
        'Partially update a record by id. Only provided keys change; an explicit null clears a nullable field.',
      inputSchema: { schema: schemaField, id: idField, input: recordInputField },
    },
    (args) =>
      runTool(async () =>
        jsonResult(await client().records.update(args.schema, args.id, args.input as RecordInput))
      )
  );

  server.registerTool(
    'delete_record',
    {
      title: 'Delete record',
      description:
        'Request deletion of a record by its platform id. Deletion is asynchronous: returns the deletion operation (`operationId`, `status`, `canCancel`). Follow it with get_record_deletion; while `canCancel` is true, cancel_record_deletion stops it.',
      inputSchema: {
        schema: schemaField,
        id: idField,
        idempotencyKey: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Identifies this deletion request. To retry a request that failed or timed out, pass the idempotencyKey the earlier call returned. Omit it for a new request.'
          ),
      },
    },
    (args) =>
      runTool(async () => {
        const idempotencyKey = args.idempotencyKey ?? randomUUID();
        const deletion = await client().records.delete(args.schema, args.id, { idempotencyKey });
        return jsonResult({ idempotencyKey, ...deletion });
      })
  );

  server.registerTool(
    'get_record_deletion',
    {
      title: 'Get record deletion',
      description:
        'Read the status of a record deletion: pending, blocked, completed or cancelled, with `canCancel` and an explanatory `message`.',
      inputSchema: { operationId: deletionOperationIdField },
    },
    (args) => runTool(async () => jsonResult(await client().records.getDeletion(args.operationId)))
  );

  server.registerTool(
    'cancel_record_deletion',
    {
      title: 'Cancel record deletion',
      description:
        'Cancel a record deletion before the record is removed. Only possible while the deletion reports `canCancel: true`.',
      inputSchema: { operationId: deletionOperationIdField },
    },
    (args) =>
      runTool(async () => jsonResult(await client().records.cancelDeletion(args.operationId)))
  );

  server.registerTool(
    'get_contact_audit_trail',
    {
      title: 'Get contact audit trail',
      description:
        'List a contact consent and communication audit trail, newest first. Contact schemas only.',
      inputSchema: {
        schema: schemaField,
        id: idField,
        channel: z.enum(['email']).optional().describe('Filter by communication channel.'),
        limit: limitField,
        offset: offsetField,
      },
    },
    (args) =>
      runTool(async () =>
        pageResult(
          await client().records.auditTrail(args.schema, args.id, {
            channel: args.channel,
            limit: args.limit,
            offset: args.offset,
          })
        )
      )
  );
}
