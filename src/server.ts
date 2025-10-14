#!/usr/bin/env node
import { FastMCP } from 'fastmcp';
import { Maxclicks } from '@maxclicks/node-sdk';
import { z } from 'zod';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));
const PORT = parseInt(argv.port || process.env.PORT || '7004', 10);
const HOST = argv.host || process.env.HOST || '0.0.0.0';

// OAuth configuration (if enabled via env vars)
const OAUTH_ENABLED = process.env.OAUTH_ENABLED === 'true';
const OAUTH_ISSUER = process.env.OAUTH_ISSUER;
const OAUTH_AUTH_ENDPOINT = process.env.OAUTH_AUTH_ENDPOINT;
const OAUTH_TOKEN_ENDPOINT = process.env.OAUTH_TOKEN_ENDPOINT;
const OAUTH_JWKS_URI = process.env.OAUTH_JWKS_URI;

// Session data must extend Record<string, unknown> for FastMCP compatibility
interface SessionData extends Record<string, unknown> {
  apiKey: string;
  spaceName?: string;
  success?: boolean;
}

// Create FastMCP server with authentication and optional OAuth
const server = new FastMCP<SessionData>({
  name: 'maxclicks-mcp',
  version: '1.0.0',
  instructions: `Maxclicks MCP Server provides tools for managing contacts, events, objects, and templates.

🚨 CRITICAL WORKFLOW REQUIREMENTS:

1. FOR CONTACTS (with custom attributes):
   Step 1: Define attributes → create-attribute (targetType: 'contact')
   Step 2: Then create contacts → create-contact (with attributeValuesByKey)
   
   Example: To store "plan" on contacts, first create attribute:
   - create-attribute: { targetType: 'contact', key: 'plan', label: 'Subscription Plan', type: 'string' }
   - Then create-contact: { email: '...', attributeValuesByKey: { plan: 'premium' } }
   ⚠️  Using attributeValuesByKey with undefined attributes will FAIL!

2. FOR OBJECTS (3 steps required):
   Step 1: Create object schema → create-object-schema (e.g., slug: 'products')
   Step 2: Define attributes for that schema → create-attribute (targetType: 'object', objectSchemaId: 'products')
   Step 3: Then create object instances → create-object (schemaSlug: 'products', attributeValuesByKey: {...})
   
   Example: To create a product catalog:
   - create-object-schema: { slug: 'products', name: 'Products' }
   - create-attribute: { targetType: 'object', objectSchemaId: 'products', key: 'price', type: 'number' }
   - create-object: { schemaSlug: 'products', attributeValuesByKey: { price: 99.99 } }
   ⚠️  Using attributeValuesByKey with undefined attributes will FAIL!

3. FOR EVENTS (different approach - JSON Schema):
   Step 1: Create event schema with JSON Schema → create-event-schema (slug: 'user-signup', payloadJsonSchema: {...})
   Step 2: Track events → track-event (slug: 'user-signup', payload: {...})
   
   Example: Track user signups with validation:
   - create-event-schema: { 
       slug: 'user-signup', 
       payloadJsonSchema: { 
         type: 'object', 
         properties: { 
           email: { type: 'string', format: 'email' },
           plan: { type: 'string', enum: ['free', 'premium'] }
         },
         required: ['email']
       }
     }
   - track-event: { slug: 'user-signup', payload: { email: 'user@example.com', plan: 'premium' } }
   
   NOTE: Events use JSON Schema (flexible, open structure) instead of pre-defined attributes.
   The payloadJsonSchema validates event data structure at tracking time.

Available tool categories:
- Contacts Management: create-contact, list-contacts, get-contact, update-contact, delete-contact, batch-create-contacts
- Attributes Management (START HERE): create-attribute, list-attributes, batch-create-attributes, delete-attribute
- Events Tracking: create-event-schema, list-event-schemas, get-event-schema, update-event-schema, track-event
- Objects Management: create-object-schema, list-object-schemas, update-object-schema, create-object, list-objects, get-object, update-object, delete-object, batch-create-objects
- Templates: send-template
- API Keys: check-api-key

Use these tools to interact with the Maxclicks API for customer engagement.`,

  authenticate: async (request) => {
    let apiKey: string | undefined;
    const authHeader = request.headers['authorization'] as string | undefined;

    if (authHeader) {
      if (!authHeader.startsWith('Bearer ')) {
        throw new Response(null, {
          status: 401,
          statusText: 'Unauthorized: Authorization header must use Bearer scheme',
        });
      }
      apiKey = authHeader.substring(7);
    }

    if (!apiKey) {
      apiKey = request.headers['x-maxclicks-api-key'] as string | undefined;
    }

    if (!apiKey) {
      const pathMatch = request.url?.match(/^\/([^\/]+)\/(v[12])\/mcp/);
      apiKey = pathMatch ? pathMatch[1] : undefined;
    }

    if (!apiKey) {
      apiKey = process.env.MAXCLICKS_API_KEY;
    }

    if (!apiKey) {
      throw new Response(null, {
        status: 401,
        statusText:
          'Unauthorized: API key required (provide via Authorization: Bearer {key} header, X-Maxclicks-API-Key header, or MAXCLICKS_API_KEY env var)',
      });
    }

    try {
      const client = new Maxclicks(apiKey);
      const result = await client.apiKeys.check();

      if (result.error) {
        // Invalid token - return 401 per OAuth 2.1 Section 5.3
        throw new Response(null, {
          status: 401,
          statusText: `Unauthorized: Invalid API key - ${result.error.error.message}`,
        });
      }

      return {
        apiKey,
        spaceName: result.data?.spaceName,
        success: result.data?.success,
      };
    } catch (error: any) {
      if (error instanceof Response) {
        throw error;
      }
      throw new Response(null, {
        status: 401,
        statusText: `Unauthorized: API key validation failed - ${error.message}`,
      });
    }
  },

  ...(OAUTH_ENABLED && OAUTH_ISSUER && OAUTH_AUTH_ENDPOINT && OAUTH_TOKEN_ENDPOINT && OAUTH_JWKS_URI
    ? {
        oauth: {
          enabled: true,
          authorizationServer: {
            issuer: OAUTH_ISSUER,
            authorizationEndpoint: OAUTH_AUTH_ENDPOINT,
            tokenEndpoint: OAUTH_TOKEN_ENDPOINT,
            jwksUri: OAUTH_JWKS_URI,
            // OAuth 2.1 requires PKCE for all clients
            responseTypesSupported: ['code'],
            // Support both grant types as per MCP spec
            grantTypesSupported: ['authorization_code', 'client_credentials'],
            // PKCE is required for OAuth 2.1
            codeChallengeMethodsSupported: ['S256'],
          },
          protectedResource: {
            resource: 'mcp://maxclicks',
            authorizationServers: [OAUTH_ISSUER],
          },
        },
      }
    : {}),

  // Health check configuration
  health: {
    enabled: true,
    message: 'healthy',
    path: '/health',
    status: 200,
  },
});

