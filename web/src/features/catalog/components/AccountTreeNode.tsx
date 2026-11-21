import { useRef, type KeyboardEvent } from 'react'
import type { TreeNode } from '../api/types'
import { LEVEL_LABELS, NATURE_LABELS } from '../lib/accountCode'
import type { NodeMatch } from '../lib/searchTree'
import { HighlightedText } from './HighlightedText'
import { RenameAccountForm, type RenameResult } from './RenameAccountForm'

export type TreeActions = {
  isExpanded: (code: string) => boolean
  toggle: (code: string) => void
  setExpanded: (code: string, value: boolean) => void
  onCreateChild: (node: TreeNode) => void
  onDelete: (node: TreeNode, trigger: HTMLElement) => void
  /** Code of the account to highlight (e.g. just created or renamed). */
  highlightCode?: string | null
  /** Search match of a node, to highlight the matching part of its code / name. */
  getMatch?: (code: string) => NodeMatch | undefined
  /** Code of the row being renamed inline (one at a time), or null. */
  editingCode?: string | null
  onStartRename: (node: TreeNode) => void
  onRenameClosed: (node: TreeNode, result: RenameResult, newName?: string) => void
  /** Where focus goes when the row that should receive it no longer exists. */
  focusFallback: () => void
}

type AccountTreeNodeProps = TreeActions & {
  node: TreeNode
  depth: number
}

/**
 * True when nothing meaningful has focus (the focused control was unmounted).
 * Used to avoid stealing focus from wherever the user already moved it.
 */
function isFocusLost(): boolean {
  const active = document.activeElement
  return active === null || active === document.body
}

export function AccountTreeNode({ node, depth, ...actions }: AccountTreeNodeProps) {
  const {
    isExpanded,
    toggle,
    setExpanded,
    onCreateChild,
    onDelete,
    highlightCode,
    getMatch,
    editingCode,
    onStartRename,
    onRenameClosed,
    focusFallback,
  } = actions
  const renameButtonRef = useRef<HTMLButtonElement>(null)

  const match = getMatch?.(node.code)
  const isEditing = editingCode === node.code
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

  function handleRenameClosed(result: RenameResult, newName?: string) {
    onRenameClosed(node, result, newName)
    // `gone`: the page moves focus (the row is about to disappear).
    if (result === 'gone') return
    // Back to this row's "Renombrar" button once it is rendered again; if the row
    // no longer exists (e.g. the new name no longer matches the search), fall back.
    requestAnimationFrame(() => {
      if (!isFocusLost()) return
      const button = renameButtonRef.current
      if (button?.isConnected) button.focus()
      else focusFallback()
    })
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

        <span className="tree-node__code">
          <HighlightedText
            text={node.code}
            range={match && match.codeLength > 0 ? { start: 0, end: match.codeLength } : null}
          />
        </span>

        {isEditing ? (
          <RenameAccountForm account={node} onClose={handleRenameClosed} />
        ) : (
          <span className="tree-node__name">
            <HighlightedText text={node.name} range={match?.nameRange} />
          </span>
        )}

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

        {!isEditing && (
          <span className="tree-node__actions">
            <button
              ref={renameButtonRef}
              type="button"
              className="button button--ghost button--small"
              aria-label={`Renombrar cuenta ${label}`}
              onClick={() => onStartRename(node)}
            >
              Renombrar
            </button>
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
        )}
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
