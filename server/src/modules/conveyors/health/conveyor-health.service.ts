import type pg from 'pg'
import type { Env } from '../../../config/env.js'
import { AppError } from '../../../shared/errors/AppError.js'
import { ErrorCodes } from '../../../shared/errors/errorCodes.js'
import { ErrorRefs } from '../../../shared/errors/errorRefs.js'
import { postConveyorHealthAnalyze } from '../../argos/argos-health.client.js'
import { serviceGetConveyorNodeWorkload } from '../conveyorNodeWorkload.service.js'
import { serviceGetConveyorById } from '../conveyors.service.js'
import {
  DEFAULT_RECENT_ACTIVITY_LIMIT,
  type ConveyorHealthAnalysisV1,
  type ConveyorHealthExecutionAggregatesV1,
  type ConveyorOperationalSnapshotV1,
} from './conveyor-health.argos-types.js'
import {
  getLatestConveyorHealthAnalysis,
  insertConveyorHealthAnalysis,
  listConveyorHealthAnalyses,
  listLatestConveyorHealthSummaries,
  type ConveyorHealthSummaryRow,
  listPeopleExecutionSummaryForConveyor,
  listRecentActivityForConveyor,
  listTeamExecutionSummaryForConveyor,
  type ConveyorHealthHistoryRecord,
  type ConveyorHealthSnapshotSummary,
  type LatestConveyorHealthAnalysisRecord,
} from './conveyor-health.repository.js'
import { buildConveyorOperationalSnapshotV1 } from './conveyor-health.snapshot-builder.js'

export type LoadConveyorHealthAggregatesOptions = {
  /** Limite de linhas para `recentActivity` (1–500; repousa em repositório). */
  recentActivityLimit?: number
}

/**
 * Carrega agregações para o snapshot ARGOS (pessoas, times, atividade recente).
 * Destinado a ser chamado antes de `buildConveyorOperationalSnapshotV1` quando a rota existir.
 */
export async function loadConveyorHealthAggregates(
  pool: pg.Pool,
  conveyorId: string,
  options?: LoadConveyorHealthAggregatesOptions,
): Promise<ConveyorHealthExecutionAggregatesV1> {
  const lim = options?.recentActivityLimit ?? DEFAULT_RECENT_ACTIVITY_LIMIT
  const [peopleExecutionSummary, teamExecutionSummary, recentActivity] = await Promise.all([
    listPeopleExecutionSummaryForConveyor(pool, conveyorId),
    listTeamExecutionSummaryForConveyor(pool, conveyorId),
    listRecentActivityForConveyor(pool, conveyorId, lim),
  ])
  return {
    peopleExecutionSummary,
    teamExecutionSummary,
    recentActivity,
  }
}

export type AnalyzeConveyorHealthOptions = {
  /** Alinha a `ARGOS_POLICY_MODE` / builder; omitido ⇒ `balanced` no snapshot. */
  policy?: 'economy' | 'balanced' | 'quality'
  requestId: string
  correlationId: string
  now?: Date
  createdBy?: string | null
}

export type AnalyzeConveyorHealthPersistedResult = {
  analysis: ConveyorHealthAnalysisV1
  persisted: {
    analysisId: string
    savedAt: string
  }
}

export type LatestConveyorHealthResult = {
  data: ConveyorHealthAnalysisV1 | null
  meta: Record<string, unknown>
}

export type ConveyorHealthHistoryResult = {
  data: ConveyorHealthHistoryRecord[]
  meta: {
    limit: number
    count: number
    hasMore: boolean
  }
}

export type ConveyorHealthSummaryResult = {
  data: ConveyorHealthSummaryRow[]
  meta: {
    count: number
  }
}

type PreparedConveyorHealthRun = {
  snapshot: ConveyorOperationalSnapshotV1
  analysis: ConveyorHealthAnalysisV1
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

function pickString(rec: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = asTrimmedString(rec[key])
    if (v) return v
  }
  return undefined
}

function pickNumber(rec: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = asFiniteNumber(rec[key])
    if (v !== undefined) return v
  }
  return undefined
}

function toRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object') return undefined
  return v as Record<string, unknown>
}

