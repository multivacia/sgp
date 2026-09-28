import { operationalMonthStart } from './operationalWorkDate.js'

/**
 * Recortes temporais padronizados (V1.5). Intervalo [from, to] com `to` inclusivo
 * para consultas SQL (`entry_at <= to`).
 *
 * - `7d` / `15d` / `30d` = janela móvel de N×24h terminando em `now`.
 * - `month` = desde a meia-noite do dia 1 do mês civil de São Paulo até `now`
 *   (mesma referência de `operationalWorkDate.ts`; antes era o início do mês em UTC,
 *   que em SP cai às 21:00 do último dia do mês anterior).
 * - `custom` = limites recebidos, sem alteração.
 */

export type OperationalPeriodPreset = '7d' | '15d' | '30d' | 'month' | 'custom'

export type ResolvedOperationalPeriod = {
  from: Date
  to: Date
  preset: OperationalPeriodPreset
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000)
}

/**
 * Resolve o intervalo usado em histórico / “minutos apontados (período)”.
 */
export function resolveOperationalPeriod(args: {
  preset: OperationalPeriodPreset
  /** Obrigatório se `preset === 'custom'`. */
  customFrom?: Date
  customTo?: Date
  now?: Date
}): ResolvedOperationalPeriod {
  const now = args.now ?? new Date()

  if (args.preset === 'custom') {
    const from = args.customFrom
    const to = args.customTo
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error('resolveOperationalPeriod: custom requer customFrom e customTo válidos.')
    }
    return { from, to, preset: 'custom' }
  }

  const to = now
  let from: Date

  switch (args.preset) {
    case '15d':
      from = addDays(to, -15)
      break
    case '30d':
      from = addDays(to, -30)
      break
    case 'month':
      from = operationalMonthStart(to)
      break
    case '7d':
      from = addDays(to, -7)
      break
    default:
      from = addDays(to, -7)
      break
  }

  return { from, to, preset: args.preset }
}
