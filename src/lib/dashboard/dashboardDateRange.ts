import { formatIsoDateBr, isValidIsoDate } from '../../domain/operational/workDate'

/**
 * Período do Dashboard (Operacional e Gerencial): Data inicial e Data final, dias civis de
 * São Paulo, inclusivos. Um único intervalo aplicado é compartilhado pelas duas visões e
 * pelos modos Cards/Gráficos.
 */
export type DashboardDateRange = {
  /** `YYYY-MM-DD` */
  startDate: string
  /** `YYYY-MM-DD` */
  endDate: string
}

/**
 * Configuração inicial desta entrega (sessão sem preferência salva). Não é regra de negócio:
 * o usuário pode aplicar qualquer período válido.
 */
export const DASHBOARD_DEFAULT_DATE_RANGE: DashboardDateRange = {
  startDate: '2026-10-01',
  endDate: '2026-10-20',
}

/** Chave única do período aplicado (substitui as preferências antigas por visão). */
export const DASHBOARD_DATE_RANGE_STORAGE_KEY = 'sgp.dashboard.period'

export const DASHBOARD_DATE_RANGE_ERRORS = {
  startRequired: 'Informe a data inicial.',
  endRequired: 'Informe a data final.',
  invalid: 'Informe uma data válida.',
  startAfterEnd: 'A data inicial não pode ser posterior à data final.',
} as const

export const DASHBOARD_LOAD_ERROR = 'Não foi possível atualizar o Dashboard. Tente novamente.'

export type DashboardDateRangeErrors = {
  startDate?: string
  endDate?: string
  /** Erro do intervalo (ordem das datas). */
  range?: string
}

/** `null` = intervalo válido. */
export function validateDashboardDateRange(
  range: DashboardDateRange,
): DashboardDateRangeErrors | null {
  const out: DashboardDateRangeErrors = {}
  const start = range.startDate.trim()
  const end = range.endDate.trim()
  if (!start) out.startDate = DASHBOARD_DATE_RANGE_ERRORS.startRequired
  else if (!isValidIsoDate(start)) out.startDate = DASHBOARD_DATE_RANGE_ERRORS.invalid
  if (!end) out.endDate = DASHBOARD_DATE_RANGE_ERRORS.endRequired
  else if (!isValidIsoDate(end)) out.endDate = DASHBOARD_DATE_RANGE_ERRORS.invalid
  if (!out.startDate && !out.endDate && start > end) {
    out.range = DASHBOARD_DATE_RANGE_ERRORS.startAfterEnd
  }
  return out.startDate || out.endDate || out.range ? out : null
}

export function isSameDashboardDateRange(a: DashboardDateRange, b: DashboardDateRange): boolean {
  return a.startDate === b.startDate && a.endDate === b.endDate
}

/** «01/10/2026 a 20/10/2026» (ou só a data quando o período tem um dia). */
export function formatDashboardDateRange(range: DashboardDateRange): string {
  const start = formatIsoDateBr(range.startDate)
  if (range.startDate === range.endDate) return start
  return `${start} a ${formatIsoDateBr(range.endDate)}`
}

/** Período salvo válido; senão a configuração inicial. Não lê as preferências antigas. */
export function readStoredDashboardDateRange(): DashboardDateRange {
  try {
    const raw = localStorage.getItem(DASHBOARD_DATE_RANGE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardDateRange>
      const candidate = {
        startDate: typeof parsed.startDate === 'string' ? parsed.startDate : '',
        endDate: typeof parsed.endDate === 'string' ? parsed.endDate : '',
      }
      if (!validateDashboardDateRange(candidate)) return candidate
    }
  } catch {
    /* ignore */
  }
  return { ...DASHBOARD_DEFAULT_DATE_RANGE }
}

export function persistDashboardDateRange(range: DashboardDateRange): void {
  try {
    localStorage.setItem(DASHBOARD_DATE_RANGE_STORAGE_KEY, JSON.stringify(range))
  } catch {
    /* ignore */
  }
}
