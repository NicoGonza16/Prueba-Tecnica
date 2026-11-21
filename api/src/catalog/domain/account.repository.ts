import type { Account } from './account.js';
import type { Code } from './code.js';

/**
 * Repository port for accounts.
 *
 * This interface is owned by the DOMAIN: the domain declares what it needs to
 * persist and read accounts, without knowing how. The implementation (an
 * in-memory store, or a database adapter later) lives in the infrastructure
 * layer and depends on this interface, never the other way around. That is the
 * dependency-inversion part of Clean Architecture.
 */
export interface AccountRepository {
  /** Insert or update an account. */
  save(account: Account): Promise<void>;

  /** The account with this code, or `null` if none exists. */
  findByCode(code: Code): Promise<Account | null>;

  /** Whether an account with this code exists (cheaper than loading it). */
  existsByCode(code: Code): Promise<boolean>;

  /** Whether any account has this code as its parent. */
  hasChildren(code: Code): Promise<boolean>;

  /** Every account in the catalog, in no particular order. */
  findAll(): Promise<Account[]>;

  /** Remove the account with this code. */
  delete(code: Code): Promise<void>;
}

/**
 * Injection token for the repository port. Declared here (it is just a symbol,
 * with no NestJS dependency) so both the application and infrastructure layers
 * can reference the same token when wiring the concrete implementation.
 */
export const ACCOUNT_REPOSITORY = Symbol('AccountRepository');
