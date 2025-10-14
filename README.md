# Maxclicks MCP Server

[![npm version](https://badge.fury.io/js/maxclicks-mcp.svg)](https://www.npmjs.com/package/maxclicks-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Model Context Protocol](https://modelcontextprotocol.io) server that connects AI assistants (Claude, ChatGPT, etc.) to the Maxclicks API for CRM, events, and customer engagement.

## Quick Start (Recommended)

**Use our hosted MCP server** - no installation required:

Get your API key from [maxclicks.ai/app/api-keys](https://maxclicks.ai/app/api-keys), then add to your AI client:

```json
{
  "mcpServers": {
    "maxclicks": {
      "url": "https://mcp.maxclicks.ai/{YOUR_API_KEY}/v1/mcp"
    }
  }
}
```

## Self-Hosted Option

If you prefer to run your own server:

```bash
npx -y maxclicks-mcp
```

Or install globally:

```bash
npm install -g maxclicks-mcp
maxclicks-mcp
```

## Available Tools (26 total)

**Contacts (6):** create, list, get, update, delete, batch-create  
**Attributes (4):** create, list, batch-create, delete  
**Events (5):** create-schema, list-schemas, get-schema, update-schema, track  
**Objects (9):** create-schema, list-schemas, update-schema, create, list, get, update, delete, batch-create  
**Templates (1):** send  
**API Keys (1):** check

## Integration Examples

### Claude Desktop

```json
{
  "mcpServers": {
    "maxclicks": {
      "url": "https://mcp.maxclicks.ai/{YOUR_API_KEY}/v1/mcp"
    }
  }
}
```

### Cursor / VS Code / Windsurf

```json
{
  "mcpServers": {
    "maxclicks": {
      "url": "https://mcp.maxclicks.ai/{YOUR_API_KEY}/v1/mcp"
    }
  }
}
```

**Self-hosted alternative:**

```json
{
  "mcpServers": {
    "maxclicks": {
      "command": "npx",
      "args": ["-y", "maxclicks-mcp"],
      "env": {
        "MAXCLICKS_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

---

## For Developers

### Running Your Own Server

**Environment Variables:**
- `MAXCLICKS_API_KEY` - Your API key (required)
- `PORT` - Server port (default: 7004)
- `HOST` - Server host (default: 0.0.0.0)
- `TRANSPORT` - Mode: `stdio` or `httpStream` (default: httpStream)

**Start HTTP server:**
```bash
MAXCLICKS_API_KEY=your-key npm run start:server
```

**Start stdio mode:**
```bash
TRANSPORT=stdio MAXCLICKS_API_KEY=your-key npx maxclicks-mcp
```

### API Endpoints

When running as HTTP server (default):

- `POST /mcp` - MCP endpoint
- `POST /sse` - Server-Sent Events
- `POST /{api-key}/v1/mcp` - URL-based auth
- `GET /health` - Health check

**Authentication methods (in priority order):**
1. `Authorization: Bearer {token}` (recommended)
2. `X-Maxclicks-API-Key: {key}` header
3. URL path: `/{api-key}/v1/mcp`
4. `MAXCLICKS_API_KEY` env var

### Development

```bash
git clone https://github.com/maxclix/maxclicks-mcp.git
cd maxclicks-mcp
npm install
npm run build

# Test with inspector (stdio mode)
npm run inspector
```

**MCP Inspector Usage:**
- When prompted, enter your API key
- In the inspector UI, use **"Skip OAuth"** or manual connection (not the OAuth flow)
- The server runs in stdio mode and uses API key authentication from environment variables
- OAuth is only available when running in HTTP mode with proper configuration

**Testing OAuth 2.1 (Advanced):**

1. Start the OAuth-enabled server:
```bash
npm run start:oauth
```

2. Test OAuth discovery endpoints:
```bash
# Quick test script
./test-oauth.sh

# Or manually
curl http://localhost:7004/.well-known/oauth-authorization-server | jq
```

3. Test with MCP Inspector:
```bash
npm run inspector:oauth  # Shows instructions
# Then manually: npx @modelcontextprotocol/inspector
# Add HTTP server: http://localhost:7004/mcp
# Inspector will auto-discover OAuth endpoints
```

**OAuth Endpoints:**
- Authorization Server: `http://localhost:7004/.well-known/oauth-authorization-server`
- Protected Resource: `http://localhost:7004/.well-known/oauth-protected-resource`
- Supports: OAuth 2.1 with PKCE (S256), authorization_code & client_credentials grants

### Docker

```bash
docker build -t maxclicks-mcp .
docker run -p 7004:7004 -e MAXCLICKS_API_KEY=your-key maxclicks-mcp
```

Or use docker-compose:

```yaml
services:
  maxclicks-mcp:
    image: maxclicks-mcp
    ports:
      - "7004:7004"
    environment:
      - MAXCLICKS_API_KEY=your-key
```

---
## Links

- **Maxclicks:** [maxclicks.ai](https://maxclicks.ai)
- **Get API Key:** [maxclicks.ai/app/api-keys](https://app.maxclicks.ai/settings/devlopers)
- **GitHub:** [github.com/maxclix/maxclicks-mcp](https://github.com/maxclix/maxclicks-mcp)
- **NPM:** [npmjs.com/package/maxclicks-mcp](https://www.npmjs.com/package/maxclicks-mcp)

## Support

- **Issues:** [github.com/maxclix/maxclicks-mcp/issues](https://github.com/maxclix/maxclicks-mcp/issues)
- **Email:** support@maxclicks.ai

## License

MIT License - see [LICENSE](LICENSE) file

---

Made with ❤️ by the Maxclicks team
