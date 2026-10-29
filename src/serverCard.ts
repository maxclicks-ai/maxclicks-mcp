import { config } from './config.js';
import { SERVER_NAME, VERSION } from './version.js';

const PUBLIC_URL = config.publicUrl;
const DESCRIPTION =
  'Work with a maxclicks workspace from an MCP client: look up and write contacts and objects, fire events, build and count segments, send prepared templates and broadcasts, drive workflows, and manage webhooks and suppressions.';

/**
 * Server Card (SEP-2127, `server-card.schema.json` v1) served at `/.well-known/mcp/server-card.json`
 * and `/mcp/server-card`. `serverInfo`, `transport`, `capabilities` and `authentication` repeat the
 * identity in the earlier SEP-1649 shape that discovery scanners still read. OAuth itself is discovered
 * the standard way, from the 401 challenge and the protected resource metadata.
 */
export const SERVER_CARD = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
  name: 'ai.maxclicks/mcp',
  title: 'maxclicks',
  version: VERSION,
  description: DESCRIPTION,
  websiteUrl: 'https://docs.maxclicks.ai/ai/mcp',
  repository: { url: 'https://github.com/maxclicks-ai/maxclicks-mcp', source: 'github' },
  icons: [{ src: 'https://maxclicks.ai/logo-icon.svg', mimeType: 'image/svg+xml' }],
  remotes: [
    {
      type: 'streamable-http',
      url: PUBLIC_URL,
      headers: [
        {
          name: 'Authorization',
          description:
            'Optional. A maxclicks workspace API key, created in Settings, Developers, API keys. Without it, the client signs in with OAuth.',
          isRequired: false,
          isSecret: true,
          value: 'Bearer {api_key}',
          variables: {
            api_key: {
              description: 'The API key, starting with max_.',
              isRequired: true,
              isSecret: true,
            },
          },
        },
      ],
      supportedProtocolVersions: ['2025-11-25', '2025-06-18', '2025-03-26'],
    },
  ],
  serverInfo: { name: SERVER_NAME, title: 'maxclicks', version: VERSION },
  transport: { type: 'streamable-http', endpoint: PUBLIC_URL },
  capabilities: { tools: { listChanged: false } },
  authentication: { required: true, schemes: ['oauth2', 'bearer'] },
};
