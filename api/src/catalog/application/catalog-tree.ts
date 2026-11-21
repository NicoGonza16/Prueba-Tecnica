import type { Account } from '../domain/account.js';
import type { TreeNode } from './account.view.js';

/**
 * Builds the catalog tree from a flat list of accounts.
 *
 * - Roots are the accounts without a parent in the list (the classes, since the
 *   create use case never lets a non-class account exist without its parent).
 * - Children are nested under their `parentCode`.
 * - Every level is sorted by code ascending. Siblings always have the same
 *   length, so comparing them as strings equals comparing them as numbers,
 *   and leading zeros are respected.
 * - `allowsMovements` is true only for accounts without children.
 */
export function buildTree(accounts: readonly Account[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const account of accounts) {
    nodes.set(account.code.value, {
      code: account.code.value,
      name: account.name,
      nature: account.nature,
      level: account.level,
      allowsMovements: true,
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const account of accounts) {
    const node = nodes.get(account.code.value)!;
    const parent =
      account.parentCode === null ? undefined : nodes.get(account.parentCode);
    if (parent) {
      parent.children.push(node);
      parent.allowsMovements = false;
    } else {
      roots.push(node);
    }
  }

  sortByCode(roots);
  return roots;
}

function sortByCode(nodes: TreeNode[]): void {
  nodes.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  for (const node of nodes) {
    sortByCode(node.children);
  }
}
