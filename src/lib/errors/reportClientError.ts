import { logSgpClientError, type SgpClientLogContext } from './sgpClientLog'
import { normalizeClientError, type SgpNormalizedError } from './sgpErrorContract'

/** Normaliza, regista no log mínimo e devolve o contrato oficial. */
export function reportClientError(
  err: unknown,
  logCtx: SgpClientLogContext,
): SgpNormalizedError {
  const n = normalizeClientError(err)
  logSgpClientError(n, logCtx)
  return n
}
