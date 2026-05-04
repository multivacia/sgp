import type {
  CollaboratorHealthRiskLevel,
  CollaboratorHealthStatus,
  CollaboratorOperationalHealthCapacitySource,
} from './collaboratorOperationalHealth.types'

/** Minutos não negativos → rótulo tipo "8h", "1h30", "0h". */
export function formatMinutesToHoursLabel(minutes: number | null | undefined): string {
  const m = Math.max(0, Math.floor(Number(minutes) || 0))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (r === 0) return `${h}h`
  return `${h}h${String(r).padStart(2, '0')}`
}

/** Percentual inteiro; valores ≥999 mostram "999%+". */
export function formatPercentLabel(value: number | null | undefined): string {
  const v = Math.floor(Number(value) || 0)
  if (v >= 999) return '999%+'
  return `${Math.max(0, v)}%`
}

export function getCollaboratorHealthStatusLabel(status: CollaboratorHealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'Saudável'
    case 'attention':
      return 'Atenção'
    case 'critical':
      return 'Crítico'
    case 'unknown':
    default:
      return 'Sem dados suficientes'
  }
}

export function getCollaboratorHealthRiskLabel(riskLevel: CollaboratorHealthRiskLevel): string {
  switch (riskLevel) {
    case 'low':
      return 'Baixo'
    case 'medium':
      return 'Médio'
    case 'high':
      return 'Alto'
    case 'critical':
      return 'Crítico'
    case 'unknown':
    default:
      return 'Indefinido'
  }
}

const SIGNAL_LABELS: Record<string, string> = {
  LOW_OCCUPATION: 'Baixa ocupação',
  BALANCED: 'Carga equilibrada',
  HIGH_LOAD: 'Carga alta',
  OVERLOADED: 'Sobrecarga',
  CRITICAL_OVERLOAD: 'Sobrecarga crítica',
  NO_RECENT_TIME_ENTRY: 'Sem apontamento recente',
  NO_OPEN_ASSIGNMENTS: 'Sem etapas abertas',
  TEAM_ASSIGNMENTS_INCLUDED: 'Carga via time',
  CAPACITY_FALLBACK_USED: 'Capacidade por fallback',
  COLLABORATOR_INACTIVE: 'Colaborador inativo',
  PENDING_CRITICAL_OVER_WINDOW: 'Pendência acima do dobro da capacidade da janela',
  PENDING_OVER_WINDOW_CAPACITY: 'Pendência acima da capacidade da janela',
  NO_RECENT_TIME_ENTRIES_WITH_OPEN_WORK: 'Sem apontamento recente com etapas abertas',
  LOW_RECENT_TIME_OCCUPATION: 'Sinal de baixa ocupação recente',
}

export function getCollaboratorHealthSignalLabel(code: string | null | undefined): string {
  if (!code || typeof code !== 'string') return 'Sinal'
  return SIGNAL_LABELS[code] ?? code.replace(/_/g, ' ').toLowerCase()
}

export function getCapacitySourceLabel(
  source: CollaboratorOperationalHealthCapacitySource | null | undefined,
): string {
  switch (source) {
    case 'OVERRIDE':
      return 'Capacidade específica'
    case 'DEFAULT':
      return 'Capacidade padrão'
    case 'FALLBACK':
      return 'Fallback operacional'
    case 'MISSING':
    default:
      return 'Não informada'
  }
}

/** Mensagens neutras para avisos de qualidade de dados (UI). */
export function getDataQualityWarningDisplayMessage(code: string, fallbackMessage?: string): string {
  switch (code) {
    case 'TEAM_ASSIGNMENTS_INCLUDED':
      return 'A carga inclui etapas atribuídas a times dos quais o colaborador participa.'
    case 'CAPACITY_FALLBACK_USED':
      return 'A capacidade foi estimada por fallback operacional.'
    case 'NO_OPEN_ASSIGNMENTS':
      return 'Nenhuma etapa aberta foi encontrada para este colaborador.'
    case 'COLLABORATOR_INACTIVE':
      return 'O colaborador está inativo.'
    default:
      return fallbackMessage?.trim() || 'Aviso de qualidade de dados.'
  }
}

export function formatLastEntryRelativeDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return 'sem registro na janela'
  if (days === 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  return `há ${days} dias`
}

/** Dias inteiros entre o dia UTC de `lastEntryAtIso` e o dia `referenceDate` (YYYY-MM-DD). */
export function daysSinceLastEntryVsReference(
  referenceDate: string,
  lastEntryAtIso: string | null | undefined,
): number | null {
  if (!lastEntryAtIso || !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) return null
  const [y, m, d] = referenceDate.split('-').map((v) => Number(v))
  const refDay = Date.UTC(y, m - 1, d)
  const last = new Date(lastEntryAtIso)
  const lastDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())
  return Math.max(0, Math.round((refDay - lastDay) / 86_400_000))
}
