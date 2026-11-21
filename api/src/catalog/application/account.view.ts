import type { Account } from '../domain/account.js';
import type { AccountLevel } from '../domain/code.js';
import type { Nature } from '../domain/nature.js';

/**
 * Read model of a single account, as returned by the use cases.
 *
 * `allowsMovements` is not stored on the entity: it depends on whether the
 * account has children, so whoever builds the view must supply it.
 */
export interface AccountNode {
  code: string;
  name: string;
  nature: Nature;
  level: AccountLevel;
  allowsMovements: boolean;
  parentCode: string | null;
}

/** An account inside the catalog tree, with its children nested. */
export interface TreeNode {
  code: string;
  name: string;
  nature: Nature;
  level: AccountLevel;
  allowsMovements: boolean;
  children: TreeNode[];
}

/** Pure mapper from the domain entity to its read model. */
export function toNode(account: Account, allowsMovements: boolean): AccountNode {
  return {
    code: account.code.value,
    name: account.name,
    nature: account.nature,
    level: account.level,
    allowsMovements,
    parentCode: account.parentCode,
  };
}
