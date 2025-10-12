#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import minimist from 'minimist';
import { Maxclicks } from '@maxclicks/node-sdk';
import { z } from 'zod';

const argv = minimist(process.argv.slice(2));

const apiKey = argv.key || process.env.MAXCLICKS_API_KEY;

const Logger = {
  info: (message: string, meta?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [INFO] ${message}${metaStr}`);
  },
  error: (message: string, error?: any, meta?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const errorStr = error ? ` | Error: ${error.message || error}` : '';
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    console.error(`[${timestamp}] [ERROR] ${message}${errorStr}${metaStr}`);
  },
  warn: (message: string, meta?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    console.warn(`[${timestamp}] [WARN] ${message}${metaStr}`);
  },
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
      console.debug(`[${timestamp}] [DEBUG] ${message}${metaStr}`);
    }
  },
  metric: (operation: string, duration: number, meta?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [METRIC] ${operation} completed in ${duration}ms${metaStr}`);
  },
};
const CONFIG = {
  retry: {
    maxAttempts: parseInt(process.env.MAXCLICKS_RETRY_MAX_ATTEMPTS || '3', 10),
    initialDelay: parseInt(process.env.MAXCLICKS_RETRY_INITIAL_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.MAXCLICKS_RETRY_MAX_DELAY || '10000', 10),
    backoffFactor: parseFloat(process.env.MAXCLICKS_RETRY_BACKOFF_FACTOR || '2'),
  },
};

if (!apiKey) {
  console.error('╔═══════════════════════════════════════════════════════════════╗');
  console.error('║  ERROR: Maxclicks API Key Required                            ║');
  console.error('╠═══════════════════════════════════════════════════════════════╣');
  console.error('║  Please provide your Maxclicks API key using:                 ║');
  console.error('║                                                               ║');
  console.error('║  Method 1 - Command Line:                                     ║');
  console.error('║    maxclicks-mcp --key YOUR_API_KEY                           ║');
  console.error('║                                                               ║');
  console.error('║  Method 2 - Environment Variable:                             ║');
  console.error('║    export MAXCLICKS_API_KEY=YOUR_API_KEY                      ║');
  console.error('║    maxclicks-mcp                                              ║');
  console.error('║                                                               ║');
  console.error('║  Method 3 - NPX (when published):                             ║');
  console.error('║    env MAXCLICKS_API_KEY=YOUR_KEY npx -y maxclicks-mcp        ║');
  console.error('║                                                               ║');
  console.error('║  Production API:                                              ║');
  console.error('║    https://api.maxclicks.ai (fixed)                           ║');
  console.error('║                                                               ║');
  console.error('║  Get your API key from:                                       ║');
  console.error('║    https://app.maxclicks.ai/settings/developers               ║');
  console.error('╚═══════════════════════════════════════════════════════════════╝');
  process.exit(1);
}

const client = new Maxclicks(apiKey);
Logger.debug('Creating MCP server instance', {
  apiKeyPrefix: apiKey.substring(0, 8),
});

