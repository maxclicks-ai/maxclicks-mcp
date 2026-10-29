import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { Maxclicks, MaxclicksAuthenticationError } from 'maxclicks';
import { type Credential, extractBearerToken, verifyCredential } from '../auth.js';
import { config } from '../config.js';
import { buildServer } from '../server.js';
import { SERVER_CARD } from '../serverCard.js';

interface Session {
  readonly transport: StreamableHTTPServerTransport;
  readonly apiKeyId: string;
  /** Replaced whenever the client presents a refreshed token, so tool calls never use an expired one. */
  readonly connection: { client: Maxclicks; token: string };
}

function rpcError(message: string): {
  jsonrpc: '2.0';
  error: { code: number; message: string };
  id: null;
} {
  return { jsonrpc: '2.0', error: { code: -32000, message }, id: null };
}

/**
 * Runs the MCP server over streamable HTTP as an OAuth 2.1 protected resource. Every request is authenticated
 * (MCP authorization, "Token Handling"): a session is bound to the key or connection that opened it and is
 * never itself a credential.
 */
export async function startHttp(options: {
  port: number;
  host: string;
  baseUrl?: string;
}): Promise<void> {
  const app = express();
  app.use(cors({ exposedHeaders: ['mcp-session-id', 'WWW-Authenticate'] }));
  app.use(express.json({ limit: '10mb' }));

  const sessions = new Map<string, Session>();
  const publicUrl = new URL(config.publicUrl);
  const resourceMetadataPath = `/.well-known/oauth-protected-resource${publicUrl.pathname}`;
  const resourceMetadataUrl = new URL(resourceMetadataPath, publicUrl).href;
  const authorizationServer = new URL(options.baseUrl ?? config.defaultApiBaseUrl).origin;

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const sendServerCard = (_req: Request, res: Response): void => {
    res.set('Cache-Control', `public, max-age=${config.metadataCacheSeconds}`);
    res.json(SERVER_CARD);
  };
  app.get('/.well-known/mcp/server-card.json', sendServerCard);
  app.get('/mcp/server-card', sendServerCard);

  // RFC 9728. The root document names the origin, which the authorization server accepts for this server too.
  const sendResourceMetadata =
    (resource: string) =>
    (_req: Request, res: Response): void => {
      res.set('Cache-Control', `public, max-age=${config.metadataCacheSeconds}`);
      res.json({
        resource,
        authorization_servers: [authorizationServer],
        scopes_supported: config.scopes.supported,
        bearer_methods_supported: ['header'],
        resource_name: 'maxclicks MCP server',
        resource_documentation: config.documentationUrl,
      });
    };
  app.get(resourceMetadataPath, sendResourceMetadata(config.publicUrl));
  app.get('/.well-known/oauth-protected-resource', sendResourceMetadata(publicUrl.origin));

  const challenge = (res: Response, error: { code: string; description: string } | null): void => {
    const parameters = [
      ...(error ? [`error="${error.code}"`, `error_description="${error.description}"`] : []),
      `resource_metadata="${resourceMetadataUrl}"`,
      `scope="${config.scopes.challenged.join(' ')}"`,
    ];
    res
      .status(401)
      .set('WWW-Authenticate', `Bearer ${parameters.join(', ')}`)
      .json(rpcError(error?.description ?? 'Authorization required.'));
  };

  const authenticate = async (req: Request, res: Response): Promise<Credential | null> => {
    const token = extractBearerToken(req);
    if (!token) {
      challenge(res, null);
      return null;
    }
    try {
      const credential = await verifyCredential(token, options.baseUrl);
      if (credential.oauth !== null && credential.oauth.resource !== config.publicUrl) {
        challenge(res, {
          code: 'invalid_token',
          description: 'This token was issued for a different resource.',
        });
        return null;
      }
      return credential;
    } catch (error) {
      if (error instanceof MaxclicksAuthenticationError) {
        challenge(res, { code: 'invalid_token', description: 'The token is invalid or expired.' });
        return null;
      }
      res.status(502).json(rpcError('Could not reach the maxclicks API.'));
      return null;
    }
  };

  /** A session answers only the credential that opened it; to anyone else it does not exist. */
  const findSession = (req: Request, credential: Credential): Session | null => {
    const sessionId = req.header('mcp-session-id');
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session || session.apiKeyId !== credential.apiKeyId) return null;
    if (session.connection.token !== credential.token) {
      session.connection.client = new Maxclicks({
        apiKey: credential.token,
        baseUrl: options.baseUrl,
      });
      session.connection.token = credential.token;
    }
    return session;
  };

  const handlePost = async (req: Request, res: Response): Promise<void> => {
    try {
      const credential = await authenticate(req, res);
      if (!credential) return;

      if (req.header('mcp-session-id')) {
        const session = findSession(req, credential);
        if (!session) {
          res.status(404).json(rpcError('Unknown session.'));
          return;
        }
        await session.transport.handleRequest(req, res, req.body);
        return;
      }

      if (!isInitializeRequest(req.body)) {
        res
          .status(400)
          .json(rpcError('Missing session id; the first request must be an initialize request.'));
        return;
      }

      const connection = {
        client: new Maxclicks({ apiKey: credential.token, baseUrl: options.baseUrl }),
        token: credential.token,
      };
      const server = buildServer(() => connection.client);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, apiKeyId: credential.apiKeyId, connection });
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP POST error:', error);
      if (!res.headersSent) res.status(500).json(rpcError('Internal server error.'));
    }
  };

  const handleSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const credential = await authenticate(req, res);
      if (!credential) return;
      const session = findSession(req, credential);
      if (!session) {
        res.status(404).end();
        return;
      }
      await session.transport.handleRequest(req, res);
    } catch (error) {
      console.error('MCP session error:', error);
      if (!res.headersSent) res.status(500).end();
    }
  };

  app.post('/mcp', handlePost);
  app.get('/mcp', handleSession);
  app.delete('/mcp', handleSession);

  await new Promise<void>((resolve) => {
    app.listen(options.port, options.host, () => {
      console.error(`maxclicks MCP (http) listening on http://${options.host}:${options.port}/mcp`);
      resolve();
    });
  });
}
