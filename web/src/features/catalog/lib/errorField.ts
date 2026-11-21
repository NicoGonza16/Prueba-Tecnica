import { isApiError } from '../../../lib/http'
import { parentCodeOf } from './accountCode'

export type AccountField = 'code' | 'name' | 'nature'

/** Stable backend error code -> form field it belongs to. */
const FIELD_BY_ERROR_CODE: Record<string, AccountField> = {
  INVALID_CODE: 'code',
  DUPLICATE_CODE: 'code',
  PARENT_NOT_FOUND: 'code',
  INVALID_NAME: 'name',
  INVALID_NATURE: 'nature',
  MISSING_NATURE: 'nature',
}

/** Field an API error must be shown next to, or null for a form-level error. */
export function errorField(errorCode: string): AccountField | null {
  return FIELD_BY_ERROR_CODE[errorCode] ?? null
}

type ErrorContext = {
  /** Account code involved in the operation, used to build specific messages. */
  code?: string
}

/**
 * Clear, user-facing (Spanish) message for an error thrown by the API layer.
 * The backend `detail` is kept as fallback for codes without a specific message.
 */
export function describeError(error: unknown, { code }: ErrorContext = {}): string {
  if (!isApiError(error)) {
    return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
  }

  switch (error.code) {
    case 'DUPLICATE_CODE':
      return code
        ? `Ya existe una cuenta con el código ${code}.`
        : 'Ya existe una cuenta con ese código.'
    case 'PARENT_NOT_FOUND': {
      const parent = code ? parentCodeOf(code) : null
      return parent
        ? `No existe la cuenta padre ${parent}. Créala antes de crear ${code}.`
        : 'No existe la cuenta padre de este código. Créala primero.'
    }
    case 'INVALID_CODE':
      return `Código inválido. ${error.detail}`
    case 'INVALID_NAME':
      return `Nombre inválido. ${error.detail}`
    case 'INVALID_NATURE':
      return 'La naturaleza debe ser Débito o Crédito.'
    case 'MISSING_NATURE':
      return 'Una clase debe declarar su naturaleza (Débito o Crédito).'
    case 'HAS_CHILDREN':
      return code
        ? `No se puede eliminar la cuenta ${code} porque tiene cuentas hijas. Elimina primero sus hijas.`
        : 'No se puede eliminar porque la cuenta tiene cuentas hijas. Elimina primero sus hijas.'
    case 'ACCOUNT_NOT_FOUND':
      return code
        ? `La cuenta ${code} ya no existe. El catálogo se ha actualizado.`
        : 'La cuenta ya no existe. El catálogo se ha actualizado.'
    case 'VALIDATION_ERROR':
      return `Datos inválidos. ${error.detail}`
    case 'INTERNAL_ERROR':
      return 'Error interno del servidor. Inténtalo de nuevo en unos momentos.'
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
    case 'INVALID_RESPONSE':
      return error.detail
    default:
      return error.detail || `Error inesperado (HTTP ${error.status}).`
  }
}

/** Raw backend detail, when it adds information beyond the user-facing message. */
export function serverDetail(error: unknown): string | null {
  if (!isApiError(error) || error.status === 0) return null
  return error.detail || null
}
