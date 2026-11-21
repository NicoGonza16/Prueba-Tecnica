import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { Spinner } from '../../../components/ui/Spinner'
import type { Account, TreeNode } from '../api/types'
import { useCatalog } from '../hooks/useCatalog'
import { useTreeExpansion } from '../hooks/useTreeExpansion'
import { ancestorCodesOf } from '../lib/accountCode'
import { accountGoneMessage, describeError } from '../lib/errorField'
import { findNode, searchTree } from '../lib/searchTree'
import { AccountTree } from './AccountTree'
import { CatalogSearch } from './CatalogSearch'
import { ConfirmDeleteDialog, type DeleteDialogResult } from './ConfirmDeleteDialog'
import { CreateAccountForm } from './CreateAccountForm'
import type { RenameResult } from './RenameAccountForm'

const NO_CODES: ReadonlySet<string> = new Set()

export function CatalogPage() {
  const catalog = useCatalog()

  // Search runs in memory over the cached tree. The deferred value keeps typing
  // responsive: the filtered tree re-renders at a lower priority.
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const result = useMemo(
    () => (catalog.data ? searchTree(catalog.data, deferredQuery) : null),
    [catalog.data, deferredQuery],
  )

  // Two independent expansion states: the user's own (`manual`) and the one of
  // the current search, which starts with the ancestors of every match opened
  // and resets whenever the query changes. Clearing the search brings back
  // `manual` untouched.
  const manual = useTreeExpansion(catalog.data)
  const searchView = useTreeExpansion(result?.nodes, {
    defaults: result?.expandCodes ?? NO_CODES,
    scope: result?.query ?? '',
  })
  const expansion = result ? searchView : manual
  const visibleNodes = result?.nodes ?? catalog.data ?? []

  // Only the code is stored: the node is derived from the cached tree, so a
  // renamed parent shows its new name and a deleted one clears itself.
  const [parentForNewCode, setParentForNewCode] = useState<string | null>(null)
  const parentForNew =
    parentForNewCode && catalog.data ? findNode(catalog.data, parentForNewCode) : null

  // Inline rename: one row at a time; starting another one cancels the previous.
  const [editingCode, setEditingCode] = useState<string | null>(null)
  // If that account disappears (deleted elsewhere) the edition ends by itself.
  const activeEditingCode =
    editingCode && catalog.data && findNode(catalog.data, editingCode) ? editingCode : null

  const [deleteTarget, setDeleteTarget] = useState<TreeNode | null>(null)
  const [highlightCode, setHighlightCode] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const deleteTriggerRef = useRef<HTMLElement | null>(null)
  const treeHeadingRef = useRef<HTMLHeadingElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const clearSearch = () => {
    setQuery('')
    searchInputRef.current?.focus()
  }

  const handleCreated = (account: Account) => {
    // Reveal the new account in the tree.
    const ancestors = ancestorCodesOf(account.code)
    manual.expandMany(ancestors)
    searchView.expandMany(ancestors)
    setHighlightCode(account.code)
  }

  const handleDelete = (node: TreeNode, trigger: HTMLElement) => {
    deleteTriggerRef.current = trigger
    setDeleteTarget(node)
  }

  const handleDeleteClosed = (outcome: DeleteDialogResult) => {
    const target = deleteTarget
    setDeleteTarget(null)
    const trigger = deleteTriggerRef.current
    deleteTriggerRef.current = null

    if (outcome === 'deleted' && target) {
      setAnnouncement(`Cuenta ${target.code} «${target.name}» eliminada.`)
      if (parentForNewCode === target.code) setParentForNewCode(null)
    }
    // Return focus to the button that opened the dialog; if its row is gone
    // (the account was deleted), fall back to the tree heading.
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus()
      else treeHeadingRef.current?.focus()
    })
  }

  const focusTreeHeading = () => treeHeadingRef.current?.focus()

  const handleRenameClosed = (node: TreeNode, outcome: RenameResult, newName?: string) => {
    // A stale form (replaced by another row's edition) must not close the current one.
    setEditingCode((current) => (current === node.code ? null : current))

    if (outcome === 'saved' && newName !== undefined) {
      setAnnouncement(`Cuenta ${node.code} renombrada a «${newName}».`)
      setHighlightCode(node.code)
    } else if (outcome === 'gone') {
      setAnnouncement(accountGoneMessage(node.code))
      // The row is about to disappear: keep focus on a stable place (unless the
      // user already moved it, e.g. into another row's edition).
      requestAnimationFrame(() => {
        const active = document.activeElement
        if (active === null || active === document.body) focusTreeHeading()
      })
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Catálogo de cuentas</h1>
        <p className="page__subtitle">Plan de cuentas contable: clases, grupos, cuentas y subcuentas.</p>
      </header>

      <main className="page__layout">
        <section className="card tree-panel" aria-labelledby="tree-heading">
          <div className="card__header">
            <h2 id="tree-heading" ref={treeHeadingRef} className="card__title" tabIndex={-1}>
              Cuentas
            </h2>
            <div className="tree-panel__toolbar">
              {catalog.data && catalog.data.length > 0 && (
                <CatalogSearch
                  value={query}
                  onChange={setQuery}
                  resultCount={result ? result.count : null}
                  inputRef={searchInputRef}
                />
              )}
              {visibleNodes.length > 0 && (
                <>
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={expansion.expandAll}
                  >
                    Expandir todo
                  </button>
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={expansion.collapseAll}
                  >
                    Colapsar todo
                  </button>
                </>
              )}
              {catalog.isFetching && !catalog.isPending && (
                <span className="muted">
                  <Spinner inline label="Actualizando catálogo" /> Actualizando…
                </span>
              )}
            </div>
          </div>

          <p className="visually-hidden" role="status">
            {announcement}
          </p>

          {catalog.isPending ? (
            <Spinner label="Cargando catálogo…" />
          ) : catalog.isError && !catalog.data ? (
            <ErrorMessage
              title="No se pudo cargar el catálogo"
              message={describeError(catalog.error)}
              action={
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => void catalog.refetch()}
                  disabled={catalog.isFetching}
                >
                  {catalog.isFetching ? 'Reintentando…' : 'Reintentar'}
                </button>
              }
            />
          ) : (
            <>
              {catalog.isError && (
                <ErrorMessage
                  variant="compact"
                  title="No se pudo actualizar el catálogo"
                  message={`${describeError(catalog.error)} Se muestran los últimos datos cargados.`}
                  action={
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => void catalog.refetch()}
                      disabled={catalog.isFetching}
                    >
                      Reintentar
                    </button>
                  }
                />
              )}
              {catalog.data.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state__title">Aún no hay cuentas</p>
                  <p className="muted">
                    Empieza creando una clase (código de 1 dígito, p. ej. <span className="mono">1</span>{' '}
                    Activo) con el formulario.
                  </p>
                </div>
              ) : result && result.count === 0 ? (
                <div className="empty-state">
                  <p className="empty-state__title">
                    Sin resultados para «{deferredQuery.trim()}»
                  </p>
                  <p className="muted">
                    Busca por el inicio del código (p. ej. <span className="mono">11</span>) o por
                    parte del nombre.
                  </p>
                  <button
                    type="button"
                    className="button button--ghost button--small empty-state__action"
                    onClick={clearSearch}
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <AccountTree
                  nodes={visibleNodes}
                  isExpanded={expansion.isExpanded}
                  toggle={expansion.toggle}
                  setExpanded={expansion.setExpanded}
                  onCreateChild={(node) => setParentForNewCode(node.code)}
                  onDelete={handleDelete}
                  highlightCode={highlightCode}
                  getMatch={result ? (code) => result.matches.get(code) : undefined}
                  editingCode={activeEditingCode}
                  onStartRename={(node) => setEditingCode(node.code)}
                  onRenameClosed={handleRenameClosed}
                  focusFallback={focusTreeHeading}
                />
              )}
            </>
          )}
        </section>

        <aside className="form-panel" aria-label="Crear cuenta">
          <CreateAccountForm
            key={parentForNew?.code ?? 'root'}
            parent={parentForNew}
            onCancelParent={() => setParentForNewCode(null)}
            onCreated={handleCreated}
          />
        </aside>
      </main>

      {deleteTarget && <ConfirmDeleteDialog account={deleteTarget} onClose={handleDeleteClosed} />}
    </div>
  )
}
