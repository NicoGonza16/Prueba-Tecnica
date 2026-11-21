import { useEffect, useId, useRef, type SyntheticEvent } from 'react'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { Spinner } from '../../../components/ui/Spinner'
import { isApiError } from '../../../lib/http'
import type { TreeNode } from '../api/types'
import { useDeleteAccount } from '../hooks/useDeleteAccount'
import { LEVEL_WITH_ARTICLE } from '../lib/accountCode'
import { describeError } from '../lib/errorField'

export type DeleteDialogResult = 'deleted' | 'cancelled'

type ConfirmDeleteDialogProps = {
  account: TreeNode
  onClose: (result: DeleteDialogResult) => void
}

/** Errors for which retrying the same request cannot succeed. */
const NON_RETRYABLE = new Set(['HAS_CHILDREN', 'ACCOUNT_NOT_FOUND'])

/**
 * Modal confirmation for `DELETE /accounts/:code`, built on the native `<dialog>`
 * (`showModal()` makes the rest of the page inert and traps focus). The page
 * mounts it only while there is an account to delete, so its mutation state is
 * always fresh.
 */
export function ConfirmDeleteDialog({ account, onClose }: ConfirmDeleteDialogProps) {
  const ids = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const deleteAccount = useDeleteAccount()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    // Safe default for a destructive action: start on "Cancelar".
    cancelRef.current?.focus()
  }, [])

  const isPending = deleteAccount.isPending
  const error = deleteAccount.error
  const canRetry = !(isApiError(error) && NON_RETRYABLE.has(error.code))

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    // Escape key: React decides when the dialog closes (never mid-request).
    event.preventDefault()
    if (!isPending) onClose('cancelled')
  }

  const handleConfirm = () => {
    deleteAccount.mutate(account.code, {
      onSuccess: () => onClose('deleted'),
      onError: () => cancelRef.current?.focus(),
    })
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby={`${ids}-title`}
      aria-describedby={`${ids}-description`}
      aria-busy={isPending}
      onCancel={handleCancel}
    >
      <h2 id={`${ids}-title`} className="dialog__title">
        Eliminar cuenta
      </h2>
      <p id={`${ids}-description`}>
        ¿Seguro que quieres eliminar {LEVEL_WITH_ARTICLE[account.level]}{' '}
        <strong className="mono">{account.code}</strong> «{account.name}»? Esta acción no se
        puede deshacer.
      </p>

      {error && (
        <ErrorMessage
          variant="compact"
          title="No se pudo eliminar la cuenta"
          message={describeError(error, { code: account.code })}
        />
      )}

      <div className="dialog__actions">
        <button
          ref={cancelRef}
          type="button"
          className="button button--ghost"
          onClick={() => onClose('cancelled')}
          disabled={isPending}
        >
          {error && !canRetry ? 'Cerrar' : 'Cancelar'}
        </button>
        <button
          type="button"
          className="button button--danger"
          onClick={handleConfirm}
          disabled={isPending || !canRetry}
        >
          {isPending ? (
            <>
              <Spinner inline label="Eliminando cuenta" /> Eliminando…
            </>
          ) : error ? (
            'Reintentar'
          ) : (
            'Eliminar'
          )}
        </button>
      </div>
    </dialog>
  )
}
