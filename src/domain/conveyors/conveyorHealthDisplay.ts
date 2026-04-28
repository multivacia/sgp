import { ApiError } from '../../lib/api/apiErrors'
import type { ConveyorHealthAnalysisV1 } from './conveyorHealth.types'

export type ConveyorHealthUiSummary = {
  overallLabel?: string
  score?: number
  riskLevel?: string
  narrative?: string
  findings: string[]
  bottlenecks: string[]
  recommendedActions: string[]
}

export type ConveyorHealthMetaSummary = {
  analysisId?: string
  requestId?: string
  correlationId?: string
  routeUsed?: string
  llmUsed?: boolean
  savedAt?: string
}

export type ConveyorHealthTrendDirection = 'up' | 'down' | 'stable' | 'unknown'
export type ConveyorHealthStateDirection = 'improved' | 'worsened' | 'stable' | 'unknown'

export type ConveyorHealthTrendSummary = {
  hasComparison: boolean
  scoreDelta: number | null
  scoreDirection: ConveyorHealthTrendDirection
  riskDirection: ConveyorHealthStateDirection
  healthDirection: ConveyorHealthStateDirection
  overallTrend: ConveyorHealthStateDirection
  label: string
  description: string
  previousRisk?: string
  currentRisk?: string
  previousHealth?: string
  currentHealth?: string
}

function asTrimmedString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t ? t : undefined
}

function asFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function toRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object') return undefined
  return v as Record<string, unknown>
}

function itemToLine(item: unknown): string | undefined {
  if (typeof item === 'string') {
    const t = item.trim()
    return t ? t : undefined
  }
  if (!item || typeof item !== 'object') return undefined
  const o = item as Record<string, unknown>
  return (
    asTrimmedString(o.title) ??
    asTrimmedString(o.summary) ??
    asTrimmedString(o.message) ??
    asTrimmedString(o.description) ??
    asTrimmedString(o.text)
  )
}

function stringListFromField(
  data: Record<string, unknown>,
  keys: string[],
): string[] {
  for (const k of keys) {
    const v = data[k]
    if (!Array.isArray(v)) continue
    const lines: string[] = []
    for (const item of v) {
      const line = itemToLine(item)
      if (line) lines.push(line)
    }
    if (lines.length > 0) return lines
  }
  return []
}

/**
 * Campos oficiais acordados para exibição Sprint 5 (prioridade de leitura).
 * Mantemos fallback legado/defensivo abaixo para reduzir quebra em drift de ARGOS.
 */
const OFFICIAL_KEYS = {
  health: ['healthStatus', 'overallHealth'] as const,
  score: ['score'] as const,
  riskLevel: ['riskLevel'] as const,
  narrative: ['narrative'] as const,
  findings: ['findings'] as const,
  bottlenecks: ['bottlenecks'] as const,
  recommendedActions: ['recommendedActions'] as const,
} as const

const FALLBACK_KEYS = {
  health: ['overallStatus', 'status', 'healthGrade', 'grade'] as const,
  score: ['overallScore', 'healthScore', 'saudeScore'] as const,
  riskLevel: ['risk', 'nivelRisco', 'riskTier'] as const,
  narrative: ['principalNarrative', 'mainNarrative', 'executiveSummary', 'summary', 'resumoExecutivo'] as const,
  findings: ['mainFindings', 'keyFindings', 'achados'] as const,
  bottlenecks: ['gargalos'] as const,
  recommendedActions: ['recommended_actions', 'actions', 'acoesRecomendadas', 'recommendedNextSteps'] as const,
} as const

function pickString(
  rec: Record<string, unknown>,
  preferred: readonly string[],
  fallback: readonly string[],
): string | undefined {
  for (const k of preferred) {
    const v = asTrimmedString(rec[k])
    if (v) return v
  }
  for (const k of fallback) {
    const v = asTrimmedString(rec[k])
    if (v) return v
  }
  return undefined
}

