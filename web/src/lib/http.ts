/**
 * Thin wrapper around native `fetch`.
 *
 * Every failure is normalised into an `ApiError { status, code, detail }` so the
 * rest of the app only ever handles one error shape:
 *  - non-2xx response  -> status + the backend's `{ code, detail }` body
 *  - network failure   -> status 0, code NETWORK_ERROR (backend down, CORS, DNS...)
 *  - timeout           -> status 0, code TIMEOUT
 */

export const API_URL: string = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '')

const REQUEST_TIMEOUT_MS = 15_000

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly detail: string

  constructor(status: number, code: string, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function request<T>(
  path: string,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers:
        body === undefined
          ? { Accept: 'application/json' }
          : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: combinedSignal,
    })
  } catch (cause) {
    // Cancellation requested by the caller (e.g. React Query): let it propagate untouched.
    if (signal?.aborted) throw cause
    if (timeout.aborted) {
      throw new ApiError(
        0,
        'TIMEOUT',
        `El servidor (${API_URL}) tardó demasiado en responder. Inténtalo de nuevo.`,
      )
    }
    // The browser reports CORS rejections and an unreachable host with the same
    // opaque TypeError, so the message mentions both causes instead of hiding them.
    console.error(`[http] ${method} ${path} falló a nivel de red:`, cause)
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `No se pudo conectar con el servidor (${API_URL}). Comprueba que el backend esté en ejecución y que tenga CORS habilitado para este origen.`,
    )
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  if (text === '') return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'El servidor devolvió una respuesta que no es JSON válido.',
    )
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const fallbackCode = response.status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR'
  const fallbackDetail = `Error HTTP ${response.status}${response.statusText ? ` (${response.statusText})` : ''}.`

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return new ApiError(response.status, fallbackCode, fallbackDetail)
  }

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>
    const code = typeof record.code === 'string' ? record.code : fallbackCode
    // `detail` is the agreed contract; `message` covers a stock NestJS error body.
    const rawDetail = record.detail ?? record.message
    const detail =
      typeof rawDetail === 'string'
        ? rawDetail
        : Array.isArray(rawDetail)
          ? rawDetail.join(' ')
          : fallbackDetail
    return new ApiError(response.status, code, detail)
  }

  return new ApiError(response.status, fallbackCode, fallbackDetail)
}
