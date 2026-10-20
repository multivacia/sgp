import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { inclusiveDaySpan, shiftIsoDate } from '../../shared/operationalDateRange.js'
import {
  isValidDateOnly,
  OPERATIONAL_TIMEZONE,
  operationalDayEnd,
  operationalDayStart,
} from '../../shared/operationalWorkDate.js'

/**
 * Período do Dashboard (Operacional e Gerencial): Data inicial e Data final como dias
 * civis completos de São Paulo, inclusivos.
 *
 * Consulta: `instante >= from` (00:00 da data inicial) e `instante < toExclusive`
 * (00:00 do dia seguinte à data final) — inclui todo o último dia sem depender da
 * precisão de 23:59:59.999.
 *
 * Sem limite de extensão: os indicadores filtrados são somas/contagens únicas com
 * predicado de intervalo (custo não cresce com a quantidade de dias). Datas futuras
 * são aceitas (o resultado depende dos dados existentes).
 */
export const DASHBOARD_PERIOD_MESSAGES = {
  startRequired: 'Informe a data inicial.',
  endRequired: 'Informe a data final.',
  invalid: 'Informe uma data válida.',
  startAfterEnd: 'A data inicial não pode ser posterior à data final.',
} as const

export type DashboardPeriod = {
  startDate: string
  endDate: string
  from: Date
  toExclusive: Date
}

/** Metadados do período devolvidos ao frontend. */
export type DashboardPeriodMeta = {
  startDate: string
  endDate: string
  timezone: typeof OPERATIONAL_TIMEZONE
  /** 00:00:00.000 da data inicial (SP), ISO. */
  from: string
  /** 23:59:59.999 da data final (SP), ISO — exibição; a consulta usa o início do dia seguinte. */
  to: string
}

function badRequest(message: string): AppError {
  return new AppError(message, 400, ErrorCodes.VALIDATION_ERROR)
}

/**
 * `null` quando nenhuma data foi enviada (chamadas antigas). Datas ausentes, inexistentes,
 * fora do formato `YYYY-MM-DD` ou invertidas → 400 com mensagem em português.
 */
export function resolveDashboardPeriod(
  startDate: string | undefined,
  endDate: string | undefined,
): DashboardPeriod | null {
  const start = startDate?.trim() ?? ''
  const end = endDate?.trim() ?? ''
  if (!start && !end) return null
  if (!start) throw badRequest(DASHBOARD_PERIOD_MESSAGES.startRequired)
  if (!end) throw badRequest(DASHBOARD_PERIOD_MESSAGES.endRequired)
  if (!isValidDateOnly(start) || !isValidDateOnly(end)) {
    throw badRequest(DASHBOARD_PERIOD_MESSAGES.invalid)
  }
  if (start > end) throw badRequest(DASHBOARD_PERIOD_MESSAGES.startAfterEnd)
  return {
    startDate: start,
    endDate: end,
    from: operationalDayStart(start),
    toExclusive: operationalDayStart(shiftIsoDate(end, 1)),
  }
}

export function dashboardPeriodMeta(period: DashboardPeriod): DashboardPeriodMeta {
  return {
    startDate: period.startDate,
    endDate: period.endDate,
    timezone: OPERATIONAL_TIMEZONE,
    from: period.from.toISOString(),
    to: operationalDayEnd(period.endDate).toISOString(),
  }
}

/** Dias civis do período (inclusivo). */
export function dashboardPeriodDayCount(period: DashboardPeriod): number {
  return inclusiveDaySpan(period.startDate, period.endDate)
}
