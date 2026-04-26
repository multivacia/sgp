/**
 * Contrato oficial de erros no cliente SGP+ (severidade, causa, superfície).
 * Centraliza classificação e mensagens — evitar uma única frase genérica para todos os cenários.
 */

import {
  ApiError,
  SESSION_REVOKED_CREDENTIALS_CHANGED_CODE,
  SESSION_REVOKED_USER_MESSAGE,
} from '../api/apiErrors'

export type SgpErrorSeverity = 'leve' | 'relevante' | 'impeditivo' | 'critico'

/** Causa semântica para UX e logs (não confundir com `Error.cause`). */
export type SgpErrorCause =
  | 'sessao'
  | 'permissao'
  | 'validacao'
  | 'conflito'
  | 'operacional'
  | 'rede'
  | 'desconhecido'

export type SgpErrorSurface = 'toast' | 'banner' | 'modal'

export type SgpNormalizedError = {
  severity: SgpErrorSeverity
  cause: SgpErrorCause
  /** Mensagem segura para o utilizador */
  userMessage: string
  /** Título curto para modal bloqueante */
  modalTitle: string
  /** HTTP quando aplicável */
  status?: number
  code?: string
  /** Detalhe técnico bruto (não mostrar ao utilizador; útil em logs) */
  details?: unknown
  /** Erro original quando existir */
  original?: unknown
}

/** Mensagens distintas por cenário (evitar um único fallback genérico). */
export const SGP_ERROR_MESSAGES = {
  redeSemLigacao:
    'Não foi possível comunicar com o sistema agora. Tente novamente em instantes. Se o problema continuar, abra um chamado.',
  servicoIndisponivel:
    'O serviço está temporariamente indisponível ou em manutenção. Tente novamente dentro de instantes.',
  sessaoExpirada:
    'Sessão expirada ou não autenticado. Faça login novamente para continuar.',
  /** Mantém alinhamento com `SESSION_REVOKED_USER_MESSAGE` / backend. */
  sessaoRevogadaCredenciais: SESSION_REVOKED_USER_MESSAGE,
  semPermissao: 'Não tem permissão para esta operação. Peça acesso ao administrador se necessário.',
  recursoNaoEncontrado: 'O recurso pedido não foi encontrado ou já não existe.',
  validacao: 'Os dados enviados não são válidos. Corrija os campos indicados e tente novamente.',
  conflito:
    'Esta ação entra em conflito com o estado atual (outra alteração pode ter ocorrido). Atualize a página ou ajuste os dados.',
  operacaoServidor:
    'O servidor não conseguiu concluir a operação. Tente novamente; se persistir, contacte o suporte.',
  inesperado:
    'Ocorreu um erro inesperado. Tente novamente ou recarregue a página.',
} as const

/**
 * Só para `ApiError.message` em `NETWORK_ERROR` (consola / diagnóstico).
 * A UI usa sempre `SGP_ERROR_MESSAGES.redeSemLigacao` via `normalizeClientError`.
 */
export const SGP_NETWORK_ERROR_API_DIAGNOSTIC_MESSAGE =
  'NETWORK_ERROR: falha ao contactar a API. Em dev: confirmar proxy Vite, VITE_DEV_API_PORT e PORT em server/.env; verificar se o servidor está a correr.'

export function inferCause(
  status: number | undefined,
  code: string | undefined,
): SgpErrorCause {
  if (code === 'NETWORK_ERROR') return 'rede'
  if (status === undefined) return 'desconhecido'
  if (status === 401) {
    if (code === SESSION_REVOKED_CREDENTIALS_CHANGED_CODE) return 'sessao'
    return 'sessao'
  }
  if (status === 403) return 'permissao'
  if (status === 400 || status === 422) return 'validacao'
  if (status === 409) return 'conflito'
  if (status === 404) return 'operacional'
  if (status >= 500 && status < 600) return 'operacional'
  if (status === 0 || status === 408) return 'rede'
  return 'desconhecido'
}

