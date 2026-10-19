import { resolveOptionalDateRange } from '../../shared/operationalDateRange.js'

/** Janela máxima da pesquisa por período da Minha fila (dias, inclusivo). */
export const MAX_WORK_QUEUE_PERIOD_DAYS = 92

/**
 * Período da Minha fila sobre a **data planejada** do item do plano publicado.
 * - Sem `from` nem `to` → `null` (modo diário legado: `date` + atrasadas).
 * - Datas inclusivas (`YYYY-MM-DD`, dia civil de São Paulo).
 * - Só início → até início + 91 dias; só fim → desde fim − 91 dias (janela máxima de 92 dias).
 * - `from > to` ou janela acima do máximo → 400.
 */
export function resolveWorkQueuePeriod(
  from: string | null | undefined,
  to: string | null | undefined,
): { from: string; to: string } | null {
  return resolveOptionalDateRange(from, to, MAX_WORK_QUEUE_PERIOD_DAYS)
}
