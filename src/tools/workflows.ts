import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Maxclicks } from 'maxclicks'
import { runTool, textResult } from './helpers.js'

export function registerWorkflowTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'trigger_workflow',
    {
      title: 'Trigger workflow',
      description:
        'Start a workflow run through its incoming-webhook step. The body is validated server-side against the step configured JSON schema.',
      inputSchema: {
        reference: z.string().describe('The incoming-webhook step reference id.'),
        body: z.record(z.unknown()).optional().describe('The run input payload.'),
      },
    },
    args =>
      runTool(async () => {
        await client.workflows.trigger(args.reference, args.body ?? {})
        return textResult(`Workflow triggered for reference ${args.reference}.`)
      })
  )
}
