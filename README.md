# Maxclicks MCP Server

[![npm version](https://badge.fury.io/js/maxclicks-mcp.svg)](https://www.npmjs.com/package/maxclicks-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Enable AI assistants to manage your Maxclicks contacts, events, objects, and templates through the Model Context Protocol (MCP)

## Overview

The Maxclicks MCP Server is a [Model Context Protocol](https://modelcontextprotocol.io) implementation that enables AI assistants like Claude, ChatGPT, and others to interact with the Maxclicks API. This allows you to manage your CRM data, track events, and send templates directly through conversational AI interfaces.

### Features

- 🤖 **26 MCP Tools** - Complete Maxclicks API coverage 
- 🔐 **Multi-tenant Authentication** - URL-based and header-based auth
- 🌐 **Dual Mode** - Run as stdio (local) or HTTP server (hosted)
- 🐳 **Docker Ready** - Production-ready Docker configuration
- ⚡ **Zero Install** - Use via npx without installation
- 🔄 **Auto-retry** - Built-in retry logic with exponential backoff
- 📊 **Comprehensive Logging** - Operation tracking, metrics, and error monitoring
- 🛡️ **Robust Error Handling** - Automatic rate limit handling and network resilience
- 📈 **Health Checks** - Production monitoring support

### Available Tools

**Contacts Management (6 tools):**
- `create-contact` - Create new contacts
- `list-contacts` - List and filter contacts
- `get-contact` - Retrieve contact details
- `update-contact` - Update contact information
- `delete-contact` - Delete contacts
- `batch-create-contacts` - Bulk import multiple contacts

**Attributes Management (4 tools):**
- `create-attribute` - Define custom fields
- `list-attributes` - View available attributes
- `batch-create-attributes` - Bulk create custom attributes
- `delete-attribute` - Remove custom attributes

**Events Tracking (5 tools):**
- `create-event-schema` - Define event types
- `list-event-schemas` - View available events
- `get-event-schema` - Retrieve event schema details
- `update-event-schema` - Modify event schemas
- `track-event` - Record user actions

**Objects Management (9 tools):**
- `create-object-schema` - Define custom objects
- `list-object-schemas` - View object types
- `update-object-schema` - Modify object schemas
- `create-object` - Create object instances
- `list-objects` - Retrieve objects
- `get-object` - Get specific object details
- `update-object` - Modify existing objects
- `delete-object` - Remove objects
- `batch-create-objects` - Bulk create objects

**Templates (1 tool):**
- `send-template` - Trigger template-based communications

**API Keys (1 tool):**
- `check-api-key` - Validate API key and get workspace info

## Installation

### Quick Start with npx (Recommended)

```bash
env MAXCLICKS_API_KEY=your-api-key npx -y maxclicks-mcp
```

### Global Installation

```bash
npm install -g maxclicks-mcp
```

### Get Your API Key

Get your Maxclicks API key from: [https://maxclicks.ai/app/api-keys](https://maxclicks.ai/app/api-keys)

## Usage

### Stdio Mode (Local AI Assistants)

Use with Claude Desktop, Cursor, VS Code, and other local AI tools:

```bash
env MAXCLICKS_API_KEY=your-api-key maxclicks-mcp
```

### HTTP Server Mode (Hosted)

Run as an HTTP server for remote access:

```bash
env MAXCLICKS_API_KEY=your-api-key npm run start:server
```

Server will start on `http://localhost:3000` with the following endpoints:
- `POST /mcp` - MCP endpoint (header auth)
- `POST /{api-key}/v1/mcp` - MCP endpoint (URL auth)
- `GET /health` - Health check
- `GET /` - Server info

## Integration Guides

### Cursor

**For Cursor v0.48.6+:**

1. Open Cursor Settings → Features → MCP Servers
2. Click "+ Add new global MCP server"
3. Add this configuration:

```json
{
  "mcpServers": {
    "maxclicks-mcp": {
      "command": "npx",
      "args": ["-y", "maxclicks-mcp"],
      "env": {
        "MAXCLICKS_API_KEY": "YOUR-API-KEY"
      }
    }
  }
}
```

**For Cursor v0.45.6:**
- Name: `maxclicks-mcp`
- Type: `command`
- Command: `env MAXCLICKS_API_KEY=your-api-key npx -y maxclicks-mcp`

### VS Code

Press `Ctrl + Shift + P` and type "Preferences: Open User Settings (JSON)":

```json
{
  "mcp": {
    "inputs": [
      {
        "type": "promptString",
        "id": "apiKey",
        "description": "Maxclicks API Key",
        "password": true
      }
    ],
    "servers": {
      "maxclicks": {
        "command": "npx",
        "args": ["-y", "maxclicks-mcp"],
        "env": {
          "MAXCLICKS_API_KEY": "${input:apiKey}"
        }
      }
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config file:

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

Or use the hosted HTTP endpoint:

```json
{
  "mcpServers": {
    "maxclicks": {
      "url": "https://mcp.maxclicks.ai/{YOUR_API_KEY}/v1/mcp"
    }
  }
}
```

### Windsurf

Add to `.codeium/windsurf/model_config.json`:

```json
{
  "mcpServers": {
    "maxclicks-mcp": {
      "command": "npx",
      "args": ["-y", "maxclicks-mcp"],
      "env": {
        "MAXCLICKS_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## Configuration

### Environment Variables

**Required:**
- `MAXCLICKS_API_KEY` - Your Maxclicks API key

**Optional - Retry Configuration:**
- `MAXCLICKS_RETRY_MAX_ATTEMPTS` - Max retry attempts (default: 3)
- `MAXCLICKS_RETRY_INITIAL_DELAY` - Initial retry delay in ms (default: 1000)
- `MAXCLICKS_RETRY_MAX_DELAY` - Max retry delay in ms (default: 10000)
- `MAXCLICKS_RETRY_BACKOFF_FACTOR` - Backoff multiplier (default: 2)

**Optional - Server Configuration:**
- `PORT` - HTTP server port (default: 3000)
- `HOST` - HTTP server host (default: 0.0.0.0)
- `DEBUG` - Enable debug logging (default: false)

### Example Configuration

```bash
# Basic usage
export MAXCLICKS_API_KEY=your-api-key
npx -y maxclicks-mcp

# With custom retry configuration
export MAXCLICKS_API_KEY=your-api-key
export MAXCLICKS_RETRY_MAX_ATTEMPTS=5
export MAXCLICKS_RETRY_INITIAL_DELAY=2000
export MAXCLICKS_RETRY_MAX_DELAY=30000
export MAXCLICKS_RETRY_BACKOFF_FACTOR=3
npx -y maxclicks-mcp
```

## Docker Deployment

### Using Docker Compose

1. Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  maxclicks-mcp:
    image: maxclicks-mcp:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

2. Run:

```bash
docker-compose up -d
```

### Building Docker Image

```bash
docker build -t maxclicks-mcp:latest .
docker run -p 3000:3000 maxclicks-mcp:latest
```

## API Authentication

The server supports multiple authentication methods:

### Header-based Authentication

```bash
# X-Maxclicks-API-Key header
curl -X POST http://localhost:3000/mcp \
  -H "X-Maxclicks-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream"

# Authorization Bearer token
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream"
```

### URL-based Authentication

```bash
curl -X POST http://localhost:3000/{your-api-key}/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream"
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/maxclix/maxclicks-mcp.git
cd maxclicks-mcp

# Install dependencies
npm install

# Build
npm run build

# Run in stdio mode
npm start

# Run in HTTP server mode
npm run start:server
```

### Testing with MCP Inspector

The MCP Inspector is a visual tool for testing and debugging your MCP server.

**Option 1: Interactive Mode (Recommended)**
```bash
npm run inspector
# You'll be prompted to enter your API key
```

**Option 2: Using Environment Variable**
```bash
export MAXCLICKS_API_KEY=your-api-key
npm run inspector
```

The inspector will:
1. Prompt for your API key (if not set via environment)
2. Start the MCP Inspector web UI
3. Open in your default browser
4. Allow you to test all 26 tools interactively

**Inspector Features:**
- 🔍 Browse all available tools
- ✅ Test tool execution with custom parameters
- 📊 View request/response data
- 🐛 Debug error messages
- 📝 Generate example code

### Project Structure

```
mcp/
├── src/
│   ├── index.ts          # Stdio mode entry point
│   ├── server.ts         # HTTP server entry point
├── scripts/
│   └── inspector.js      # Interactive inspector launcher
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
├── Dockerfile            # Production Docker image
├── docker-compose.yml    # Docker Compose configuration
├── deploy.sh            # Deployment script
└── build/               # Compiled JavaScript output
```

## Monitoring

### Logging System

The server includes comprehensive logging for production monitoring:

**Log Levels:**
- `[INFO]` - Operation status and progress
- `[ERROR]` - SDK errors and request failures
- `[WARN]` - Rate limit warnings (handled automatically by SDK)
- `[DEBUG]` - Detailed debugging (enable with `DEBUG=true`)
- `[METRIC]` - Performance timing for all operations

**Example Log Output:**
```
[2025-10-11T10:30:15.123Z] [INFO] MCP request received | {"method":"tools/call","requestId":1}
[2025-10-11T10:30:15.124Z] [INFO] Starting operation: create-contact | {"email":"user@example.com"}
[2025-10-11T10:30:15.456Z] [METRIC] create-contact completed in 332ms | {"success":true}
[2025-10-11T10:30:15.457Z] [METRIC] MCP request completed in 334ms | {"success":true}
```

**Error Logging:**
```
[2025-10-11T10:30:20.789Z] [ERROR] Operation failed: create-contact | Error: validation_error | {"duration":45,"code":"validation_error","requestId":"req_abc123"}
```

**Enable Debug Logging:**
```bash
export DEBUG=true
npm run start:server
```

### Error Handling

The server provides robust error handling with automatic delegation to the Maxclicks SDK:

**Features:**
- **Automatic Retries** - SDK handles transient errors with exponential backoff
- **Rate Limit Handling** - Built-in rate limit detection and retry logic
- **Network Resilience** - Automatic retry on network failures
- **Detailed Error Messages** - SDK error codes and context passed through to clients

**Error Response Example:**
```json
{
  "success": false,
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please retry after a delay.",
    "details": {
      "retryAfter": 2000
    }
  },
  "requestId": "req_abc123",
  "timestamp": "2025-10-11T10:30:20.789Z"
}
```

**Retry Configuration:**
The SDK automatically retries failed requests with configurable backoff:
- Default: 3 attempts with 1s initial delay
- Max delay: 10s between retries
- Backoff factor: 2x (exponential)

Customize via environment variables (see Configuration section above).

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "maxclicks-mcp",
  "version": "1.0.0",
  "timestamp": "2025-10-11T09:44:47.314Z",
  "config": {
    "retry": {
      "maxAttempts": 3,
      "initialDelay": 1000,
      "maxDelay": 10000,
      "backoffFactor": 2
    }
  }
}
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **GitHub Repository:** [https://github.com/maxclix/maxclicks-mcp](https://github.com/maxclix/maxclicks-mcp)
- **NPM Package:** [https://www.npmjs.com/package/maxclicks-mcp](https://www.npmjs.com/package/maxclicks-mcp)
- **Maxclicks Website:** [https://maxclicks.ai](https://maxclicks.ai)
- **API Documentation:** [https://docs.maxclicks.ai](https://docs.maxclicks.ai)
- **Get API Key:** [https://maxclicks.ai/app/api-keys](https://maxclicks.ai/app/api-keys)

## Support

For issues and questions:
- GitHub Issues: [https://github.com/maxclix/maxclicks-mcp/issues](https://github.com/maxclix/maxclicks-mcp/issues)
- Email: support@maxclicks.ai

---

Made with ❤️ by the Maxclicks team
