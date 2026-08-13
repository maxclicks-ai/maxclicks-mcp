import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, offsetField } from './shared.js';

const idField = z.string().describe('The segment id.');

const nameField = z.string().describe('The segment name, unique within the space.');

const descriptionField = z
  .string()
  .nullable()
  .optional()
  .describe('A human-readable description. Pass null to clear it.');

const contactSchemaField = z.string().describe('A contact schema id or slug the segment filters.');

export function registerSegmentTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_segments',
    {
      title: 'List segments',
      description: 'List the space AI-defined contact filters (segments), newest first.',
      inputSchema: { limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.segments.list(args)))
  );

  server.registerTool(
    'get_segment',
    {
      title: 'Get segment',
      description: 'Fetch a segment by id.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.segments.get(args.id)))
  );

  server.registerTool(
    'create_segment',
    {
      title: 'Create segment',
      description:
        'Generate a contact filter from a natural-language requirements prompt and persist it in one call. Every create is a slow, billed AI call; the response includes a live matchingCount. The generated expression is never returned.',
      inputSchema: {
        name: nameField,
        description: descriptionField,
        contactSchema: contactSchemaField,
        requirements: z
          .string()
          .describe(
            'Natural-language description of the filter criteria to generate the condition from.'
          ),
      },
    },
    (args) => runTool(async () => jsonResult(await client.segments.create(args)))
  );

  server.registerTool(
    'delete_segment',
    {
      title: 'Delete segment',
      description:
        'Permanently delete a segment. Rejected if it is in use as an audience, trigger, or condition, or referenced by other entities.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.segments.delete(args.id)))
  );

  server.registerTool(
    'count_segment',
    {
      title: 'Count segment contacts',
      description:
        "Return the segment live matching contact count and the schema's total contact count.",
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.segments.count(args.id)))
  );

  server.registerTool(
    'list_segment_contacts',
    {
      title: 'List segment contacts',
      description:
        'List the contacts currently matching the segment, paginated. limit is hard-capped at 100 server-side.',
      inputSchema: { id: idField, limit: limitField, offset: offsetField },
    },
    (args) =>
      runTool(async () => {
        const { id, ...params } = args;
        return pageResult(await client.segments.listContacts(id, params));
      })
  );
}
