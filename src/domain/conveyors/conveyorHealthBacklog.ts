import type { ArgosHealthBacklogFilter } from './conveyorHealth.types'

type ArgosSummaryLike = {
  healthStatus?: string
  riskLevel?: string
}

type RowLike = {
  argosSummary?: ArgosSummaryLike
}

export type ArgosHealthSummaryOverview = {
  totalRows: number
  withAnalysis: number
  withoutAnalysis: number
  riskLow: number
  riskMedium: number
  riskHighOrCritical: number
  healthAttention: number
  healthCritical: number
}

type RiskBucket = 'low' | 'medium' | 'high' | 'critical' | 'unknown'
type HealthBucket = 'healthy' | 'attention' | 'warning' | 'critical' | 'unknown'

function normalizeToken(v: string | undefined): string | undefined {
  if (!v) return undefined
  return v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function classifyArgosRiskLevel(v: string | undefined): RiskBucket {
  const t = normalizeToken(v)
  if (!t) return 'unknown'
  if (t === 'low' || t === 'baixo') return 'low'
  if (t === 'medium' || t === 'medio') return 'medium'
  if (t === 'high' || t === 'alto') return 'high'
  if (t === 'critical' || t === 'critico') return 'critical'
  return 'unknown'
}

export function classifyArgosHealthStatus(v: string | undefined): HealthBucket {
  const t = normalizeToken(v)
  if (!t) return 'unknown'
  if (t === 'healthy' || t === 'good' || t === 'ok') return 'healthy'
  if (t === 'attention') return 'attention'
  if (t === 'warning') return 'warning'
  if (t === 'critical') return 'critical'
  return 'unknown'
}

export function buildArgosHealthSummaryOverview<T extends RowLike>(
  rows: T[],
): ArgosHealthSummaryOverview {
  const out: ArgosHealthSummaryOverview = {
    totalRows: rows.length,
    withAnalysis: 0,
    withoutAnalysis: 0,
    riskLow: 0,
    riskMedium: 0,
    riskHighOrCritical: 0,
    healthAttention: 0,
    healthCritical: 0,
  }
  for (const row of rows) {
    const s = row.argosSummary
    if (!s) {
      out.withoutAnalysis += 1
      continue
    }
    out.withAnalysis += 1
    const risk = classifyArgosRiskLevel(s.riskLevel)
    if (risk === 'low') out.riskLow += 1
    else if (risk === 'medium') out.riskMedium += 1
    else if (risk === 'high' || risk === 'critical') out.riskHighOrCritical += 1

    const health = classifyArgosHealthStatus(s.healthStatus)
    if (health === 'attention') out.healthAttention += 1
    else if (health === 'critical') out.healthCritical += 1
  }
  return out
}

export function filterRowsByArgosHealth<T extends RowLike>(
  rows: T[],
  filter: ArgosHealthBacklogFilter,
): T[] {
  if (filter === 'all') return rows
  return rows.filter((row) => {
    const s = row.argosSummary
    if (filter === 'with_analysis') return Boolean(s)
    if (filter === 'without_analysis') return !s
    if (!s) return false
    const risk = classifyArgosRiskLevel(s.riskLevel)
    const health = classifyArgosHealthStatus(s.healthStatus)
    if (filter === 'risk_low') return risk === 'low'
    if (filter === 'risk_medium') return risk === 'medium'
    if (filter === 'risk_high_or_critical') {
      return risk === 'high' || risk === 'critical'
    }
    if (filter === 'health_attention') return health === 'attention'
    if (filter === 'health_critical') return health === 'critical'
    return true
  })
}
