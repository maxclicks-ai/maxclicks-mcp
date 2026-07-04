import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { resolveClient } from '../auth.js'
import { buildServer } from '../server.js'

/** Runs the MCP server over stdio, keyed by the MAXCLICKS_API_KEY environment variable. */
export async function startStdio(options: { baseUrl?: string }): Promise<void> {
  const apiKey = process.env.MAXCLICKS_API_KEY
  if (!apiKey) {
    console.error('MAXCLICKS_API_KEY is required for stdio mode.')
    process.exit(1)
  }

  const client = await resolveClient(apiKey, options.baseUrl)
  const server = buildServer(client)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('maxclicks MCP (stdio) ready.')
}
