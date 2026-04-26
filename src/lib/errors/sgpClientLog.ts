import type { SgpNormalizedError } from './sgpErrorContract'

export type SgpClientLogContext = {
  /** Domínio funcional, ex.: esteiras, auth, admin */
  module: string
  /** Ação semântica, ex.: create_conveyor, load_matrizes */
  action: string
  /** Rota ou identificador de ecrã */
  route?: string
  /** Identificador de entidade (esteira, utilizador, …) quando fizer sentido */
  entityId?: string
  /** Contexto extra seguro (sem PII sensível) */
  extra?: Record<string, string | number | boolean | undefined>
}

/**
 * Log mínimo no cliente para suporte/operação (consola estruturada).
 * Não substitui observabilidade avançada; evitar dados sensíveis.
 */
export function logSgpClientError(
  err: SgpNormalizedError,
  ctx: SgpClientLogContext,
): void {
  const payload = {
    sgp: 'client_error',
    module: ctx.module,
    action: ctx.action,
    route: ctx.route ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
    entityId: ctx.entityId,
    severity: err.severity,
    cause: err.cause,
    code: err.code,
    status: err.status,
    ...ctx.extra,
  }
  // eslint-disable-next-line no-console -- base mínima de diagnóstico acordada para Sprint 3
  console.error(err.userMessage, payload, err.original ?? err)
}
