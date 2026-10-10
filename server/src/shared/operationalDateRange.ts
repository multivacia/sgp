import { AppError } from './errors/AppError.js'
import { ErrorCodes } from './errors/errorCodes.js'

const MS_DAY = 86_400_000

function parseIsoDateUtc(dateIso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim())
  if (!m) {
    throw new AppError('Data inválida: use AAAA-MM-DD.', 400, ErrorCodes.VALIDATION_ERROR)
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12))
}

export function shiftIsoDate(dateIso: string, deltaDays: number): string {
  const d = new Date(parseIsoDateUtc(dateIso).getTime() + deltaDays * MS_DAY)
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function inclusiveDaySpan(from: string, to: string): number {
  return Math.round((parseIsoDateUtc(to).getTime() - parseIsoDateUtc(from).getTime()) / MS_DAY) + 1
}

/** Datas civis `YYYY-MM-DD` de `from` a `to` (inclusivo). */
export function listIsoDatesInRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = shiftIsoDate(d, 1)) out.push(d)
  return out
}

/**
 * Período com pontas opcionais (datas civis de São Paulo, inclusivas):
 * - nenhuma ponta → `null`;
 * - só início → até início + (maxDays − 1); só fim → desde fim − (maxDays − 1);
 * - `from > to` ou janela acima de `maxDays` → 400.
 */
export function resolveOptionalDateRange(
  from: string | null | undefined,
  to: string | null | undefined,
  maxDays: number,
): { from: string; to: string } | null {
  const f = from?.trim() || null
  const t = to?.trim() || null
  if (!f && !t) return null
  const start = f ?? shiftIsoDate(t!, -(maxDays - 1))
  const end = t ?? shiftIsoDate(f!, maxDays - 1)
  if (start > end) {
    throw new AppError(
      'Período inválido: a data inicial deve ser anterior ou igual à data final.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (inclusiveDaySpan(start, end) > maxDays) {
    throw new AppError(
      `Período muito longo: selecione no máximo ${maxDays} dias.`,
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return { from: start, to: end }
}
