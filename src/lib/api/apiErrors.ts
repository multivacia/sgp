/** Espelha `ErrorCodes.SESSION_REVOKED_CREDENTIALS_CHANGED` no servidor. */
export const SESSION_REVOKED_CREDENTIALS_CHANGED_CODE =
  'SESSION_REVOKED_CREDENTIALS_CHANGED'

/** Texto alinhado à mensagem devolvida pelo backend para 401 por credenciais alteradas. */
export const SESSION_REVOKED_USER_MESSAGE =
  'Sua sessão foi encerrada porque suas credenciais foram alteradas. Faça login novamente.'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    options?: { code?: string; details?: unknown; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = 'ApiError'
    this.status = status
    this.code = options?.code
    this.details = options?.details
  }
}

export function friendlyMessageForHttpStatus(status: number, fallback?: string): string {
  switch (status) {
    case 401:
      return 'Sessão expirada ou não autenticado. Faça login novamente.'
    case 403:
      return fallback ?? 'Você não tem permissão para esta ação.'
    case 404:
      return 'O recurso pedido não foi encontrado ou já não existe.'
    case 409:
      return fallback ?? 'Não foi possível concluir: conflito com o estado atual.'
    case 422:
      return fallback ?? 'Dados inválidos. Verifique os campos e tente de novo.'
    case 500:
    case 502:
    case 503:
      return 'Serviço temporariamente indisponível. Tente novamente em instantes.'
    default:
      return fallback ?? 'Não foi possível completar a operação.'
  }
}

type ErrorEnvelope = {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

/** Quando o servidor ainda envia só "Dados inválidos.", usa o primeiro erro do flatten Zod. */
function messageFromValidationDetails(details: unknown): string | undefined {
  if (!details || typeof details !== 'object') return undefined
  const d = details as {
    fieldErrors?: Record<string, string[] | undefined>
    formErrors?: string[]
  }
  const fe = d.formErrors
  if (Array.isArray(fe) && fe[0]?.trim()) return fe[0].trim()
  const fields = d.fieldErrors
  if (fields && typeof fields === 'object') {
    for (const [path, msgs] of Object.entries(fields)) {
      const m = msgs?.[0]?.trim()
      if (path && m) return `${path}: ${m}`
    }
  }
  return undefined
}

export function parseErrorEnvelope(
  json: unknown,
  status: number,
): { message: string; code?: string; details?: unknown } {
  if (!json || typeof json !== 'object') {
    return { message: friendlyMessageForHttpStatus(status) }
  }
  const e = json as ErrorEnvelope
  const raw =
    typeof e.error?.message === 'string' && e.error.message.trim()
      ? e.error.message.trim()
      : friendlyMessageForHttpStatus(status)
  const fromDetails =
    raw === 'Dados inválidos.'
      ? messageFromValidationDetails(e.error?.details)
      : undefined
  const msg = fromDetails ?? raw
  return {
    message: msg,
    code: typeof e.error?.code === 'string' ? e.error.code : undefined,
    details: e.error?.details,
  }
}
