import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Maxclicks } from 'maxclicks'
import { jsonResult, runTool } from './helpers.js'

export function registerMetaTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'whoami',
    {
      title: 'Who am I',
      description:
        'Identify the calling API key: the key, its owner, the bound space, and your role. Use this first to confirm which space you are operating in.',
      inputSchema: {},
    },
    () => runTool(async () => jsonResult(await client.me()))
  )
}
