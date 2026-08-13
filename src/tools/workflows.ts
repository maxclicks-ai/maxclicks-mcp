import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Maxclicks } from 'maxclicks';
import { jsonResult, pageResult, runTool, textResult } from './helpers.js';
import { limitField, offsetField } from './shared.js';

const idField = z.string().describe('The workflow id.');

export function registerWorkflowTools(server: McpServer, client: Maxclicks): void {
  server.registerTool(
    'trigger_workflow',
    {
      title: 'Trigger workflow',
      description:
        'Start a workflow run through its incoming-webhook step. The body is validated server-side against the step configured JSON schema.',
      inputSchema: {
        reference: z.string().describe('The incoming-webhook step reference id.'),
        body: z.record(z.unknown()).optional().describe('The run input payload.'),
      },
    },
    (args) =>
      runTool(async () => {
        await client.workflows.trigger(args.reference, args.body ?? {});
        return textResult(`Workflow triggered for reference ${args.reference}.`);
      })
  );

  server.registerTool(
    'list_workflows',
    {
      title: 'List workflows',
      description: 'List the space workflows. Paginated.',
      inputSchema: { limit: limitField, offset: offsetField },
    },
    (args) => runTool(async () => pageResult(await client.workflows.list(args)))
  );

  server.registerTool(
    'get_workflow',
    {
      title: 'Get workflow',
      description: 'Fetch a workflow by id.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.workflows.get(args.id)))
  );

  server.registerTool(
    'pause_workflow',
    {
      title: 'Pause workflow',
      description:
        'Pause a workflow so no new runs start; in-flight runs finish normally. Returns the updated workflow.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.workflows.pause(args.id)))
  );

  server.registerTool(
    'unpause_workflow',
    {
      title: 'Unpause workflow',
      description: 'Unpause a workflow so new runs can start again. Returns the updated workflow.',
      inputSchema: { id: idField },
    },
    (args) => runTool(async () => jsonResult(await client.workflows.unpause(args.id)))
  );

  server.registerTool(
    'list_workflow_runs',
    {
      title: 'List workflow runs',
      description: 'List a workflow runs. Paginated.',
      inputSchema: { id: idField, limit: limitField, offset: offsetField },
    },
    (args) =>
      runTool(async () => {
        const { id, ...params } = args;
        return pageResult(await client.workflows.listRuns(id, params));
      })
  );

  server.registerTool(
    'get_workflow_run',
    {
      title: 'Get workflow run',
      description: 'Fetch a single run of a workflow by run id.',
      inputSchema: { id: idField, runId: z.string().describe('The workflow run id.') },
    },
    (args) => runTool(async () => jsonResult(await client.workflows.getRun(args.id, args.runId)))
  );
}