const server = new McpServer(
  {
    name: 'maxclicks-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.tool(
  'check-api-key',
  'Validate the current API key and get workspace information. Use this to verify API key validity.',
  {},
  async () => {
    const result = await client.apiKeys.check();
    if (result.error) throw new Error(JSON.stringify(result.error));

    return {
      content: [
        {
          type: 'text',
          text: `API Key is valid!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'create-contact',
  'Create a new contact in Maxclicks. Use this to add contacts to your email marketing platform.',
  {
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
        'Custom attribute key-value pairs (e.g., {"plan": "premium", "signup_date": "2024-01-01"})'
      ),
  },
  async ({
    id,
    fullName,
    firstName,
    lastName,
    email,
    phone,
    avatarUrl,
    userId,
    userGroup,
    notes,
    tags,
    attributeValuesByKey,
  }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: create-contact', { email, id });

    // Use direct API to support all ContactInput fields including id
    const result = await client.contacts.create({
      ...(id && { id }),
      ...(fullName && { fullName }),
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(avatarUrl && { avatarUrl }),
      ...(userId && { userId }),
      ...(userGroup && { userGroup }),
      ...(notes && { notes }),
      ...(tags && { tags }),
      ...(attributeValuesByKey && { attributeValuesByKey }),
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: create-contact', result.error.error.message, {
        email,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('create-contact', duration, { success: true, email });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Contact created successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'batch-create-contacts',
  'Create multiple contacts in a single batch operation. Use this for bulk contact imports.',
  {
    contacts: z
      .array(
        z.object({
          id: z.string().optional().describe('Optional contact ID for upsert'),
          fullName: z.string().optional().describe('Contact full name'),
          firstName: z.string().optional().describe('Contact first name'),
          lastName: z.string().optional().describe('Contact last name'),
          email: z.string().email().optional().describe('Contact email address'),
          phone: z.string().optional().describe('Contact phone number'),
          avatarUrl: z.string().optional().describe('Contact avatar URL'),
          userId: z.string().optional().describe('External user ID for integration'),
          userGroup: z.string().optional().describe('User group classification'),
          notes: z.string().optional().describe('Notes about the contact'),
          tags: z.array(z.string()).optional().describe('Tags to categorize the contact'),
          attributeValuesByKey: z
            .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]))
            .optional()
            .describe('Custom attribute key-value pairs'),
        })
      )
      .describe('Array of contacts to create'),
  },
  async ({ contacts }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: batch-create-contacts', {
      count: contacts.length,
    });

    // Map to ContactInput format (matches API exactly)
    const result = await client.contacts.batch().create(
      contacts.map((c) => ({
        ...(c.id && { id: c.id }),
        ...(c.fullName && { fullName: c.fullName }),
        ...(c.firstName && { firstName: c.firstName }),
        ...(c.lastName && { lastName: c.lastName }),
        ...(c.email && { email: c.email }),
        ...(c.phone && { phone: c.phone }),
        ...(c.avatarUrl && { avatarUrl: c.avatarUrl }),
        ...(c.userId && { userId: c.userId }),
        ...(c.userGroup && { userGroup: c.userGroup }),
        ...(c.notes && { notes: c.notes }),
        ...(c.tags && { tags: c.tags }),
        ...(c.attributeValuesByKey && {
          attributeValuesByKey: c.attributeValuesByKey,
        }),
      }))
    );

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: batch-create-contacts', result.error.error.message, {
        count: contacts.length,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('batch-create-contacts', duration, {
      success: true,
      count: contacts.length,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Batch contact creation completed!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'list-contacts',
  'List all contacts with optional filtering. Use this to retrieve contacts from your CRM.',
  {
    page: z.number().optional().describe('Page number (1-based, default: 1)'),
    per_page: z.number().optional().describe('Results per page (default: 25, max: 100)'),
    email: z.string().optional().describe('Filter by exact email address'),
    name: z.string().optional().describe('Filter by name (partial match on first or last name)'),
  },
  async ({ page, per_page, email, name }) => {
    const result = await client.contacts.list({ page, per_page, email, name });
    if (result.error) throw new Error(JSON.stringify(result.error));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${
            result.data.contacts.length
          } contacts:\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'get-contact',
  'Get a specific contact by ID. Use this to retrieve detailed information about a contact.',
  {
    contactId: z.string().describe('The contact ID to retrieve'),
  },
  async ({ contactId }) => {
    const result = await client.contacts.retrieve(contactId);
    if (result.error) throw new Error(JSON.stringify(result.error));

    return {
      content: [
        {
          type: 'text',
          text: `Contact details:\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'update-contact',
  'Update an existing contact. Use this to modify contact information.',
  {
    contactId: z.string().describe('The contact ID to update'),
    fullName: z.string().optional().describe('Updated full name'),
    firstName: z.string().optional().describe('Updated first name'),
    lastName: z.string().optional().describe('Updated last name'),
    email: z.string().email().optional().describe('Updated email address'),
    phone: z.string().optional().describe('Updated phone number'),
    avatarUrl: z.string().optional().describe('Updated avatar URL'),
    userId: z.string().optional().describe('Updated user ID'),
    userGroup: z.string().optional().describe('Updated user group'),
    notes: z.string().optional().describe('Updated notes'),
    tags: z.array(z.string()).optional().describe('Updated tags'),
    attributeValuesByKey: z
      .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]))
      .optional()
      .describe('Custom attribute key-value pairs to update'),
  },
  async ({
    contactId,
    fullName,
    firstName,
    lastName,
    email,
    phone,
    avatarUrl,
    userId,
    userGroup,
    notes,
    tags,
    attributeValuesByKey,
  }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: update-contact', { contactId });

    // Build UpdateContactRequest - only include defined fields
    const updateData: Record<string, any> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (userId !== undefined) updateData.userId = userId;
    if (userGroup !== undefined) updateData.userGroup = userGroup;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;
    if (attributeValuesByKey !== undefined) updateData.attributeValuesByKey = attributeValuesByKey;

    const result = await client.contacts.update(contactId, updateData);

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: update-contact', result.error.error.message, {
        contactId,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('update-contact', duration, { success: true, contactId });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Contact updated successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'delete-contact',
  'Delete a contact by ID or email. Use this to remove contacts from your CRM.',
  {
    contactId: z.string().optional().describe('The contact ID to delete'),
    email: z.string().email().optional().describe('The contact email to delete'),
  },
  async ({ contactId, email }) => {
    if (!contactId && !email) {
      throw new Error('Either contactId or email must be provided');
    }

    const result = contactId
      ? await client.contacts.deleteById(contactId)
      : await client.contacts.delete({ email: email! });

    if (result.error) throw new Error(JSON.stringify(result.error));

    return {
      content: [
        {
          type: 'text',
          text: `Contact deleted successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'create-attribute',
  'Create a new custom attribute for contacts or objects. Use this to define custom fields.',
  {
    targetType: z
      .enum(['contact', 'object'])
      .describe('Whether this is a contact or object attribute'),
    objectSchemaId: z
      .string()
      .optional()
      .describe('Required if targetType is "object" - object slug or the object schema ID'),
    key: z.string().describe('Unique attribute key (e.g., "subscription_plan")'),
    label: z.string().describe('Human-readable label (e.g., "Subscription Plan")'),
    type: z
      .enum(['string', 'number', 'boolean', 'date time', 'date only', 'id array'])
      .describe('Data type for the attribute'),
    description: z.string().optional().describe('Optional description of the attribute'),
  },
  async ({ targetType, objectSchemaId, key, label, type, description }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: create-attribute', { key, targetType });

    // Build CreateAttributeRequest matching SDK interface
    const result = await client.attributes.create({
      target:
        targetType === 'contact'
          ? { type: 'contact' as const }
          : { type: 'object' as const, objectSchemaId: objectSchemaId! },
      data: {
        key,
        label,
        type,
        description: description ?? null,
      },
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: create-attribute', result.error.error.message, {
        key,
        targetType,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('create-attribute', duration, {
      success: true,
      key,
      targetType,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Attribute created successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'batch-create-attributes',
  'Create multiple attributes in a single batch operation. Use this for bulk attribute creation.',
  {
    operations: z
      .array(
        z.object({
          targetType: z
            .enum(['contact', 'object'])
            .describe('Whether this is a contact or object attribute'),
          objectSchemaId: z
            .string()
            .optional()
            .describe('Required if targetType is "object" - object slug or the object schema ID'),
          key: z.string().describe('Unique attribute key'),
          label: z.string().describe('Human-readable label'),
          type: z
            .enum(['string', 'number', 'boolean', 'date time', 'date only', 'id array'])
            .describe('Data type for the attribute'),
          description: z.string().optional().describe('Optional description'),
        })
      )
      .describe('Array of attribute creation operations'),
  },
  async ({ operations }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: batch-create-attributes', {
      count: operations.length,
    });

    // Build BatchCreateAttributesRequest matching SDK interface
    const result = await client.attributes.createBatch({
      operations: operations.map((op) => ({
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

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: batch-create-attributes', result.error.error.message, {
        count: operations.length,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    const successCount = result.data.results.filter((r) => r.success).length;
    Logger.metric('batch-create-attributes', duration, {
      success: true,
      total: operations.length,
      succeeded: successCount,
      failed: operations.length - successCount,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Batch attribute creation completed!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'list-attributes',
  'List all attributes for contacts or a specific object schema. Use this to see available custom fields.',
  {
    targetType: z
      .enum(['contact', 'object'])
      .describe('Whether to list contact or object attributes'),
    objectSchemaId: z
      .string()
      .optional()
      .describe('Required if targetType is "object" - object slug or the object schema ID'),
  },
  async ({ targetType, objectSchemaId }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: list-attributes', {
      targetType,
      objectSchemaId,
    });

    // Build ListAttributesRequest matching SDK interface
    const result = await client.attributes.list({
      target_type: targetType,
      ...(objectSchemaId && { objectSchemaId }),
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: list-attributes', result.error.error.message, {
        targetType,
        objectSchemaId,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('list-attributes', duration, {
      success: true,
      count: result.data.attributes.length,
      targetType,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${
            result.data.attributes.length
          } attributes:\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'delete-attribute',
  'Delete a custom attribute by key. Use this to remove attributes you no longer need.',
  {
    attributeKey: z.string().describe('The attribute key to delete'),
    targetType: z
      .enum(['contact', 'object'])
      .describe('Whether this is a contact or object attribute'),
    objectSchemaId: z
      .string()
      .optional()
      .describe('Required if targetType is "object" - object slug or the object schema ID'),
  },
  async ({ attributeKey, targetType, objectSchemaId }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: delete-attribute', {
      attributeKey,
      targetType,
    });

    // Build DeleteAttributeRequest matching SDK interface
    const result = await client.attributes.delete(attributeKey, {
      target:
        targetType === 'contact'
          ? { type: 'contact' as const }
          : { type: 'object' as const, objectSchemaId: objectSchemaId! },
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: delete-attribute', result.error.error.message, {
        attributeKey,
        targetType,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('delete-attribute', duration, {
      success: true,
      attributeKey,
      targetType,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Attribute deleted successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'list-object-schemas',
  'List all object schemas. Use this to see available custom object types.',
  {
    page: z.number().optional().describe('Page number (1-based, default: 1)'),
    per_page: z.number().optional().describe('Results per page (default: 25)'),
  },
  async ({ page, per_page }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: list-object-schemas', { page, per_page });

    const result = await client.objects.listSchemas({ page, per_page });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: list-object-schemas', result.error.error.message, {
        page,
        per_page,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('list-object-schemas', duration, {
      success: true,
      count: result.data.objects.length,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${
            result.data.objects.length
          } object schemas:\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

// create object instance
server.tool(
  'create-object',
  'Create a new object instance in a schema. Use this to add custom data records.',
  {
    schemaSlug: z.string().describe('The object schema slug (e.g., "products")'),
    id: z.string().optional().describe('Optional internal ID'),
    objectId: z.string().optional().describe('Optional custom object ID'),
    attributeValuesByKey: z.record(z.any()).describe('Object attribute key-value pairs'),
    tags: z.array(z.string()).optional().describe('Optional tags to categorize the object'),
    notes: z.string().optional().describe('Optional notes about the object'),
  },
  async ({ schemaSlug, id, objectId, attributeValuesByKey, tags, notes }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: create-object', { schemaSlug, objectId });

    // Build CreateObjectRequest matching SDK interface
    const result = await client.objects.create(schemaSlug, {
      ...(id !== undefined && { id }),
      ...(objectId !== undefined && { objectId }),
      ...(attributeValuesByKey !== undefined && { attributeValuesByKey }),
      ...(tags !== undefined && { tags }),
      ...(notes !== undefined && { notes }),
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: create-object', result.error.error.message, {
        schemaSlug,
        objectId,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('create-object', duration, {
      success: true,
      schemaSlug,
      objectId,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Object created successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

// List objects instances in schema
server.tool(
  'list-objects',
  'List all objects in a specific schema. Use this to retrieve custom data records.',
  {
    schemaSlug: z.string().describe('The object schema slug (e.g., "products")'),
    page: z.number().optional().describe('Page number (1-based, default: 1)'),
    per_page: z.number().optional().describe('Results per page (default: 25)'),
  },
  async ({ schemaSlug, page, per_page }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: list-objects', {
      schemaSlug,
      page,
      per_page,
    });

    // Build ListObjectsOptions matching SDK interface
    const result = await client.objects.list(schemaSlug, { page, per_page });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: list-objects', result.error.error.message, {
        schemaSlug,
        page,
        per_page,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('list-objects', duration, {
      success: true,
      schemaSlug,
      count: result.data.objects.length,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${result.data.objects.length} objects:\n${JSON.stringify(
            result.data,
            null,
            2
          )}`,
        },
      ],
    };
  }
);

// Get object by ID
server.tool(
  'get-object',
  'Get a specific object by ID. Use this to retrieve detailed information about an object.',
  {
    schemaSlug: z.string().describe('The object schema slug (e.g., "products")'),
    objectId: z.string().describe('The object ID to retrieve'),
  },
  async ({ schemaSlug, objectId }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: get-object', { schemaSlug, objectId });

    const result = await client.objects.get(schemaSlug, objectId);

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: get-object', result.error.error.message, {
        schemaSlug,
        objectId,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('get-object', duration, {
      success: true,
      schemaSlug,
      objectId,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Object details:\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

// Update object
server.tool(
  'update-object',
  'Update an existing object. Use this to modify object data.',
  {
    schemaSlug: z.string().describe('The object schema slug (e.g., "products")'),
    objectId: z.string().describe('The object ID to update'),
    attributeValuesByKey: z.record(z.any()).describe('Updated object attribute key-value pairs'),
    tags: z.array(z.string()).optional().describe('Updated tags to categorize the object'),
    notes: z.string().optional().describe('Updated notes about the object'),
  },
  async ({ schemaSlug, objectId, attributeValuesByKey, tags, notes }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: update-object', { schemaSlug, objectId });

    // Build update request matching SDK interface
    const updateData: Record<string, any> = {};
    if (attributeValuesByKey !== undefined) updateData.attributeValuesByKey = attributeValuesByKey;
    if (tags !== undefined) updateData.tags = tags;
    if (notes !== undefined) updateData.notes = notes;

    const result = await client.objects.update(schemaSlug, objectId, updateData);

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: update-object', result.error.error.message, {
        schemaSlug,
        objectId,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('update-object', duration, {
      success: true,
      schemaSlug,
      objectId,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Object updated successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

// Delete object
server.tool(
  'delete-object',
  'Delete an object by ID. Use this to remove objects from your custom data.',
  {
    schemaSlug: z.string().describe('The object schema slug (e.g., "products")'),
    objectId: z.string().describe('The object ID to delete'),
  },
  async ({ schemaSlug, objectId }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: delete-object', { schemaSlug, objectId });

    const result = await client.objects.deleteById(schemaSlug, objectId);

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: delete-object', result.error.error.message, {
        schemaSlug,
        objectId,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('delete-object', duration, {
      success: true,
      schemaSlug,
      objectId,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Object deleted successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

// Batch create objects
server.tool(
  'batch-create-objects',
  'Create multiple objects in a single batch operation. Use this for bulk object creation.',
  {
    schemaSlug: z.string().describe('The object schema slug (e.g., "products")'),
    objects: z
      .array(
        z.object({
          id: z.string().optional().describe('Optional internal ID'),
          objectId: z.string().optional().describe('Optional custom object ID'),
          attributeValuesByKey: z.record(z.any()).describe('Object attribute key-value pairs'),
          tags: z.array(z.string()).optional().describe('Optional tags'),
          notes: z.string().optional().describe('Optional notes'),
        })
      )
      .describe('Array of objects to create'),
  },
  async ({ schemaSlug, objects }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: batch-create-objects', {
      schemaSlug,
      count: objects.length,
    });

    // Build CreateObjectRequest[] matching SDK interface
    const result = await client.objects.batch(schemaSlug).create(
      objects.map((obj) => ({
        ...(obj.id !== undefined && { id: obj.id }),
        ...(obj.objectId !== undefined && { objectId: obj.objectId }),
        ...(obj.attributeValuesByKey !== undefined && {
          attributeValuesByKey: obj.attributeValuesByKey,
        }),
        ...(obj.tags !== undefined && { tags: obj.tags }),
        ...(obj.notes !== undefined && { notes: obj.notes }),
      }))
    );

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: batch-create-objects', result.error.error.message, {
        schemaSlug,
        count: objects.length,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('batch-create-objects', duration, {
      success: true,
      schemaSlug,
      count: objects.length,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Batch object creation completed!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

// Update object schema
server.tool(
  'update-object-schema',
  'Update an existing object schema. Use this to modify object schema details.',
  {
    schemaId: z.string().describe('The object schema ID to update'),
    name: z.string().optional().describe('Updated human-readable name'),
    description: z.string().optional().describe('Updated description'),
  },
  async ({ schemaId, name, description }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: update-object-schema', { schemaId });

    // Build UpdateObjectSchemaRequest matching SDK interface
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const result = await client.objects.updateSchema({
      schemaId,
      schemaUpdates: updateData,
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: update-object-schema', result.error.error.message, {
        schemaId,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('update-object-schema', duration, {
      success: true,
      schemaId,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Object schema updated successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'create-object-schema',
  'Create a new object schema to define custom object types. Use this to create custom data structures.',
  {
    slug: z.string().describe('URL-friendly slug (e.g., "products", "orders")'),
    name: z.string().optional().describe('Optional human-readable name'),
    description: z.string().optional().describe('Optional description of the object schema'),
  },
  async ({ slug, name, description }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: create-object-schema', { slug });

    // Build CreateObjectSchemaRequest matching SDK interface
    const result = await client.objects.createSchema({
      schema: {
        slug,
        ...(name !== undefined && { name }),
        description: description ?? null,
      },
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: create-object-schema', result.error.error.message, {
        slug,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('create-object-schema', duration, { success: true, slug });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Object schema created successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'create-event-schema',
  'Create a new event schema to define event types. Use this before tracking events.',
  {
    slug: z.string().describe('URL-friendly slug (e.g., "user-signup", "purchase-completed")'),
    name: z
      .string()
      .optional()
      .describe('Optional human-readable name (auto-generated if not provided)'),
    description: z.string().optional().describe('Optional description of the event'),
    payloadJsonSchema: z
      .record(z.any())
      .optional()
      .describe('Optional JSON schema for payload validation'),
  },
  async ({ slug, name, description, payloadJsonSchema }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: create-event-schema', { slug });

    // Build CreateEventSchemaRequest matching SDK interface
    const result = await client.events.createSchema({
      schema: {
        slug,
        ...(name !== undefined && { name }),
        description: description ?? null,
        ...(payloadJsonSchema !== undefined && { payloadJsonSchema }),
      },
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: create-event-schema', result.error.error.message, {
        slug,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('create-event-schema', duration, { success: true, slug });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Event schema created successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'list-event-schemas',
  'List all event schemas. Use this to see available event types.',
  {
    page: z.number().optional().describe('Page number (1-based, default: 1)'),
    per_page: z.number().optional().describe('Results per page (default: 25)'),
  },
  async ({ page, per_page }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: list-event-schemas', { page, per_page });

    // Build ListEventSchemasRequest matching SDK interface
    const result = await client.events.listSchemas({ page, per_page });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: list-event-schemas', result.error.error.message, {
        page,
        per_page,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('list-event-schemas', duration, {
      success: true,
      count: result.data.events.length,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${
            result.data.events.length
          } event schemas:\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'get-event-schema',
  'Get a specific event schema by slug. Use this to retrieve event schema details.',
  {
    slug: z.string().describe('The event schema slug (e.g., "user-signup")'),
  },
  async ({ slug }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: get-event-schema', { slug });

    const result = await client.events.getSchema(slug);

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: get-event-schema', result.error.error.message, {
        slug,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('get-event-schema', duration, { success: true, slug });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Event schema details:\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'update-event-schema',
  'Update an existing event schema. Use this to modify event schema details.',
  {
    schemaId: z.string().describe('The event schema ID to update'),
    name: z.string().optional().describe('Updated human-readable name'),
    description: z.string().optional().describe('Updated description'),
    payloadJsonSchema: z.record(z.any()).optional().describe('Updated JSON schema for validation'),
  },
  async ({ schemaId, name, description, payloadJsonSchema }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: update-event-schema', { schemaId });

    // Build UpdateEventSchemaRequest matching SDK interface
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (payloadJsonSchema !== undefined) updateData.payloadJsonSchema = payloadJsonSchema;

    const result = await client.events.updateSchema({
      schemaId,
      schemaUpdates: updateData,
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: update-event-schema', result.error.error.message, {
        schemaId,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('update-event-schema', duration, { success: true, schemaId });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Event schema updated successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

server.tool(
  'track-event',
  'Track an event instance against an existing schema. Use this to record user actions.',
  {
    slug: z.string().describe('Event schema slug (e.g., "user-signup")'),
    name: z.string().describe('Event name'),
    userId: z.string().optional().describe('Optional user ID associated with the event'),
    payload: z.record(z.any()).describe('Event data payload'),
    eventId: z.string().optional().describe('Optional event ID for deduplication'),
  },
  async ({ slug, name, userId, payload, eventId }) => {
    const startTime = Date.now();
    Logger.info('Starting operation: track-event', { slug, name });

    // Build CreateEventRequest matching SDK interface
    const result = await client.events.track({
      slug,
      name,
      payload,
      ...(userId !== undefined && { userId }),
      ...(eventId !== undefined && { eventId }),
    });

    const duration = Date.now() - startTime;

    if (result.error) {
      Logger.error('Operation failed: track-event', result.error.error.message, {
        slug,
        name,
        duration,
        code: result.error.error.code,
        requestId: result.error.requestId,
      });
      throw new Error(JSON.stringify(result.error));
    }

    Logger.metric('track-event', duration, { success: true, slug, name });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Event tracked successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

//Send teamplate by ID
server.tool(
  'send-template',
  'Send a template with data. Use this to trigger template-based communications.',
  {
    templateId: z.string().describe('The template UUID to send'),
    data: z
      .record(z.any())
      .describe('Template data payload (must match template schema requirements)'),
  },
  async ({ templateId, data }) => {
    const result = await client.templates.send(templateId, { data });
    if (result.error) throw new Error(JSON.stringify(result.error));

    return {
      content: [
        {
          type: 'text',
          text: `Template sent successfully!\n${JSON.stringify(result.data, null, 2)}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Maxclicks MCP Server (stdio mode)');
  console.error(`📦 Version: 1.0.0`);
  console.error(`🔐 API Key: ${apiKey.substring(0, 8)}...${apiKey.slice(-8)}`);
  console.error('⚙️ Configuration: ');
  console.error(`Retry Max Attempts: ${CONFIG.retry.maxAttempts}`);
  console.error(`Retry Initial Delay: ${CONFIG.retry.initialDelay}ms`);
  console.error(`Retry Max Delay: ${CONFIG.retry.maxDelay}ms`);
  console.error('\n✅ Server running on stdio - ready for MCP connections');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
