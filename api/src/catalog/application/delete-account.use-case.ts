import type { AccountRepository } from '../domain/account.repository.js';
import { Code } from '../domain/code.js';
import {
  AccountHasChildrenError,
  AccountNotFoundError,
} from '../domain/errors.js';

/** Deletes an account, as long as it exists and has no children. */
export class DeleteAccountUseCase {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(rawCode: string): Promise<void> {
    const code = Code.create(rawCode);

    if (!(await this.accounts.existsByCode(code))) {
      throw new AccountNotFoundError(code.value);
    }
    if (await this.accounts.hasChildren(code)) {
      throw new AccountHasChildrenError(code.value);
    }

    await this.accounts.delete(code);
  }
}
