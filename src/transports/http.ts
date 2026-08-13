import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { MaxclicksAuthenticationError } from 'maxclicks';
import { extractApiKey, resolveClient } from '../auth.js';
import { buildServer } from '../server.js';
import { SERVER_CARD } from '../serverCard.js';

function rpcError(message: string): {
  jsonrpc: '2.0';
  error: { code: number; message: string };
  id: null;
} {
  return { jsonrpc: '2.0', error: { code: -32000, message }, id: null };
}

/**
 * Runs the MCP server over streamable HTTP. Each session is authenticated once
 * (bearer API key or `/{key}/mcp` path) and bound to a `Maxclicks` client.
 */
export async function startHttp(options: {
  port: number;
  host: string;
  baseUrl?: string;
}): Promise<void> {
  const app = express();
  app.use(cors({ exposedHeaders: ['mcp-session-id'] }));
  app.use(express.json({ limit: '10mb' }));

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/.well-known/mcp/server-card.json', (_req, res) => {
    res.json(SERVER_CARD);
  });

  const handlePost = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.header('mcp-session-id');
      if (sessionId) {
        const existing = transports.get(sessionId);
        if (!existing) {
          res.status(404).json(rpcError('Unknown session.'));
          return;
        }
        await existing.handleRequest(req, res, req.body);
        return;
      }

      if (!isInitializeRequest(req.body)) {
        res
          .status(400)
          .json(rpcError('Missing session id; the first request must be an initialize request.'));
        return;
      }

      const apiKey = extractApiKey(req);
      if (!apiKey) {
        res.status(401).set('WWW-Authenticate', 'Bearer').json(rpcError('Missing API key.'));
        return;
      }

      let client;
      try {
        client = await resolveClient(apiKey, options.baseUrl);
      } catch (error) {
        if (error instanceof MaxclicksAuthenticationError) {
          res.status(401).set('WWW-Authenticate', 'Bearer').json(rpcError('Invalid API key.'));
          return;
        }
        res.status(502).json(rpcError('Could not reach the maxclicks API.'));
        return;
      }

      const server = buildServer(client);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, transport);
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) transports.delete(transport.sessionId);
      };
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP POST error:', error);
      if (!res.headersSent) res.status(500).json(rpcError('Internal server error.'));
    }
  };

  const handleSession = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.header('mcp-session-id');
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(404).end();
      return;
    }
    await transport.handleRequest(req, res);
  };

  app.post('/mcp', handlePost);
  app.get('/mcp', handleSession);
  app.delete('/mcp', handleSession);
  app.post('/:apiKey/mcp', handlePost);
  app.get('/:apiKey/mcp', handleSession);
  app.delete('/:apiKey/mcp', handleSession);

  await new Promise<void>((resolve) => {
    app.listen(options.port, options.host, () => {
      console.error(`maxclicks MCP (http) listening on http://${options.host}:${options.port}/mcp`);
      resolve();
    });
  });
}
