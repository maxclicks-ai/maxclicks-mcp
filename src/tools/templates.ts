import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { z } from 'zod';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, offsetField } from './shared.js';

const idField = z.string().describe('The template id.');

export function registerTemplateTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_templates',
    {
      title: 'List templates',
      description: 'List the space stored message templates, newest first.',
      inputSchema: { limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.templates.list(args)))
  );

  server.registerTool(
    'get_template',
    {
      title: 'Get template',
      description:
        'Fetch a template by id, including its content, sender, recipient path, and expected data representation.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.templates.get(args.id)))
  );

  server.registerTool(
    'send_template',
    {
      title: 'Send template',
      description:
        'Send a stored template. `data` is keyed by the template expected data-representation properties (for example a contact). The send is synchronous.',
      inputSchema: {
        templateId: z.string().describe('The template id.'),
        data: z
          .record(z.unknown())
          .describe('Template data payload, keyed by the template data-representation properties.'),
      },
    },
    (args) =>
      runTool(async () =>
        jsonResult(await client.templates.send(args.templateId, { data: args.data }))
      )
  );
}
