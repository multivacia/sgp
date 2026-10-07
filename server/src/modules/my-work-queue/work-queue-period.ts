import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { parseIsoDateUtc } from '../operational-planning/operational-planning.week.js'

/** Janela máxima da pesquisa por período da Minha fila (dias, inclusivo). */
export const MAX_WORK_QUEUE_PERIOD_DAYS = 92

const MS_DAY = 86_400_000

function shiftIsoDate(dateIso: string, deltaDays: number): string {
  const d = new Date(parseIsoDateUtc(dateIso).getTime() + deltaDays * MS_DAY)
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function inclusiveDaySpan(from: string, to: string): number {
  return Math.round((parseIsoDateUtc(to).getTime() - parseIsoDateUtc(from).getTime()) / MS_DAY) + 1
}

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
  const f = from?.trim() || null
  const t = to?.trim() || null
  if (!f && !t) return null
  const start = f ?? shiftIsoDate(t!, -(MAX_WORK_QUEUE_PERIOD_DAYS - 1))
  const end = t ?? shiftIsoDate(f!, MAX_WORK_QUEUE_PERIOD_DAYS - 1)
  if (start > end) {
    throw new AppError(
      'Período inválido: a data inicial deve ser anterior ou igual à data final.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (inclusiveDaySpan(start, end) > MAX_WORK_QUEUE_PERIOD_DAYS) {
    throw new AppError(
      `Período muito longo: selecione no máximo ${MAX_WORK_QUEUE_PERIOD_DAYS} dias.`,
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return { from: start, to: end }
}
