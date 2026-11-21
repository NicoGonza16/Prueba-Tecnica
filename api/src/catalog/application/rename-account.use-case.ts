import type { AccountRepository } from '../domain/account.repository.js';
import { Code } from '../domain/code.js';
import { AccountNotFoundError } from '../domain/errors.js';
import { toNode, type AccountNode } from './account.view.js';

export interface RenameAccountInput {
  code: string;
  name: string;
}

/**
 * Renames an existing account. Only the name changes: code, level, parent and
 * nature stay as they are. The name rules (1–100 characters after trimming)
 * are enforced by the entity's `rename`.
 *
 * `save` ("insert or update" in the port) is always called after renaming,
 * even though the in-memory adapter hands out the same instance it stores and
 * would already "see" the change: a real persistence adapter loads a copy, so
 * skipping `save` would silently lose the rename.
 */
export class RenameAccountUseCase {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(input: RenameAccountInput): Promise<AccountNode> {
    const code = Code.create(input.code);

    const account = await this.accounts.findByCode(code);
    if (!account) {
      throw new AccountNotFoundError(code.value);
    }

    account.rename(input.name);
    await this.accounts.save(account);

    const hasChildren = await this.accounts.hasChildren(code);
    return toNode(account, !hasChildren);
  }
}
