/**
 * Types of the accounts API contract (the boundary with the backend).
 */

export const NATURES = ['DEBIT', 'CREDIT'] as const
export type Nature = (typeof NATURES)[number]

export const LEVELS = ['CLASS', 'GROUP', 'ACCOUNT', 'SUBACCOUNT'] as const
export type Level = (typeof LEVELS)[number]

/** Node of the nested catalog returned by `GET /accounts`. */
export type TreeNode = {
  code: string
  name: string
  nature: Nature
  level: Level
  allowsMovements: boolean
  children: TreeNode[]
}

/** Body of `POST /accounts`. `nature` is only sent for a class (1-digit code). */
export type CreateAccountInput = {
  code: string
  name: string
  nature?: Nature
}

/** Response of `POST /accounts` (201). */
export type Account = {
  code: string
  name: string
  nature: Nature
  level: Level
  allowsMovements: boolean
  parentCode: string | null
}

/** Error body returned by the API on any non-2xx response. */
export type ApiErrorBody = {
  code: string
  detail: string
}
