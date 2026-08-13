import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks, SuppressionInput } from 'maxclicks';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, offsetField } from './shared.js';

const identifierFilterField = z
  .string()
  .optional()
  .describe('Filter to the suppression(s) for one email address.');

const reasonField = z
  .enum(['manual', 'legal'])
  .describe(
    'Why the identifier is suppressed. Only "manual" and "legal" are creatable through the API.'
  );

const notesField = z
  .string()
  .nullable()
  .optional()
  .describe('Optional free-text note explaining the suppression.');

const suppressionInputField = z
  .object({
    identifier: z.string().describe('The email address to suppress.'),
    reason: reasonField,
    notes: notesField,
  })
  .describe('One suppression to create.');

export function registerSuppressionTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_suppressions',
    {
      title: 'List suppressions',
      description:
        'List the space suppressions (do-not-contact list), newest first, optionally filtered to one email. Requires an admin API key.',
      inputSchema: { identifier: identifierFilterField, limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.suppressions.list(args)))
  );

  server.registerTool(
    'create_suppression',
    {
      title: 'Create suppression',
      description:
        'Suppress an email identifier for the space (do-not-contact). Requires an admin API key.',
      inputSchema: {
        identifier: z.string().describe('The email address to suppress.'),
        reason: reasonField,
        notes: notesField,
      },
    },
    (args) => runTool(async () => jsonResult(await client.suppressions.create(args)))
  );

  server.registerTool(
    'delete_suppression',
    {
      title: 'Delete suppression',
      description:
        'Remove a suppression by id, re-allowing communication to that identifier. Requires an admin API key.',
      inputSchema: { id: z.string().describe('The suppression id.') },
    },
    (args) => runTool(async () => jsonResult(await client.suppressions.delete(args.id)))
  );

  server.registerTool(
    'batch_create_suppressions',
    {
      title: 'Create suppressions (batch)',
      description:
        'Bulk-suppress 1 to 100 email identifiers; each item is processed independently. Returns per-item results and a summary. Requires an admin API key.',
      inputSchema: {
        suppressions: z
          .array(suppressionInputField)
          .min(1)
          .max(100)
          .describe('1 to 100 suppressions to create.'),
      },
    },
    (args) =>
      runTool(async () =>
        jsonResult(await client.suppressions.batchCreate(args.suppressions as SuppressionInput[]))
      )
  );

  server.registerTool(
    'batch_delete_suppressions',
    {
      title: 'Delete suppressions (batch)',
      description:
        'Bulk-remove 1 to 100 suppressions by id; each id is gated like the single delete. Returns per-item results and a summary. Requires an admin API key.',
      inputSchema: {
        ids: z.array(z.string()).min(1).max(100).describe('1 to 100 suppression ids to remove.'),
      },
    },
    (args) => runTool(async () => jsonResult(await client.suppressions.batchDelete(args.ids)))
  );
}
