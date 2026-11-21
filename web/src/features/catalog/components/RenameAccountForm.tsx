import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { Spinner } from '../../../components/ui/Spinner'
import { isApiError } from '../../../lib/http'
import {
  renameAccountSchema,
  type RenameAccountFormOutput,
  type RenameAccountFormValues,
} from '../api/accounts.schemas'
import type { TreeNode } from '../api/types'
import { useRenameAccount } from '../hooks/useRenameAccount'
import { describeError, errorField } from '../lib/errorField'

/**
 * How the inline edition ended:
 * - `saved`: the API renamed the account (the tree has already refetched).
 * - `cancelled`: Escape / "Cancelar", or the name did not change (no request).
 * - `gone`: the account no longer exists on the server (ACCOUNT_NOT_FOUND).
 */
export type RenameResult = 'saved' | 'cancelled' | 'gone'

type RenameAccountFormProps = {
  account: TreeNode
  onClose: (result: RenameResult, newName?: string) => void
}

/**
 * Inline form that replaces the name inside a tree row. Enter saves, Escape
 * cancels; losing focus does NOT save (it would turn an accidental click into
 * a write). Field errors go next to the input; any other failure stays inside
 * the row with the edition still open so the user can retry.
 */
export function RenameAccountForm({ account, onClose }: RenameAccountFormProps) {
  const ids = useId()
  const inputId = `${ids}-name`
  const errorId = `${ids}-name-error`
  const formErrorId = `${ids}-form-error`

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<RenameAccountFormValues, unknown, RenameAccountFormOutput>({
    resolver: zodResolver(renameAccountSchema),
    defaultValues: { name: account.name },
  })

  const rename = useRenameAccount()
  const isPending = rename.isPending

  // The row opens in edit mode from the "Renombrar" button: move focus here
  // with the current name selected, ready to be overwritten.
  useEffect(() => {
    setFocus('name', { shouldSelect: true })
  }, [setFocus])

  const onSubmit = async ({ name }: RenameAccountFormOutput) => {
    if (isPending) return
    // Nothing changed (after trimming): close without a request.
    if (name === account.name) {
      onClose('cancelled')
      return
    }

    try {
      const renamed = await rename.mutateAsync({ code: account.code, name })
      onClose('saved', renamed.name)
    } catch (error) {
      if (isApiError(error) && error.code === 'ACCOUNT_NOT_FOUND') {
        onClose('gone')
        return
      }
      const message = describeError(error, { code: account.code })
      if (isApiError(error) && errorField(error.code) === 'name') {
        setError('name', { type: 'server', message }, { shouldFocus: true })
      } else {
        // Network, timeout, 500, VALIDATION_ERROR...: form-level error, edition stays open.
        setError('root.server', { type: 'server', message })
        setFocus('name')
      }
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    if (!isPending) onClose('cancelled')
  }

  const formError = errors.root?.server?.message
  const describedBy = [errors.name ? errorId : null, formError ? formErrorId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <form
      className="tree-node__rename"
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      onKeyDown={handleKeyDown}
      noValidate
      aria-busy={isPending}
      aria-label={`Renombrar cuenta ${account.code}`}
    >
      <label htmlFor={inputId} className="visually-hidden">
        Nuevo nombre de {account.code}
      </label>
      <input
        {...register('name')}
        id={inputId}
        className="field__input tree-node__rename-input"
        autoComplete="off"
        readOnly={isPending}
        aria-invalid={errors.name ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      <span className="tree-node__rename-actions">
        <button type="submit" className="button button--primary button--small" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner inline label="Guardando nombre" /> Guardando…
            </>
          ) : (
            'Guardar'
          )}
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => onClose('cancelled')}
          disabled={isPending}
        >
          Cancelar
        </button>
      </span>
      {errors.name && (
        <p id={errorId} className="field__error tree-node__rename-error">
          {errors.name.message}
        </p>
      )}
      {formError && (
        <div className="tree-node__rename-error">
          <ErrorMessage
            id={formErrorId}
            variant="compact"
            title="No se pudo renombrar la cuenta"
            message={formError}
          />
        </div>
      )}
    </form>
  )
}
