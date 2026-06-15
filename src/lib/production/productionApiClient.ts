import {
  ApiError,
  friendlyMessageForHttpStatus,
  parseErrorEnvelope,
} from '../api/apiErrors'
import { ErrorRefs } from '../errors/errorCatalog'
import { SGP_NETWORK_ERROR_API_DIAGNOSTIC_MESSAGE } from '../errors/sgpErrorContract'
import { getApiBaseUrl } from '../api/env'

type SuccessEnvelope<T> = { data: T; meta?: unknown }

/**
 * Cliente HTTP do Modo Fábrica — não dispara eventos de sessão administrativa em 401.
 */
export async function productionRequestJson<T>(
  method: string,
  path: string,
  init?: { body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const base = getApiBaseUrl()
  const pathPart = path.startsWith('/') ? path : `/${path}`
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
