import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { registerAttributeTools } from './attributes.js';
import { registerBroadcastTools } from './broadcasts.js';
import { registerDomainTools } from './domains.js';
import { registerEventTools } from './events.js';
import { registerMetaTools } from './meta.js';
import { registerRecordTools } from './records.js';
import { registerSchemaTools } from './schemas.js';
import { registerSegmentTools } from './segments.js';
import { registerSenderTools } from './senders.js';
import { registerSuppressionTools } from './suppressions.js';
import { registerTemplateTools } from './templates.js';
import { registerTopicTools } from './topics.js';
import { registerWebhookTools } from './webhooks.js';
import { registerWorkflowTools } from './workflows.js';

export function registerAllTools(server: McpServer, client: Maxclicks): void {
  registerMetaTools(server, client);
  registerSchemaTools(server, client);
  registerAttributeTools(server, client);
  registerRecordTools(server, client);
  registerEventTools(server, client);
  registerTemplateTools(server, client);
  registerSuppressionTools(server, client);
  registerWebhookTools(server, client);
  registerWorkflowTools(server, client);
  registerDomainTools(server, client);
  registerSenderTools(server, client);
  registerTopicTools(server, client);
  registerSegmentTools(server, client);
  registerBroadcastTools(server, client);
}
