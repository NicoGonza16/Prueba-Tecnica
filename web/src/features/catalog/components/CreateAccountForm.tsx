import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { Spinner } from '../../../components/ui/Spinner'
import { isApiError } from '../../../lib/http'
import {
  buildCreateAccountSchema,
  toCreateAccountInput,
  type CreateAccountFormOutput,
  type CreateAccountFormValues,
} from '../api/accounts.schemas'
import { NATURES, type Account, type TreeNode } from '../api/types'
import { useCreateAccount } from '../hooks/useCreateAccount'
import {
  LEVEL_LABELS,
  NATURE_LABELS,
  childCodeLength,
  levelOfCode,
  parentCodeOf,
} from '../lib/accountCode'
import { describeError, errorField } from '../lib/errorField'

type CreateAccountFormProps = {
  /** When set, the form creates a child of this account (code prefixed, nature inherited). */
  parent?: TreeNode | null
  onCancelParent?: () => void
  onCreated?: (account: Account) => void
}

export function CreateAccountForm({ parent, onCancelParent, onCreated }: CreateAccountFormProps) {
  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`
  const errorId = (name: string) => `${ids}-${name}-error`

  // The page remounts this component (via `key`) when the parent changes,
  // so the schema and default values can be computed once.
  const [schema] = useState(() =>
    buildCreateAccountSchema(parent ? { code: parent.code, name: parent.name } : undefined),
  )
  const defaultValues: CreateAccountFormValues = { code: parent?.code ?? '', name: '', nature: '' }

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateAccountFormValues, unknown, CreateAccountFormOutput>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const createAccount = useCreateAccount()
  const [created, setCreated] = useState<Account | null>(null)

  const codeInputRef = useRef<HTMLInputElement | null>(null)
  const { ref: registerCodeRef, ...codeField } = register('code')

  const focusCode = () => {
    const input = codeInputRef.current
    if (!input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }

  // In "create child" mode the user arrives from a tree button: move focus here
  // with the caret after the parent prefix. Mount-only on purpose: the page
  // remounts the form for each new parent, and refetches must not steal focus.
  const [autoFocusOnMount] = useState(() => Boolean(parent))
  useEffect(() => {
    if (!autoFocusOnMount) return
    const input = codeInputRef.current
    if (!input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [autoFocusOnMount])

  const code = (useWatch({ control, name: 'code' }) ?? '').trim()
  const level = levelOfCode(code)
  const isClass = !parent && /^\d$/.test(code)
  const freeParentCode = !parent && level && level !== 'CLASS' ? parentCodeOf(code) : null
  const expectedChildLength = parent ? childCodeLength(parent.code) : null

  const onSubmit = async (values: CreateAccountFormOutput) => {
    setCreated(null)
    try {
      const account = await createAccount.mutateAsync(toCreateAccountInput(values))
      setCreated(account)
      reset(defaultValues)
      focusCode()
      onCreated?.(account)
    } catch (error) {
      const message = describeError(error, { code: values.code })
      const field = isApiError(error) ? errorField(error.code) : null
      const fieldVisible = field !== null && (field !== 'nature' || values.code.length === 1)
      if (field && fieldVisible) {
        setError(field, { type: 'server', message }, { shouldFocus: true })
      } else {
        setError('root.server', { type: 'server', message })
      }
    }
  }

  const isPending = createAccount.isPending

  return (
    <form
      className="card create-form"
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      noValidate
      aria-busy={isPending}
      aria-labelledby={fieldId('title')}
    >
      <div className="card__header">
        <h2 id={fieldId('title')} className="card__title">
          {parent ? 'Nueva cuenta hija' : 'Nueva cuenta'}
        </h2>
        {parent && onCancelParent && (
          <button type="button" className="button button--ghost button--small" onClick={onCancelParent}>
            Crear cuenta libre
          </button>
        )}
      </div>

      {parent && (
        <p className="create-form__parent">
          Hija de <strong className="mono">{parent.code}</strong> {parent.name} ·{' '}
          {LEVEL_LABELS[parent.level]}
        </p>
      )}

      {/* Code */}
      <div className="field">
        <label className="field__label" htmlFor={fieldId('code')}>
          Código
        </label>
        <input
          {...codeField}
          ref={(element) => {
            registerCodeRef(element)
            codeInputRef.current = element
          }}
          id={fieldId('code')}
          className="field__input mono"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          placeholder={parent ? `${parent.code}…` : 'Ej. 1, 11, 1105, 110505'}
          aria-invalid={errors.code ? true : undefined}
          aria-describedby={`${fieldId('code-hint')}${errors.code ? ` ${errorId('code')}` : ''}`}
        />
        <p id={fieldId('code-hint')} className="field__hint">
          {parent && expectedChildLength
            ? `${expectedChildLength} dígitos, empezando por ${parent.code}.`
            : level
              ? `Nivel: ${LEVEL_LABELS[level]}${freeParentCode ? ` · cuenta padre: ${freeParentCode}` : ''}`
              : 'Solo dígitos: 1 (clase), 2 (grupo), 4 (cuenta) o 6 (subcuenta).'}
        </p>
        {errors.code && (
          <p id={errorId('code')} className="field__error">
            {errors.code.message}
          </p>
        )}
      </div>

      {/* Name */}
      <div className="field">
        <label className="field__label" htmlFor={fieldId('name')}>
          Nombre
        </label>
        <input
          {...register('name')}
          id={fieldId('name')}
          className="field__input"
          autoComplete="off"
          placeholder="Ej. Caja"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? errorId('name') : undefined}
        />
        {errors.name && (
          <p id={errorId('name')} className="field__error">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Nature: only asked for a class; any other level inherits it. */}
      {isClass ? (
        <fieldset
          className="field field--fieldset"
          aria-invalid={errors.nature ? true : undefined}
          aria-describedby={errors.nature ? errorId('nature') : undefined}
        >
          <legend className="field__label">Naturaleza</legend>
          <div className="field__options">
            {NATURES.map((nature) => (
              <label key={nature} className="field__option">
                <input type="radio" value={nature} {...register('nature')} />
                {NATURE_LABELS[nature]}
              </label>
            ))}
          </div>
          {errors.nature && (
            <p id={errorId('nature')} className="field__error">
              {errors.nature.message}
            </p>
          )}
        </fieldset>
      ) : (
        <p className="field__hint create-form__nature-hint">
          {parent
            ? `Naturaleza: ${NATURE_LABELS[parent.nature]} (heredada de la cuenta padre).`
            : 'La naturaleza solo se indica al crear una clase (1 dígito); el resto la hereda.'}
        </p>
      )}

      {errors.root?.server?.message && (
        <ErrorMessage
          variant="compact"
          title="No se pudo crear la cuenta"
          message={errors.root.server.message}
        />
      )}

      {created && !isPending && (
        <p className="success-message" role="status">
          Cuenta <strong className="mono">{created.code}</strong> «{created.name}» creada.
        </p>
      )}

      <div className="create-form__actions">
        <button type="submit" className="button button--primary" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner inline label="Creando cuenta" /> Creando…
            </>
          ) : (
            'Crear cuenta'
          )}
        </button>
      </div>
    </form>
  )
}