function extractRouteUsed(analysis: ConveyorHealthAnalysisV1): string | undefined {
  const rec = analysis as Record<string, unknown>
  const request = toRecord(rec.request)
  return asTrimmedString(request?.routeUsed) ?? asTrimmedString(rec.routeUsed)
}

function extractLlmUsed(
  analysis: ConveyorHealthAnalysisV1,
  routeUsed?: string,
): boolean | undefined {
  const rec = analysis as Record<string, unknown>
  const governance = toRecord(rec.governance)
  const request = toRecord(rec.request)
  const llmRaw = governance?.llmUsed ?? request?.llmUsed ?? rec.llmUsed
  if (typeof llmRaw === 'boolean') return llmRaw
  if (routeUsed === 'deterministic') return false
  return undefined
}

function extractPersistedHealthSummary(
  analysis: ConveyorHealthAnalysisV1,
): { healthStatus?: string; score?: number; riskLevel?: string } {
  const rec = analysis as Record<string, unknown>
  const health = toRecord(rec.health)
  return {
    healthStatus:
      asTrimmedString(health?.status) ??
      pickString(rec, ['healthStatus', 'overallHealth', 'status', 'overallStatus']),
    score:
      asFiniteNumber(health?.score) ??
      pickNumber(rec, ['score', 'overallScore', 'healthScore']),
    riskLevel:
      asTrimmedString(health?.riskLevel) ??
      pickString(rec, ['riskLevel', 'risk', 'nivelRisco', 'riskTier']),
  }
}

function buildSnapshotSummary(snapshot: ConveyorOperationalSnapshotV1): ConveyorHealthSnapshotSummary {
  let totalRealizedMinutes = 0
  for (const option of snapshot.structure.options) {
    for (const area of option.areas) {
      for (const step of area.steps) {
        totalRealizedMinutes += Math.max(0, Number(step.realizedMinutes) || 0)
      }
    }
  }
  return {
    totalOptions: snapshot.totals.totalOptions,
    totalAreas: snapshot.totals.totalAreas,
    totalSteps: snapshot.totals.totalSteps,
    totalPlannedMinutes: snapshot.totals.plannedMinutes,
    totalRealizedMinutes: snapshot.totals.realizedMinutes || totalRealizedMinutes,
    dataQuality: snapshot.dataQuality,
    peopleCount: snapshot.peopleExecutionSummary.length,
    teamsCount: snapshot.teamExecutionSummary.length,
    recentActivityCount: snapshot.recentActivity.timeEntries.length,
  }
}

async function prepareConveyorHealthRun(
  pool: pg.Pool,
  env: Env,
  conveyorId: string,
  options: AnalyzeConveyorHealthOptions,
): Promise<PreparedConveyorHealthRun> {
  const detail = await serviceGetConveyorById(pool, conveyorId)
  if (!detail) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND, undefined, {
      errorRef: ErrorRefs.CONVEYOR_DETAIL_NOT_FOUND,
      category: 'BUSINESS',
      severity: 'warning',
    })
  }

  const workload = await serviceGetConveyorNodeWorkload(pool, conveyorId)
  if (!workload) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND, undefined, {
      errorRef: ErrorRefs.CONVEYOR_DETAIL_NOT_FOUND,
      category: 'BUSINESS',
      severity: 'warning',
    })
  }

  const aggregates = await loadConveyorHealthAggregates(pool, conveyorId, {
    recentActivityLimit: DEFAULT_RECENT_ACTIVITY_LIMIT,
  })

  const snapshot = buildConveyorOperationalSnapshotV1({
    conveyorDetail: detail,
    nodeWorkload: workload,
    aggregates,
    policy: options.policy,
    requestId: options.requestId,
    correlationId: options.correlationId,
    now: options.now ?? new Date(),
  })
  const analysis = await postConveyorHealthAnalyze(env, snapshot)
  return { snapshot, analysis }
}

/**
 * Orquestra detalhe + workload + agregações, monta o snapshot e chama o ARGOS Health.
 * Não regista logs (fica no controller).
 */
