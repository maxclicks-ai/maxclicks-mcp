import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { jsonResult, pageResult, runTool } from './helpers.js';
import { limitField, offsetField } from './shared.js';

const idField = z.string().describe('The domain id.');

export function registerDomainTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'list_domains',
    {
      title: 'List domains',
      description:
        'List the space sending domains, newest first. Items omit DNS records; call get_domain for the DNS records.',
      inputSchema: { limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.domains.list(args)))
  );

  server.registerTool(
    'get_domain',
    {
      title: 'Get domain',
      description: 'Fetch a domain by id, including its live-checked DNS records.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.domains.get(args.id)))
  );
}
