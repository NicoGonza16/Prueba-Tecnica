import type { z } from 'zod'
import { ApiError, request } from '../../../lib/http'
import { accountSchema, catalogSchema } from './accounts.schemas'
import type { Account, CreateAccountInput, RenameAccountInput, TreeNode } from './types'

/** Validates a response against its schema so contract drift surfaces as a visible error. */
function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('[accounts.api] Respuesta inesperada del servidor:', result.error)
    throw new ApiError(
      200,
      'INVALID_RESPONSE',
      'El servidor devolvió datos con un formato inesperado.',
    )
  }
  return result.data
}

export async function getCatalog(signal?: AbortSignal): Promise<TreeNode[]> {
  const data = await request<unknown>('/accounts', { signal })
  return parseResponse(catalogSchema, data)
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const data = await request<unknown>('/accounts', { method: 'POST', body: input })
  return parseResponse(accountSchema, data)
}

export async function renameAccount({ code, name }: RenameAccountInput): Promise<Account> {
  const data = await request<unknown>(`/accounts/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    body: { name },
  })
  return parseResponse(accountSchema, data)
}

export async function deleteAccount(code: string): Promise<void> {
  await request<void>(`/accounts/${encodeURIComponent(code)}`, { method: 'DELETE' })
}
