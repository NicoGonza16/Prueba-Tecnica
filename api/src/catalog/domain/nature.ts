import { InvalidAccountNatureError } from './errors.js';

/**
 * The nature of an account: debit or credit.
 *
 * Business rule: only a class declares its nature; every descendant inherits
 * it. We resolve (copy) that inherited value when an account is created, so
 * every account carries its own resolved nature and the tree needs no extra
 * lookups to show it.
 */
export type Nature = 'DEBIT' | 'CREDIT';

export const NATURES: readonly Nature[] = ['DEBIT', 'CREDIT'];

export function isNature(value: unknown): value is Nature {
  return value === 'DEBIT' || value === 'CREDIT';
}

/** Validates and returns a nature, or throws a domain error. */
export function toNature(value: unknown): Nature {
  if (!isNature(value)) {
    throw new InvalidAccountNatureError(String(value));
  }
  return value;
}
