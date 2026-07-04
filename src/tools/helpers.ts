import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { MaxclicksError } from 'maxclicks'

/** Wraps any JSON-serializable value as a text tool result. */
export function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data ?? null, null, 2) }] }
}

/** Wraps a plain message as a text tool result. */
export function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] }
}

/** Renders a paginated SDK result (data plus pagination and warnings). */
export function pageResult(page: { data: unknown; pagination: unknown; warnings: unknown }): CallToolResult {
  return jsonResult({ data: page.data, pagination: page.pagination, warnings: page.warnings })
}

/**
 * Runs a tool body, converting a thrown `MaxclicksError` into a structured
 * error result (status, code, type, message) rather than a raw stack.
 */
export async function runTool(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof MaxclicksError)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { error: { status: error.status, code: error.code, type: error.type, message: error.message } },
              null,
              2
            ),
          },
        ],
        isError: true,
      }
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    }
  }
}
