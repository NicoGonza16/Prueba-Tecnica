import { isApiError } from '../../../lib/http'
import { MAX_NAME_LENGTH, parentCodeOf } from './accountCode'

export type AccountField = 'code' | 'name' | 'nature'

/** Stable backend error code -> form field it belongs to. */
const FIELD_BY_ERROR_CODE: Record<string, AccountField> = {
  INVALID_CODE: 'code',
  DUPLICATE_CODE: 'code',
  PARENT_NOT_FOUND: 'code',
  INVALID_NAME: 'name',
  INVALID_NATURE: 'nature',
  MISSING_NATURE: 'nature',
  NATURE_MISMATCH: 'nature',
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
 * The backend `detail` is in English, so it is never shown: every known code
 * has its own message and unknown codes get a generic one.
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
      return 'Código inválido: usa solo dígitos y una longitud de 1, 2, 4 o 6.'
    case 'INVALID_NAME':
      return `Nombre inválido: no puede estar vacío ni tener más de ${MAX_NAME_LENGTH} caracteres.`
    case 'INVALID_NATURE':
      return 'La naturaleza debe ser Débito o Crédito.'
    case 'MISSING_NATURE':
      return 'Una clase debe declarar su naturaleza (Débito o Crédito).'
    case 'NATURE_MISMATCH':
      return 'La naturaleza se hereda de la clase y no puede ser distinta a la de la cuenta padre.'
    case 'PAYLOAD_TOO_LARGE':
      return 'Los datos enviados son demasiado grandes.'
    case 'HAS_CHILDREN':
      return code
        ? `No se puede eliminar la cuenta ${code} porque tiene cuentas hijas. Elimina primero sus hijas.`
        : 'No se puede eliminar porque la cuenta tiene cuentas hijas. Elimina primero sus hijas.'
    case 'ACCOUNT_NOT_FOUND':
      return code
        ? `La cuenta ${code} ya no existe. El catálogo se ha actualizado.`
        : 'La cuenta ya no existe. El catálogo se ha actualizado.'
    case 'VALIDATION_ERROR':
      return 'Los datos enviados no tienen el formato esperado. Revisa los campos e inténtalo de nuevo.'
    case 'INTERNAL_ERROR':
      return 'Error interno del servidor. Inténtalo de nuevo en unos momentos.'
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
    case 'INVALID_RESPONSE':
      return error.detail
    default:
      // Unknown code: the backend detail is in English, so keep the message generic.
      return `Error inesperado del servidor (HTTP ${error.status}). Inténtalo de nuevo.`
  }
}
