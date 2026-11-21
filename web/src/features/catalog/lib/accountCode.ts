import type { Level, Nature } from '../api/types'

/**
 * Domain rules of the account code, mirrored from the backend so the form can
 * validate before sending: digits only, length 1 / 2 / 4 / 6.
 */
export const CODE_LENGTHS = [1, 2, 4, 6] as const

const LEVEL_BY_LENGTH: Record<number, Level> = {
  1: 'CLASS',
  2: 'GROUP',
  4: 'ACCOUNT',
  6: 'SUBACCOUNT',
}

export const LEVEL_LABELS: Record<Level, string> = {
  CLASS: 'Clase',
  GROUP: 'Grupo',
  ACCOUNT: 'Cuenta',
  SUBACCOUNT: 'Subcuenta',
}

/** Level name with its Spanish article, for running text ("el grupo", "la cuenta"). */
export const LEVEL_WITH_ARTICLE: Record<Level, string> = {
  CLASS: 'la clase',
  GROUP: 'el grupo',
  ACCOUNT: 'la cuenta',
  SUBACCOUNT: 'la subcuenta',
}

export const NATURE_LABELS: Record<Nature, string> = {
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
}

export function isValidCodeLength(length: number): boolean {
  return (CODE_LENGTHS as readonly number[]).includes(length)
}

export function levelOfCode(code: string): Level | null {
  return LEVEL_BY_LENGTH[code.length] ?? null
}

/** Prefix of the previous level (`"1105"` -> `"11"`), or null for a class / invalid length. */
export function parentCodeOf(code: string): string | null {
  const index = CODE_LENGTHS.indexOf(code.length as (typeof CODE_LENGTHS)[number])
  if (index <= 0) return null
  return code.slice(0, CODE_LENGTHS[index - 1])
}

/** Length a child of `code` must have, or null if the level admits no children. */
export function childCodeLength(code: string): number | null {
  const index = CODE_LENGTHS.indexOf(code.length as (typeof CODE_LENGTHS)[number])
  if (index === -1 || index === CODE_LENGTHS.length - 1) return null
  return CODE_LENGTHS[index + 1]
}

/** Every ancestor code of `code`, from the class down (`"110505"` -> `["1", "11", "1105"]`). */
export function ancestorCodesOf(code: string): string[] {
  const ancestors: string[] = []
  let parent = parentCodeOf(code)
  while (parent) {
    ancestors.unshift(parent)
    parent = parentCodeOf(parent)
  }
  return ancestors
}
