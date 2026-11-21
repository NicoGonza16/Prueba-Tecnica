import type { TreeNode } from '../api/types'
import { AccountTreeNode, type TreeActions } from './AccountTreeNode'

type AccountTreeProps = TreeActions & {
  nodes: TreeNode[]
}

/**
 * Nested list of accounts. Uses the disclosure pattern (a real `<button>` with
 * `aria-expanded` per node inside nested `<ul>`s) rather than `role="tree"`,
 * because every row also holds action buttons and the tree role does not allow
 * interactive descendants. Tab moves between controls; ArrowRight / ArrowLeft
 * on a toggle expand / collapse it.
 */
export function AccountTree({ nodes, ...actions }: AccountTreeProps) {
  return (
    <ul className="tree" aria-label="Catálogo de cuentas">
      {nodes.map((node) => (
        <AccountTreeNode key={node.code} node={node} depth={0} {...actions} />
      ))}
    </ul>
  )
}
