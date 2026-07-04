import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Maxclicks } from 'maxclicks'
import { runTool, textResult } from './helpers.js'

export function registerTemplateTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'send_template',
    {
      title: 'Send template',
      description:
        'Send a stored template. `data` is keyed by the template expected data-representation properties (for example a contact). The send is synchronous.',
      inputSchema: {
        templateId: z.string().describe('The template id.'),
        data: z.record(z.unknown()).describe('Template data payload, keyed by the template data-representation properties.'),
      },
    },
    args =>
      runTool(async () => {
        await client.templates.send(args.templateId, { data: args.data })
        return textResult(`Template ${args.templateId} sent.`)
      })
  )
}
