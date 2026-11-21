import { Injectable } from '@nestjs/common';
import type { Account } from '../../domain/account.js';
import type { AccountRepository } from '../../domain/account.repository.js';
import type { Code } from '../../domain/code.js';

/**
 * In-memory adapter for the `AccountRepository` port, keyed by code value.
 * The data lives as long as the process (one instance per Nest application).
 */
@Injectable()
export class InMemoryAccountRepository implements AccountRepository {
  private readonly accounts = new Map<string, Account>();

  save(account: Account): Promise<void> {
    this.accounts.set(account.code.value, account);
    return Promise.resolve();
  }

  findByCode(code: Code): Promise<Account | null> {
    return Promise.resolve(this.accounts.get(code.value) ?? null);
  }

  existsByCode(code: Code): Promise<boolean> {
    return Promise.resolve(this.accounts.has(code.value));
  }

  hasChildren(code: Code): Promise<boolean> {
    for (const account of this.accounts.values()) {
      if (account.parentCode === code.value) {
        return Promise.resolve(true);
      }
    }
    return Promise.resolve(false);
  }

  findAll(): Promise<Account[]> {
    return Promise.resolve([...this.accounts.values()]);
  }

  delete(code: Code): Promise<void> {
    this.accounts.delete(code.value);
    return Promise.resolve();
  }
}
