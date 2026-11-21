import type { AccountRepository } from '../domain/account.repository.js';
import type { TreeNode } from './account.view.js';
import { buildTree } from './catalog-tree.js';

/** Returns the whole catalog as a tree rooted at the classes. */
export class GetCatalogUseCase {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(): Promise<TreeNode[]> {
    return buildTree(await this.accounts.findAll());
  }
}
