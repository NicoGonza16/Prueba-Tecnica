import type { KeyboardEvent } from 'react'
import type { TreeNode } from '../api/types'
import { LEVEL_LABELS, NATURE_LABELS } from '../lib/accountCode'

export type TreeActions = {
  isExpanded: (code: string) => boolean
  toggle: (code: string) => void
  setExpanded: (code: string, value: boolean) => void
  onCreateChild: (node: TreeNode) => void
  onDelete: (node: TreeNode, trigger: HTMLElement) => void
  /** Code of the account to highlight (e.g. just created). */
  highlightCode?: string | null
}

type AccountTreeNodeProps = TreeActions & {
  node: TreeNode
  depth: number
}

export function AccountTreeNode({ node, depth, ...actions }: AccountTreeNodeProps) {
  const { isExpanded, toggle, setExpanded, onCreateChild, onDelete, highlightCode } = actions
  const hasChildren = node.children.length > 0
  const expanded = hasChildren && isExpanded(node.code)
  const canHaveChildren = node.level !== 'SUBACCOUNT'
  const label = `${node.code} ${node.name}`
  const childrenId = `tree-children-${node.code}`

  function handleToggleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowRight' && !expanded) {
      event.preventDefault()
      setExpanded(node.code, true)
    } else if (event.key === 'ArrowLeft' && expanded) {
      event.preventDefault()
      setExpanded(node.code, false)
    }
  }

  return (
    <li className="tree-node">
      <div
        className={`tree-node__row${highlightCode === node.code ? ' tree-node__row--highlight' : ''}`}
        style={{ paddingInlineStart: `calc(${depth} * var(--tree-indent))` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="tree-node__toggle"
            aria-expanded={expanded}
            aria-controls={expanded ? childrenId : undefined}
            aria-label={`${expanded ? 'Colapsar' : 'Expandir'} ${label}`}
            onClick={() => toggle(node.code)}
            onKeyDown={handleToggleKeyDown}
          >
            <span className="tree-node__chevron" aria-hidden="true" />
          </button>
        ) : (
          <span className="tree-node__toggle tree-node__toggle--leaf" aria-hidden="true" />
        )}

        <span className="tree-node__code">{node.code}</span>
        <span className="tree-node__name">{node.name}</span>

        <span className="tree-node__badges">
          <span className={`badge badge--level badge--${node.level.toLowerCase()}`}>
            {LEVEL_LABELS[node.level]}
          </span>
          <span className={`badge badge--${node.nature.toLowerCase()}`}>
            {NATURE_LABELS[node.nature]}
          </span>
          {node.allowsMovements && (
            <span className="badge badge--movements" title="Admite movimientos contables">
              Admite movimientos
            </span>
          )}
        </span>

        <span className="tree-node__actions">
          {canHaveChildren && (
            <button
              type="button"
              className="button button--ghost button--small"
              aria-label={`Crear cuenta hija de ${label}`}
              onClick={() => onCreateChild(node)}
            >
              + Hija
            </button>
          )}
          <button
            type="button"
            className="button button--danger-ghost button--small"
            aria-label={`Eliminar cuenta ${label}`}
            onClick={(event) => onDelete(node, event.currentTarget)}
          >
            Eliminar
          </button>
        </span>
      </div>

      {expanded && (
        <ul id={childrenId} className="tree-node__children" aria-label={`Hijas de ${label}`}>
          {node.children.map((child) => (
            <AccountTreeNode key={child.code} node={child} depth={depth + 1} {...actions} />
          ))}
        </ul>
      )}
    </li>
  )
}