// Helper function to get Maxclicks client from session
function getClient(session: SessionData | undefined): Maxclicks {
  // In stdio mode, session might not be populated, so fall back to env var
  const apiKey = session?.apiKey || process.env.MAXCLICKS_API_KEY;

  if (!apiKey) {
    throw new Error('API key required. Set MAXCLICKS_API_KEY environment variable.');
  }

  return new Maxclicks(apiKey);
}

// ===== API KEY TOOLS =====

server.addTool({
  name: 'check-api-key',
  description:
    'Validate the current API key and get workspace information. Use this to verify API key validity.',
  parameters: z.object({}),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.apiKeys.check();
    if (result.error) throw new Error(JSON.stringify(result.error));
    return `API Key is valid!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

// ===== CONTACT TOOLS =====

server.addTool({
  name: 'create-contact',
  description:
    'Create a new contact in Maxclicks. IMPORTANT: If you want to use custom attributes (attributeValuesByKey), you MUST first create those attributes using create-attribute with targetType="contact". Check existing attributes with list-attributes first to avoid errors.',
  parameters: z.object({
    id: z.string().optional().describe('Optional contact ID for upsert operations'),
    fullName: z.string().optional().describe('Contact full name'),
    firstName: z.string().optional().describe('Contact first name'),
    lastName: z.string().optional().describe('Contact last name'),
    email: z.string().email().optional().describe('Contact email address'),
    phone: z.string().optional().describe('Contact phone number'),
    avatarUrl: z.string().optional().describe('Contact avatar/profile picture URL'),
    userId: z.string().optional().describe('External user ID for integration'),
    userGroup: z.string().optional().describe('User group classification'),
    notes: z.string().optional().describe('Notes about the contact'),
    tags: z.array(z.string()).optional().describe('Tags to categorize the contact'),
    attributeValuesByKey: z
      .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]))
      .optional()
      .describe(
        'Custom attribute key-value pairs (e.g., {"plan": "premium", "signup_date": "2024-01-01"}). ⚠️ IMPORTANT: All keys must be pre-defined using create-attribute with targetType="contact". Use list-attributes to check existing attributes first.'
      ),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    log.info('Creating contact', { email: args.email });

    const result = await client.contacts.create(
      Object.fromEntries(Object.entries(args).filter(([_, v]) => v !== undefined))
    );

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Contact created successfully');
    return `Contact created successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'batch-create-contacts',
  description:
    'Create multiple contacts in a single batch operation. IMPORTANT: If contacts include custom attributes (attributeValuesByKey), those attributes MUST be pre-defined using create-attribute with targetType="contact". Use list-attributes to verify attributes exist before batch operations.',
  parameters: z.object({
    contacts: z
      .array(
        z.object({
          id: z.string().optional(),
          fullName: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          avatarUrl: z.string().optional(),
          userId: z.string().optional(),
          userGroup: z.string().optional(),
          notes: z.string().optional(),
          tags: z.array(z.string()).optional(),
          attributeValuesByKey: z
            .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]))
            .optional()
            .describe(
              '⚠️ All keys must be pre-defined using create-attribute with targetType="contact"'
            ),
        })
      )
      .describe('Array of contacts to create'),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    log.info('Batch creating contacts', { count: args.contacts.length });

    const result = await client.contacts
      .batch()
      .create(
        args.contacts.map((c) =>
          Object.fromEntries(Object.entries(c).filter(([_, v]) => v !== undefined))
        )
      );

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Batch contact creation completed');
    return `Batch contact creation completed!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'list-contacts',
  description:
    'List all contacts with optional filtering. Use this to retrieve contacts from your CRM.',
  parameters: z.object({
    page: z.number().optional().describe('Page number (1-based, default: 1)'),
    per_page: z.number().optional().describe('Results per page (default: 25, max: 100)'),
    email: z.string().optional().describe('Filter by exact email address'),
    name: z.string().optional().describe('Filter by name (partial match on first or last name)'),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.contacts.list(args);
    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Found ${result.data.contacts.length} contacts:\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'get-contact',
  description:
    'Get a specific contact by ID. Use this to retrieve detailed information about a contact.',
  parameters: z.object({
    contactId: z.string().describe('The contact ID to retrieve'),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.contacts.retrieve(args.contactId);
    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Contact details:\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'update-contact',
  description:
    'Update an existing contact. IMPORTANT: If updating custom attributes (attributeValuesByKey), those attributes MUST already exist. Create them first with create-attribute (targetType="contact") or verify with list-attributes.',
  parameters: z.object({
    contactId: z.string().describe('The contact ID to update'),
    fullName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().optional(),
    userId: z.string().optional(),
    userGroup: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    attributeValuesByKey: z
      .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]))
      .optional()
      .describe('⚠️ Only use attribute keys that are pre-defined for contacts'),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    const { contactId, ...updateData } = args;

    log.info('Updating contact', { contactId });
    const result = await client.contacts.update(
      contactId,
      Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined))
    );

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Contact updated successfully');
    return `Contact updated successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'delete-contact',
  description: 'Delete a contact by ID or email. Use this to remove contacts from your CRM.',
  parameters: z.object({
    contactId: z.string().optional().describe('The contact ID to delete'),
    email: z.string().email().optional().describe('The contact email to delete'),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);

    if (!args.contactId && !args.email) {
      throw new Error('Either contactId or email must be provided');
    }

    const result = args.contactId
      ? await client.contacts.deleteById(args.contactId)
      : await client.contacts.delete({ email: args.email! });

    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Contact deleted successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

// ===== ATTRIBUTE TOOLS =====

server.addTool({
  name: 'create-attribute',
  description:
    '⭐ PREREQUISITE TOOL - Create custom attributes BEFORE using them in contacts/objects. For contacts: set targetType="contact". For objects: set targetType="object" and provide objectSchemaId. Attributes define the custom fields that can be used in attributeValuesByKey when creating/updating contacts or objects.',
  parameters: z.object({
    targetType: z
      .enum(['contact', 'object'])
      .describe('Whether this is a contact or object attribute'),
    objectSchemaId: z.string().optional().describe('Required if targetType is "object"'),
    key: z.string().describe('Unique attribute key (e.g., "subscription_plan")'),
    label: z.string().describe('Human-readable label (e.g., "Subscription Plan")'),
    type: z.enum(['string', 'number', 'boolean', 'date time', 'date only', 'id array']),
    description: z.string().optional(),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    const { targetType, objectSchemaId, key, label, type, description } = args;

    log.info('Creating attribute', { key, targetType });
    const result = await client.attributes.create({
      target:
        targetType === 'contact'
          ? { type: 'contact' as const }
          : { type: 'object' as const, objectSchemaId: objectSchemaId! },
      data: { key, label, type, description: description ?? null },
    });

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Attribute created successfully');
    return `Attribute created successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'batch-create-attributes',
  description:
    'Create multiple attributes in a single batch operation. Use this for bulk attribute creation.',
  parameters: z.object({
    operations: z.array(
      z.object({
        targetType: z.enum(['contact', 'object']),
        objectSchemaId: z.string().optional(),
        key: z.string(),
        label: z.string(),
        type: z.enum(['string', 'number', 'boolean', 'date time', 'date only', 'id array']),
        description: z.string().optional(),
      })
    ),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    log.info('Batch creating attributes', { count: args.operations.length });

    const result = await client.attributes.createBatch({
      operations: args.operations.map((op) => ({
        target:
          op.targetType === 'contact'
            ? { type: 'contact' as const }
            : { type: 'object' as const, objectSchemaId: op.objectSchemaId! },
        data: {
          key: op.key,
          label: op.label,
          type: op.type,
          description: op.description ?? null,
        },
      })),
    });

    if (result.error) throw new Error(JSON.stringify(result.error));
    const successCount = result.data.results.filter((r) => r.success).length;
    log.info('Batch attribute creation completed', {
      succeeded: successCount,
      total: args.operations.length,
    });
    return `Batch attribute creation completed!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'list-attributes',
  description:
    '⭐ VERIFICATION TOOL - List all attributes for contacts or objects. Use this BEFORE creating/updating contacts or objects to verify which custom attributes are available. For contacts use targetType="contact", for objects use targetType="object" with objectSchemaId.',
  parameters: z.object({
    targetType: z.enum(['contact', 'object']),
    objectSchemaId: z.string().optional(),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.attributes.list({
      target_type: args.targetType,
      ...(args.objectSchemaId && { objectSchemaId: args.objectSchemaId }),
    });

    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Found ${result.data.attributes.length} attributes:\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'delete-attribute',
  description: 'Delete a custom attribute by key.',
  parameters: z.object({
    attributeKey: z.string().describe('The attribute key to delete'),
    targetType: z.enum(['contact', 'object']),
    objectSchemaId: z.string().optional(),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.attributes.delete(args.attributeKey, {
      target:
        args.targetType === 'contact'
          ? { type: 'contact' as const }
          : { type: 'object' as const, objectSchemaId: args.objectSchemaId! },
    });

    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Attribute deleted successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

// ===== EVENT SCHEMA TOOLS =====

server.addTool({
  name: 'create-event-schema',
  description:
    '⭐ STEP 1 for Events - Create event schema with JSON Schema validation. Unlike contacts/objects (which use pre-defined attributes), events use flexible JSON Schema to validate payload structure. Define the schema once, then track unlimited events matching that structure. Example: { type: "object", properties: { email: { type: "string" }, plan: { type: "string" } }, required: ["email"] }',
  parameters: z.object({
    slug: z.string().describe('URL-friendly slug (e.g., "user-signup", "purchase-completed")'),
    name: z
      .string()
      .optional()
      .describe('Human-readable name (auto-generated from slug if not provided)'),
    description: z.string().optional().describe('Description of what this event tracks'),
    payloadJsonSchema: z
      .record(z.any())
      .optional()
      .describe(
        'JSON Schema defining event payload structure. Common: { type: "object", properties: { fieldName: { type: "string/number/boolean" } }, required: ["fieldName"] }. This validates all future track-event calls.'
      ),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    log.info('Creating event schema', { slug: args.slug });

    const result = await client.events.createSchema({
      schema: {
        slug: args.slug,
        ...(args.name !== undefined && { name: args.name }),
        description: args.description ?? null,
        ...(args.payloadJsonSchema !== undefined && { payloadJsonSchema: args.payloadJsonSchema }),
      },
    });

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Event schema created successfully');
    return `Event schema created successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'list-event-schemas',
  description:
    '⭐ VERIFICATION TOOL - List all event schemas. Use this to see which event types are available for tracking. Each schema includes its JSON Schema validation rules for payloads.',
  parameters: z.object({
    page: z.number().optional().describe('Page number (1-based, default: 1)'),
    per_page: z.number().optional().describe('Results per page (default: 25, max: 100)'),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.events.listSchemas(args);
    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Found ${result.data.events.length} event schemas:\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'get-event-schema',
  description:
    'Get a specific event schema by slug. Shows the JSON Schema validation rules and metadata for an event type. Use this to understand what payload structure is expected when tracking events.',
  parameters: z.object({
    slug: z.string().describe('Event schema slug to retrieve'),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.events.getSchema(args.slug);
    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Event schema details:\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'update-event-schema',
  description:
    '⚠️ CRITICAL: Update event schema with BACKWARD COMPATIBILITY required! MANDATORY WORKFLOW: 1) First use get-event-schema to retrieve current schema, 2) Review existing payloadJsonSchema, 3) Make changes that are BACKWARD COMPATIBLE (add optional fields, expand enums - never remove required fields or make fields more restrictive), 4) Update schema. The API will REJECT incompatible changes. Backward incompatible changes break existing event tracking.',
  parameters: z.object({
    schemaId: z
      .string()
      .describe(
        'The event schema ID to update (get this from list-event-schemas or get-event-schema)'
      ),
    name: z.string().optional().describe('Updated human-readable name (safe to change anytime)'),
    description: z.string().optional().describe('Updated description (safe to change anytime)'),
    payloadJsonSchema: z
      .record(z.any())
      .optional()
      .describe(
        '⚠️ BACKWARD COMPATIBLE JSON Schema ONLY! Must allow all previously valid payloads. Safe changes: add optional fields, expand enums, relax constraints. UNSAFE: remove required fields, make types more restrictive, remove enum values. USE get-event-schema FIRST to review current schema!'
      ),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    const { schemaId, ...updateFields } = args;

    log.info('Updating event schema', { schemaId });
    const updateData: Record<string, any> = {};
    if (updateFields.name !== undefined) updateData.name = updateFields.name;
    if (updateFields.description !== undefined) updateData.description = updateFields.description;
    if (updateFields.payloadJsonSchema !== undefined)
      updateData.payloadJsonSchema = updateFields.payloadJsonSchema;

    const result = await client.events.updateSchema({
      schemaId,
      schemaUpdates: updateData,
    });

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Event schema updated successfully');
    return `Event schema updated successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'track-event',
  description:
    '⭐ STEP 2 for Events - Track an event instance. PREREQUISITE: Event schema must exist (create-event-schema). The payload will be validated against the JSON Schema defined in the event schema. Unlike contacts/objects which require pre-defined attributes, events validate against flexible JSON Schema at runtime.',
  parameters: z.object({
    slug: z
      .string()
      .describe('Event schema slug (must match existing schema created with create-event-schema)'),
    name: z.string().describe('Event name for this specific instance'),
    payload: z
      .record(z.any())
      .describe(
        'Event data - must match the JSON Schema structure defined in the event schema. Will be validated against payloadJsonSchema.'
      ),
    eventId: z.string().optional().describe('Optional unique event ID for deduplication'),
    userId: z.string().optional().describe('Optional user/contact ID associated with this event'),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    log.info('Tracking event', { slug: args.slug, name: args.name });

    const result = await client.events.track({
      slug: args.slug,
      name: args.name,
      payload: args.payload,
      ...(args.userId !== undefined && { userId: args.userId }),
      ...(args.eventId !== undefined && { eventId: args.eventId }),
    });

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Event tracked successfully');
    return `Event tracked successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

// ===== OBJECT SCHEMA TOOLS =====

server.addTool({
  name: 'create-object-schema',
  description:
    '⭐ STEP 1 for Objects - Create an object schema (e.g., "products", "orders") BEFORE creating attributes or object instances. This defines the type of custom objects you want to store. After creating the schema, you must define attributes (step 2) before creating object instances (step 3).',
  parameters: z.object({
    slug: z.string().describe('URL-friendly slug (e.g., "products", "orders")'),
    name: z.string().optional(),
    description: z.string().optional(),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    log.info('Creating object schema', { slug: args.slug });

    const result = await client.objects.createSchema({
      schema: {
        slug: args.slug,
        ...(args.name !== undefined && { name: args.name }),
        description: args.description ?? null,
      },
    });

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Object schema created successfully');
    return `Object schema created successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'list-object-schemas',
  description: 'List all object schemas.',
  parameters: z.object({
    page: z.number().optional(),
    per_page: z.number().optional(),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.objects.listSchemas(args);
    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Found ${result.data.objects.length} object schemas:\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'update-object-schema',
  description: 'Update an existing object schema.',
  parameters: z.object({
    schemaId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    const { schemaId, ...updateFields } = args;

    log.info('Updating object schema', { schemaId });
    const updateData: Record<string, any> = {};
    if (updateFields.name !== undefined) updateData.name = updateFields.name;
    if (updateFields.description !== undefined) updateData.description = updateFields.description;

    const result = await client.objects.updateSchema({
      schemaId,
      schemaUpdates: updateData,
    });

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Object schema updated successfully');
    return `Object schema updated successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

// ===== OBJECT INSTANCE TOOLS =====

server.addTool({
  name: 'create-object',
  description:
    '⭐ STEP 3 for Objects - Create an object instance. PREREQUISITES: 1) Object schema must exist (create-object-schema), 2) All attributes in attributeValuesByKey must be pre-defined (create-attribute with targetType="object" and objectSchemaId). Verify with list-attributes first.',
  parameters: z.object({
    schemaSlug: z.string().describe('The object schema slug'),
    id: z.string().optional(),
    objectId: z.string().optional(),
    attributeValuesByKey: z
      .record(z.any())
      .describe(
        'Object attribute key-value pairs. ⚠️ All keys must be pre-defined using create-attribute with targetType="object" and this schemaSlug as objectSchemaId.'
      ),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    const { schemaSlug, ...objectData } = args;

    log.info('Creating object', { schemaSlug });
    const result = await client.objects.create(
      schemaSlug,
      Object.fromEntries(Object.entries(objectData).filter(([_, v]) => v !== undefined))
    );

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Object created successfully');
    return `Object created successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'batch-create-objects',
  description:
    'Create multiple objects in a single batch operation. PREREQUISITES: 1) Object schema must exist (create-object-schema), 2) All attributes in attributeValuesByKey must be pre-defined (create-attribute with targetType="object"). Use list-attributes to verify before batch operations.',
  parameters: z.object({
    schemaSlug: z.string(),
    objects: z.array(
      z.object({
        id: z.string().optional(),
        objectId: z.string().optional(),
        attributeValuesByKey: z
          .record(z.any())
          .describe('⚠️ All keys must be pre-defined as attributes for this object schema'),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    ),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    log.info('Batch creating objects', { schemaSlug: args.schemaSlug, count: args.objects.length });

    const result = await client.objects
      .batch(args.schemaSlug)
      .create(
        args.objects.map((obj) =>
          Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined))
        )
      );

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Batch object creation completed');
    return `Batch object creation completed!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'list-objects',
  description: 'List all objects in a specific schema.',
  parameters: z.object({
    schemaSlug: z.string(),
    page: z.number().optional(),
    per_page: z.number().optional(),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const { schemaSlug, ...options } = args;
    const result = await client.objects.list(schemaSlug, options);
    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Found ${result.data.objects.length} objects:\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'get-object',
  description: 'Get a specific object by ID.',
  parameters: z.object({
    schemaSlug: z.string(),
    objectId: z.string(),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.objects.get(args.schemaSlug, args.objectId);
    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Object details:\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'update-object',
  description:
    'Update an existing object. IMPORTANT: If updating custom attributes (attributeValuesByKey), those attributes must already be defined for this object schema. Use list-attributes to verify or create-attribute to add new attributes first.',
  parameters: z.object({
    schemaSlug: z.string(),
    objectId: z.string(),
    attributeValuesByKey: z
      .record(z.any())
      .optional()
      .describe('⚠️ Only use attribute keys that are pre-defined for this object schema'),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    const { schemaSlug, objectId, ...updateData } = args;

    log.info('Updating object', { schemaSlug, objectId });
    const result = await client.objects.update(
      schemaSlug,
      objectId,
      Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined))
    );

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Object updated successfully');
    return `Object updated successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

server.addTool({
  name: 'delete-object',
  description: 'Delete an object by ID.',
  parameters: z.object({
    schemaSlug: z.string(),
    objectId: z.string(),
  }),
  execute: async (args, { session }) => {
    const client = getClient(session);
    const result = await client.objects.deleteById(args.schemaSlug, args.objectId);
    if (result.error) throw new Error(JSON.stringify(result.error));
    return `Object deleted successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

// ===== TEMPLATE TOOLS =====

server.addTool({
  name: 'send-template',
  description: 'Send a template with data. Use this to trigger template-based communications.',
  parameters: z.object({
    templateId: z.string().describe('The template UUID to send'),
    data: z.record(z.any()).describe('Template data payload'),
  }),
  execute: async (args, { session, log }) => {
    const client = getClient(session);
    log.info('Sending template', { templateId: args.templateId });

    const result = await client.templates.send(args.templateId, { data: args.data });

    if (result.error) throw new Error(JSON.stringify(result.error));
    log.info('Template sent successfully');
    return `Template sent successfully!\n${JSON.stringify(result.data, null, 2)}`;
  },
});

// Start the server
const transportType = process.env.TRANSPORT || 'httpStream';

if (transportType === 'stdio') {
  server.start({
    transportType: 'stdio',
  });
  // In stdio mode, suppress ALL console output to avoid interfering with JSON-RPC protocol
  // MCP Inspector and other stdio clients expect only JSON messages on stdout/stderr
} else {
  server.start({
    transportType: 'httpStream',
    httpStream: {
      port: PORT,
      endpoint: '/mcp',
      stateless: process.env.STATELESS === 'true',
    },
  });

  const serverUrl = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;

  console.log('🚀 Maxclicks MCP Server');
  console.log(`🌐 Server: ${serverUrl}`);
  console.log(`📡 MCP Endpoints:`);
  console.log(`  • MCP: ${serverUrl}/mcp`);
  console.log(`  • SSE: ${serverUrl}/sse`);
  console.log(`  • Health: ${serverUrl}/health`);

  if (OAUTH_ENABLED) {
    console.log(`🔐 OAuth Discovery (RFC 8414):`);
    console.log(`  • Authorization Server: ${serverUrl}/.well-known/oauth-authorization-server`);
    console.log(`  • Protected Resource: ${serverUrl}/.well-known/oauth-protected-resource`);
  }

  console.log(`  1. Authorization: Bearer {token})`);
  console.log(`  2. X-Maxclicks-API-Key: {key} (custom header)`);
  console.log(`  3. URL path: /{api-key}/v1/mcp (non-standard)`);
  console.log(`  4. MAXCLICKS_API_KEY env var (development only)`);

  console.log(`\n⚙️  Mode: ${process.env.STATELESS === 'true' ? 'Stateless' : 'Stateful'}`);
  console.log(`✅ Server ready!`);
}
