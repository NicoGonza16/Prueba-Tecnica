import { Account } from '../domain/account.js';
import type { AccountRepository } from '../domain/account.repository.js';
import { Code } from '../domain/code.js';
import {
  DuplicateAccountCodeError,
  MissingNatureError,
  NatureMismatchError,
  ParentAccountNotFoundError,
} from '../domain/errors.js';
import { toNature, type Nature } from '../domain/nature.js';
import { toNode, type AccountNode } from './account.view.js';

export interface CreateAccountInput {
  code: string;
  name: string;
  /**
   * Required for a class. Optional for the rest, which inherit it from the
   * parent: if sent, it must be valid and equal to the inherited one.
   */
  nature?: string | null;
}

/**
 * Creates an account in the catalog.
 *
 * Rules enforced here (the ones that need the repository):
 * - the code is unique in the whole catalog;
 * - a class must declare its nature;
 * - any other account needs its parent to exist and inherits its nature; a
 *   nature sent for it must be valid and match the inherited one.
 * The rest (code format, level, name) is enforced by the domain itself.
 */
export class CreateAccountUseCase {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(input: CreateAccountInput): Promise<AccountNode> {
    const code = Code.create(input.code);

    if (await this.accounts.existsByCode(code)) {
      throw new DuplicateAccountCodeError(code.value);
    }

    const nature = await this.resolveNature(code, input.nature);
    const account = Account.create({
      code: code.value,
      name: input.name,
      nature,
    });

    await this.accounts.save(account);
    // A freshly created account has no children, so it allows movements.
    return toNode(account, true);
  }

  private async resolveNature(
    code: Code,
    requested: string | null | undefined,
  ): Promise<Nature> {
    if (code.isClass) {
      if (requested === undefined || requested === null) {
        throw new MissingNatureError(code.value);
      }
      return toNature(requested);
    }

    const parentCode = code.parent()!;
    const parent = await this.accounts.findByCode(parentCode);
    if (!parent) {
      throw new ParentAccountNotFoundError(parentCode.value, code.value);
    }
    if (requested !== undefined && requested !== null) {
      const nature = toNature(requested);
      if (nature !== parent.nature) {
        throw new NatureMismatchError(code.value, nature, parent.nature);
      }
    }
    return parent.nature;
  }
}