export async function serviceAnalyzeConveyorHealth(
  pool: pg.Pool,
  env: Env,
  conveyorId: string,
  options: AnalyzeConveyorHealthOptions,
): Promise<ConveyorHealthAnalysisV1> {
  const prepared = await prepareConveyorHealthRun(pool, env, conveyorId, options)
  return prepared.analysis
}

export async function serviceAnalyzeConveyorHealthAndPersist(
  pool: pg.Pool,
  env: Env,
  conveyorId: string,
  options: AnalyzeConveyorHealthOptions,
): Promise<AnalyzeConveyorHealthPersistedResult> {
  const prepared = await prepareConveyorHealthRun(pool, env, conveyorId, options)
  const routeUsed = extractRouteUsed(prepared.analysis)
  const llmUsed = extractLlmUsed(prepared.analysis, routeUsed)
  const summary = extractPersistedHealthSummary(prepared.analysis)
  try {
    const persisted = await insertConveyorHealthAnalysis(pool, {
      conveyorId,
      requestId: options.requestId,
      correlationId: options.correlationId,
      policy: options.policy ?? 'balanced',
      routeUsed,
      llmUsed,
      healthStatus: summary.healthStatus,
      score: summary.score,
      riskLevel: summary.riskLevel,
      analysis: prepared.analysis,
      snapshotSummary: buildSnapshotSummary(prepared.snapshot),
      createdBy: options.createdBy ?? null,
    })
    return {
      analysis: prepared.analysis,
      persisted: {
        analysisId: persisted.analysisId,
        savedAt: persisted.createdAt,
      },
    }
  } catch (e) {
    throw new AppError(
      'Falha ao persistir histórico da análise de saúde.',
      500,
      ErrorCodes.INTERNAL,
      e,
      {
        category: 'INTEGRATION',
        severity: 'critical',
      },
    )
  }
}

function mapLatestRecordToResult(row: LatestConveyorHealthAnalysisRecord): LatestConveyorHealthResult {
  const routeUsed = row.routeUsed ?? extractRouteUsed(row.analysis)
  const llmUsed = row.llmUsed ?? extractLlmUsed(row.analysis, routeUsed)
  return {
    data: row.analysis,
    meta: {
      hasAnalysis: true,
      analysisId: row.analysisId,
      createdAt: row.createdAt,
      requestId: row.requestId,
      correlationId: row.correlationId,
      routeUsed,
      llmUsed,
    },
  }
}

export async function serviceGetLatestConveyorHealth(
  pool: pg.Pool,
  conveyorId: string,
): Promise<LatestConveyorHealthResult> {
  const detail = await serviceGetConveyorById(pool, conveyorId)
  if (!detail) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND, undefined, {
      errorRef: ErrorRefs.CONVEYOR_DETAIL_NOT_FOUND,
      category: 'BUSINESS',
      severity: 'warning',
    })
  }
  const latest = await getLatestConveyorHealthAnalysis(pool, conveyorId)
  if (!latest) return { data: null, meta: { hasAnalysis: false } }
  return mapLatestRecordToResult(latest)
}

export async function serviceListConveyorHealthHistory(
  pool: pg.Pool,
  conveyorId: string,
  options?: { limit?: number },
): Promise<ConveyorHealthHistoryResult> {
  const detail = await serviceGetConveyorById(pool, conveyorId)
  if (!detail) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND, undefined, {
      errorRef: ErrorRefs.CONVEYOR_DETAIL_NOT_FOUND,
      category: 'BUSINESS',
      severity: 'warning',
    })
  }
  const limit = Math.min(Math.max(1, Math.floor(options?.limit ?? 10)), 50)
  const rows = await listConveyorHealthAnalyses(pool, conveyorId, { limit })
  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  return {
    data,
    meta: {
      limit,
      count: data.length,
      hasMore,
    },
  }
}

export async function serviceListLatestConveyorHealthSummaries(
  pool: pg.Pool,
  options?: { limit?: number },
): Promise<ConveyorHealthSummaryResult> {
  const rows = await listLatestConveyorHealthSummaries(pool, options)
  return {
    data: rows,
    meta: {
      count: rows.length,
    },
  }
}
