import { useRef, useState } from 'react'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { Spinner } from '../../../components/ui/Spinner'
import type { Account, TreeNode } from '../api/types'
import { useCatalog } from '../hooks/useCatalog'
import { useTreeExpansion } from '../hooks/useTreeExpansion'
import { ancestorCodesOf } from '../lib/accountCode'
import { describeError } from '../lib/errorField'
import { AccountTree } from './AccountTree'
import { ConfirmDeleteDialog, type DeleteDialogResult } from './ConfirmDeleteDialog'
import { CreateAccountForm } from './CreateAccountForm'

export function CatalogPage() {
  const catalog = useCatalog()
  const expansion = useTreeExpansion(catalog.data)

  const [parentForNew, setParentForNew] = useState<TreeNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TreeNode | null>(null)
  const [highlightCode, setHighlightCode] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const deleteTriggerRef = useRef<HTMLElement | null>(null)
  const treeHeadingRef = useRef<HTMLHeadingElement>(null)

  const handleCreated = (account: Account) => {
    // Reveal the new account in the tree.
    expansion.expandMany(ancestorCodesOf(account.code))
    setHighlightCode(account.code)
  }

  const handleDelete = (node: TreeNode, trigger: HTMLElement) => {
    deleteTriggerRef.current = trigger
    setDeleteTarget(node)
  }

  const handleDeleteClosed = (result: DeleteDialogResult) => {
    const target = deleteTarget
    setDeleteTarget(null)
    const trigger = deleteTriggerRef.current
    deleteTriggerRef.current = null

    if (result === 'deleted' && target) {
      setAnnouncement(`Cuenta ${target.code} «${target.name}» eliminada.`)
      if (parentForNew?.code === target.code) setParentForNew(null)
    }
    // Return focus to the button that opened the dialog; if its row is gone
    // (the account was deleted), fall back to the tree heading.
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus()
      else treeHeadingRef.current?.focus()
    })
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
              {catalog.isFetching && !catalog.isPending && (
                <span className="muted">
                  <Spinner inline label="Actualizando catálogo" /> Actualizando…
                </span>
              )}
              {catalog.data && catalog.data.length > 0 && (
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
              ) : (
                <AccountTree
                  nodes={catalog.data}
                  isExpanded={expansion.isExpanded}
                  toggle={expansion.toggle}
                  setExpanded={expansion.setExpanded}
                  onCreateChild={setParentForNew}
                  onDelete={handleDelete}
                  highlightCode={highlightCode}
                />
              )}
            </>
          )}
        </section>

        <aside className="form-panel" aria-label="Crear cuenta">
          <CreateAccountForm
            key={parentForNew?.code ?? 'root'}
            parent={parentForNew}
            onCancelParent={() => setParentForNew(null)}
            onCreated={handleCreated}
          />
        </aside>
      </main>

      {deleteTarget && <ConfirmDeleteDialog account={deleteTarget} onClose={handleDeleteClosed} />}
    </div>
  )
}
