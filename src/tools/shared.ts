import { z } from 'zod'

export const limitField = z.number().int().min(1).max(200).optional().describe('Page size, 1 to 200 (default 50).')
export const offsetField = z.number().int().min(0).max(10000).optional().describe('Rows to skip, 0 to 10000 (default 0).')
export const schemaField = z.string().describe('The schema id or slug.')
export const recordInputField = z
  .record(z.unknown())
  .describe(
    'Flat record fields. Set base fields and any custom attribute keys at the top level. Custom attributes must already exist on the schema (see list_attributes).'
  )
