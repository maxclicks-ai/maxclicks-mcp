import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Maxclicks } from 'maxclicks'
import { registerAttributeTools } from './attributes.js'
import { registerEventTools } from './events.js'
import { registerMetaTools } from './meta.js'
import { registerRecordTools } from './records.js'
import { registerSchemaTools } from './schemas.js'
import { registerSuppressionTools } from './suppressions.js'
import { registerTemplateTools } from './templates.js'
import { registerWebhookTools } from './webhooks.js'
import { registerWorkflowTools } from './workflows.js'

export function registerAllTools(server: McpServer, client: Maxclicks): void {
  registerMetaTools(server, client)
  registerSchemaTools(server, client)
  registerAttributeTools(server, client)
  registerRecordTools(server, client)
  registerEventTools(server, client)
  registerTemplateTools(server, client)
  registerSuppressionTools(server, client)
  registerWebhookTools(server, client)
  registerWorkflowTools(server, client)
}