function pickNumber(
  rec: Record<string, unknown>,
  preferred: readonly string[],
  fallback: readonly string[],
): number | undefined {
  for (const k of preferred) {
    const v = asFiniteNumber(rec[k])
    if (v !== undefined) return v
  }
  for (const k of fallback) {
    const v = asFiniteNumber(rec[k])
    if (v !== undefined) return v
  }
  return undefined
}

function pickRiskLevel(
  rec: Record<string, unknown>,
  preferred: readonly string[],
  fallback: readonly string[],
): string | undefined {
  const all = [...preferred, ...fallback]
  for (const k of all) {
    const raw = rec[k]
    if (raw === undefined || raw === null) continue
    if (typeof raw === 'string') {
      const trimmed = asTrimmedString(raw)
      if (trimmed) return trimmed
      continue
    }
    if (typeof raw === 'number' || typeof raw === 'boolean') {
      return String(raw)
    }
  }
  return undefined
}

function normalizeToken(v: string | undefined): string | undefined {
  if (!v) return undefined
  return v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function riskRank(v: string | undefined): number | null {
  const t = normalizeToken(v)
  if (!t) return null
  if (t === 'low' || t === 'baixo') return 1
  if (t === 'medium' || t === 'medio') return 2
  if (t === 'high' || t === 'alto') return 3
  if (t === 'critical' || t === 'critico') return 4
  return null
}

function healthRank(v: string | undefined): number | null {
  const t = normalizeToken(v)
  if (!t) return null
  if (t === 'healthy' || t === 'good' || t === 'ok') return 1
  if (t === 'attention') return 2
  if (t === 'warning') return 3
  if (t === 'critical') return 4
  return null
}

function compareLevel(currentRank: number | null, previousRank: number | null): ConveyorHealthStateDirection {
  if (currentRank == null || previousRank == null) return 'unknown'
  if (currentRank < previousRank) return 'improved'
  if (currentRank > previousRank) return 'worsened'
  return 'stable'
}

/**
 * Extrai texto apresentável a partir do payload ARGOS/SGP (chaves tolerantes a drift).
 */
export function summarizeConveyorHealthAnalysis(
  data: ConveyorHealthAnalysisV1,
): ConveyorHealthUiSummary {
  const rec = data as Record<string, unknown>
  const health = toRecord(rec.health)
  const narrativeObj = toRecord(rec.narrative)
  const narrativeText =
    asTrimmedString(narrativeObj?.summary) ??
    asTrimmedString(narrativeObj?.operationalReading) ??
    asTrimmedString(narrativeObj?.title)

  return {
    overallLabel:
      asTrimmedString(health?.status) ??
      pickString(rec, OFFICIAL_KEYS.health, FALLBACK_KEYS.health),
    score:
      asFiniteNumber(health?.score) ??
      pickNumber(rec, OFFICIAL_KEYS.score, FALLBACK_KEYS.score),
    riskLevel:
      asTrimmedString(health?.riskLevel) ??
      pickRiskLevel(rec, OFFICIAL_KEYS.riskLevel, FALLBACK_KEYS.riskLevel),
    narrative: narrativeText ?? pickString(rec, OFFICIAL_KEYS.narrative, FALLBACK_KEYS.narrative),
    findings: stringListFromField(rec, [...OFFICIAL_KEYS.findings, ...FALLBACK_KEYS.findings]),
    bottlenecks: stringListFromField(rec, [...OFFICIAL_KEYS.bottlenecks, ...FALLBACK_KEYS.bottlenecks]),
    recommendedActions: stringListFromField(rec, [
      ...OFFICIAL_KEYS.recommendedActions,
      ...FALLBACK_KEYS.recommendedActions,
    ]),
  }
}

/**
 * Heurística visual do SGP (não é nova análise ARGOS).
 * Compara análise atual vs imediatamente anterior.
 */
export function buildConveyorHealthTrendSummary(
  current: ConveyorHealthAnalysisV1 | null | undefined,
  previous: ConveyorHealthAnalysisV1 | null | undefined,
): ConveyorHealthTrendSummary {
  if (!current || !previous) {
    return {
      hasComparison: false,
      scoreDelta: null,
      scoreDirection: 'unknown',
      riskDirection: 'unknown',
      healthDirection: 'unknown',
      overallTrend: 'unknown',
      label: 'Sem análise anterior para comparação.',
      description: 'Sem análise anterior para comparação.',
    }
  }

  const c = summarizeConveyorHealthAnalysis(current)
  const p = summarizeConveyorHealthAnalysis(previous)
  const scoreDelta =
    c.score !== undefined && p.score !== undefined ? c.score - p.score : null
  const scoreDirection: ConveyorHealthTrendDirection =
    scoreDelta == null ? 'unknown' : scoreDelta > 0 ? 'up' : scoreDelta < 0 ? 'down' : 'stable'
  const riskDirection = compareLevel(riskRank(c.riskLevel), riskRank(p.riskLevel))
  const healthDirection = compareLevel(healthRank(c.overallLabel), healthRank(p.overallLabel))

  let overallTrend: ConveyorHealthStateDirection = 'unknown'
  if (scoreDirection === 'down' || riskDirection === 'worsened') {
    overallTrend = 'worsened'
  } else if (scoreDirection === 'up') {
    overallTrend = 'improved'
  } else if (scoreDirection === 'stable' && riskDirection === 'stable') {
    overallTrend = 'stable'
  }

  let label = 'Sem variação relevante em relação à análise anterior.'
  if (overallTrend === 'improved') {
    label = 'Melhora operacional em relação à análise anterior.'
  } else if (overallTrend === 'worsened') {
    label = 'Atenção: piora operacional em relação à análise anterior.'
  } else if (overallTrend === 'unknown') {
    label = 'Sem análise anterior para comparação.'
  }

  return {
    hasComparison: true,
    scoreDelta,
    scoreDirection,
    riskDirection,
    healthDirection,
    overallTrend,
    label,
    description: label,
    previousRisk: p.riskLevel,
    currentRisk: c.riskLevel,
    previousHealth: p.overallLabel,
    currentHealth: c.overallLabel,
  }
}

export function summarizeConveyorHealthMeta(
  analysis: ConveyorHealthAnalysisV1,
  meta: Record<string, unknown> | undefined,
): ConveyorHealthMetaSummary {
  const data = analysis as Record<string, unknown>
  const request = toRecord(data.request)
  const governance = toRecord(data.governance)
  const m = meta ?? {}
  const analysisId = asTrimmedString(m.analysisId)
  const requestId = asTrimmedString(m.requestId)
  const correlationId = asTrimmedString(m.correlationId)
  const routeUsed =
    asTrimmedString(m.routeUsed) ??
    asTrimmedString(request?.routeUsed) ??
    asTrimmedString(data.routeUsed)
  const llmRaw = m.llmUsed ?? governance?.llmUsed ?? request?.llmUsed ?? data.llmUsed
  const llmUsed = typeof llmRaw === 'boolean' ? llmRaw : undefined
  const savedAt = asTrimmedString(m.savedAt) ?? asTrimmedString(m.createdAt)
  return {
    analysisId,
    requestId,
    correlationId,
    routeUsed,
    llmUsed,
    savedAt,
  }
}

/** Mensagem curta para o cartão — sem detalhe técnico ou JSON. */
export function friendlyHealthAnalysisMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 503) {
      return 'ARGOS está temporariamente indisponível. Tente mais tarde.'
    }
    if (e.status === 504) {
      return 'ARGOS demorou mais do que o esperado para responder. Tente novamente.'
    }
    if (e.status === 502) {
      return 'Falha de comunicação com o serviço de análise. Tente novamente em instantes.'
    }
    if (e.status === 401) {
      return 'Sua sessão expirou. Faça login novamente para continuar.'
    }
    if (e.status === 403) {
      return 'Você não possui permissão para executar esta análise.'
    }
  }
  return 'Não foi possível concluir a análise de saúde neste momento. Tente novamente.'
}