export function inferSeverity(
  cause: SgpErrorCause,
  status: number | undefined,
): SgpErrorSeverity {
  if (cause === 'rede') return 'critico'
  if (cause === 'sessao' || cause === 'permissao') return 'impeditivo'
  if (cause === 'validacao' || cause === 'conflito') return 'relevante'
  if (cause === 'operacional') {
    if (status === 404) return 'impeditivo'
    return 'impeditivo'
  }
  if (cause === 'desconhecido') return 'relevante'
  return 'relevante'
}

export function modalTitleFor(
  severity: SgpErrorSeverity,
  cause: SgpErrorCause,
): string {
  if (severity === 'critico') {
    return 'Não foi possível continuar'
  }
  if (cause === 'sessao') return 'Sessão inválida'
  if (cause === 'permissao') return 'Permissão em falta'
  if (cause === 'rede') return 'Ligação em falta'
  if (cause === 'operacional') return 'Operação não concluída'
  return 'Operação bloqueada'
}

export function presentationSurfaceFor(
  severity: SgpErrorSeverity,
): SgpErrorSurface {
  if (severity === 'leve') return 'toast'
  if (severity === 'relevante') return 'banner'
  return 'modal'
}

export function isBlockingSeverity(s: SgpErrorSeverity): boolean {
  return s === 'impeditivo' || s === 'critico'
}

function refineUserMessage(api: ApiError): string {
  const { status, code, message } = api
  const m = message.trim()
  if (code === 'NETWORK_ERROR') return SGP_ERROR_MESSAGES.redeSemLigacao
  if (status === 401) {
    if (code === SESSION_REVOKED_CREDENTIALS_CHANGED_CODE) {
      return SGP_ERROR_MESSAGES.sessaoRevogadaCredenciais
    }
    /** Preferir mensagem operacional do backend (login, middleware) quando existir. */
    if (m) return m
    return SGP_ERROR_MESSAGES.sessaoExpirada
  }
  if (status === 403) return SGP_ERROR_MESSAGES.semPermissao
  if (status === 404) return SGP_ERROR_MESSAGES.recursoNaoEncontrado
  if (status === 400 || status === 422) return m || SGP_ERROR_MESSAGES.validacao
  if (status === 409) return m || SGP_ERROR_MESSAGES.conflito
  if (status !== undefined && status >= 500 && status < 600) {
    return m || SGP_ERROR_MESSAGES.servicoIndisponivel
  }
  if (status === 502 || status === 503 || status === 504) {
    return m || SGP_ERROR_MESSAGES.servicoIndisponivel
  }
  if (m) return m
  return SGP_ERROR_MESSAGES.operacaoServidor
}

/**
 * Normaliza qualquer valor lançado em `catch` para o contrato oficial.
 */
export function normalizeClientError(err: unknown): SgpNormalizedError {
  if (err instanceof ApiError) {
    const cause = inferCause(err.status, err.code)
    const severity = inferSeverity(cause, err.status)
    const userMessage = refineUserMessage(err)
    return {
      severity,
      cause,
      userMessage,
      modalTitle: modalTitleFor(severity, cause),
      status: err.status,
      code: err.code,
      details: err.details,
      original: err,
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return {
      severity: 'relevante',
      cause: 'desconhecido',
      userMessage: err.message.trim(),
      modalTitle: modalTitleFor('relevante', 'desconhecido'),
      original: err,
    }
  }
  return {
    severity: 'relevante',
    cause: 'desconhecido',
    userMessage: SGP_ERROR_MESSAGES.inesperado,
    modalTitle: modalTitleFor('relevante', 'desconhecido'),
    original: err,
  }
}

export type SgpPresentationPlan = {
  surface: SgpErrorSurface
  modalTone: 'impeditivo' | 'critico' | null
}

export function presentationPlan(n: SgpNormalizedError): SgpPresentationPlan {
  const surface = presentationSurfaceFor(n.severity)
  const modalTone =
    surface === 'modal'
      ? n.severity === 'critico'
        ? 'critico'
        : 'impeditivo'
      : null
  return { surface, modalTone }
}
