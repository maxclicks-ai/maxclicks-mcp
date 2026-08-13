import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks, RecordInput } from 'maxclicks';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, offsetField, recordInputField, schemaField } from './shared.js';

const idField = z.string().describe('The record platform id.');

export function registerRecordTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_records',
    {
      title: 'List records',
      description: 'List records (contacts or objects) in a schema, oldest first. Paginated.',
      inputSchema: { schema: schemaField, limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.records.list(args.schema, args)))
  );

  server.registerTool(
    'get_record',
    {
      title: 'Get record',
      description: 'Fetch one record by its platform id.',
      inputSchema: { schema: schemaField, id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.records.get(args.schema, args.id)))
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
        jsonResult(await client.records.create(args.schema, args.input as RecordInput))
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
        jsonResult(await client.records.upsert(args.schema, args.input as RecordInput))
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
        jsonResult(await client.records.update(args.schema, args.id, args.input as RecordInput))
      )
  );

  server.registerTool(
    'delete_record',
    {
      title: 'Delete record',
      description: 'Delete a record by its platform id.',
      inputSchema: { schema: schemaField, id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.records.delete(args.schema, args.id)))
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
          await client.records.auditTrail(args.schema, args.id, {
            channel: args.channel,
            limit: args.limit,
            offset: args.offset,
          })
        )
      )
  );
}
