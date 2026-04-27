import {
  ApiError,
  friendlyMessageForHttpStatus,
  parseErrorEnvelope,
  SESSION_REVOKED_CREDENTIALS_CHANGED_CODE,
} from './apiErrors'
import { ErrorRefs } from '../errors/errorCatalog'
import { SGP_NETWORK_ERROR_API_DIAGNOSTIC_MESSAGE } from '../errors/sgpErrorContract'
import { getApiBaseUrl } from './env'

type SuccessEnvelope<T> = { data: T; meta?: unknown }

export async function requestJson<T>(
  method: string,
  path: string,
  init?: { body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const base = getApiBaseUrl()
  const pathPart = path.startsWith('/') ? path : `/${path}`
  /** Base vazia = mesma origem (ex.: proxy `/api` no Vite em dev). */
  const url = base ? `${base}${pathPart}` : pathPart
  const headers: Record<string, string> = { ...init?.headers }
  if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body:
        init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch (e) {
    const isNetwork =
      e instanceof TypeError ||
      (e instanceof Error &&
        (e.message.includes('Failed to fetch') ||
          e.message.includes('NetworkError') ||
          e.name === 'NetworkError'))
    const msg = isNetwork
      ? SGP_NETWORK_ERROR_API_DIAGNOSTIC_MESSAGE
      : 'Falha de ligação inesperada. Tente novamente ou recarregue a página.'
    throw new ApiError(msg, 503, {
      code: 'NETWORK_ERROR',
      errorRef: ErrorRefs.API_CLIENT_REQUEST_FAILED,
      category: 'API',
      severity: 'critical',
      cause: e,
    })
  }

  if (res.ok && res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    if (!res.ok) {
      throw new ApiError(
        friendlyMessageForHttpStatus(res.status),
        res.status,
      )
    }
    throw new ApiError('Resposta inválida do servidor.', res.status)
  }

  if (!res.ok) {
    const { message, code, errorRef, correlationId, category, severity, details } =
      parseErrorEnvelope(parsed, res.status)
    if (
      res.status === 401 &&
      code === SESSION_REVOKED_CREDENTIALS_CHANGED_CODE
    ) {
      window.dispatchEvent(
        new CustomEvent('sgp:session-revoked', { detail: { message } }),
      )
    }
    throw new ApiError(message, res.status, {
      code,
      errorRef,
      correlationId,
      category,
      severity,
      details,
    })
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    return (parsed as SuccessEnvelope<T>).data
  }
  return parsed as T
}

/**
 * POST multipart (`FormData`) com resposta JSON no envelope `{ data }` — não define
 * `Content-Type` (o browser define boundary). Alinhado a `requestJson` para erros.
 */
export async function requestMultipartJson<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const base = getApiBaseUrl()
  const pathPart = path.startsWith('/') ? path : `/${path}`
  const url = base ? `${base}${pathPart}` : pathPart

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
  } catch (e) {
    const isNetwork =
      e instanceof TypeError ||
      (e instanceof Error &&
        (e.message.includes('Failed to fetch') ||
          e.message.includes('NetworkError') ||
          e.name === 'NetworkError'))
    const msg = isNetwork
      ? SGP_NETWORK_ERROR_API_DIAGNOSTIC_MESSAGE
      : 'Falha de ligação inesperada. Tente novamente ou recarregue a página.'
    throw new ApiError(msg, 503, {
      code: 'NETWORK_ERROR',
      errorRef: ErrorRefs.API_CLIENT_REQUEST_FAILED,
      category: 'API',
      severity: 'critical',
      cause: e,
    })
  }

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    if (!res.ok) {
      throw new ApiError(
        friendlyMessageForHttpStatus(res.status),
        res.status,
      )
    }
    throw new ApiError('Resposta inválida do servidor.', res.status)
  }

  if (!res.ok) {
    const { message, code, errorRef, correlationId, category, severity, details } =
      parseErrorEnvelope(parsed, res.status)
    if (
      res.status === 401 &&
      code === SESSION_REVOKED_CREDENTIALS_CHANGED_CODE
    ) {
      window.dispatchEvent(
        new CustomEvent('sgp:session-revoked', { detail: { message } }),
      )
    }
    throw new ApiError(message, res.status, {
      code,
      errorRef,
      correlationId,
      category,
      severity,
      details,
    })
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    return (parsed as SuccessEnvelope<T>).data
  }
  return parsed as T
}
