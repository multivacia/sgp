import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { serviceResolveCollaboratorDailyCapacity } from '../operational-settings/operational-settings.service.js'
import {
  aggregateOpenAssignmentsForCollaborator,
  aggregateTimeEntriesForCollaboratorWindow,
} from './collaborator-operational-health.repository.js'
import type { CollaboratorOperationalHealthQuery } from './collaborator-operational-health.schemas.js'
import { buildCollaboratorOperationalHealthDataQualityWarnings } from './collaborator-operational-health.dataQuality.js'
import { findCollaboratorById } from './collaborators.repository.js'

/** Inclui `workload`, `recentTimeEntries`, `dataQuality.warnings` estruturados (1.0.1). */
export const COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_SCHEMA_VERSION = '1.0.1' as const
export const COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_VERSION =
  'collaborator_operational_health_snapshot_v1' as const

export type CollaboratorOperationalHealthSnapshotCapacityV1 = {
  referenceDate: string
  resolvedDailyMinutes: number
  source: 'OVERRIDE' | 'DEFAULT' | 'FALLBACK' | 'MISSING'
  recentDays: number
  windowCapacityMinutes: number
}

export type CollaboratorOperationalHealthSnapshotV1 = {
  schemaVersion: typeof COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_SCHEMA_VERSION
  snapshotVersion: typeof COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_VERSION
  generatedAt: string
  referenceDate: string
  recentDays: number
  collaborator: {
    id: string
    full_name: string
    code: string | null
    status: string
    isActive: boolean
  }
  capacity: CollaboratorOperationalHealthSnapshotCapacityV1
  workload: {
    openDistinctSteps: number
    plannedOpenMinutesSum: number
    realizedOpenMinutesSum: number
    pendingOpenMinutesSum: number
    primaryContributorSteps: number
    supportContributorSteps: number
    teamLinkedSteps: number
    collaboratorDirectSteps: number
  }
  recentTimeEntries: {
    windowFrom: string
    windowToExclusive: string
    totalMinutes: number
    entryCount: number
    lastEntryAt: string | null
  }
  dataQuality: {
    warnings: Array<{ code: string; message: string }>
  }
}

export function collaboratorOperationalHealthReferenceDateOrTodayUtc(
  referenceDate?: string,
): string {
  if (referenceDate && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    return referenceDate
  }
  return new Date().toISOString().slice(0, 10)
}

/** Janela [fromInclusive, toExclusive) em UTC, com `recentDays` dias terminando em `referenceDate`. */
export function collaboratorHealthTimeWindowUtc(
  referenceDate: string,
  recentDays: number,
): { fromInclusive: Date; toExclusive: Date } {
  const [y, m, d] = referenceDate.split('-').map((v) => Number(v))
  const refStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
  const fromInclusive = new Date(refStart)
  fromInclusive.setUTCDate(fromInclusive.getUTCDate() - (recentDays - 1))
  const toExclusive = new Date(refStart)
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1)
  return { fromInclusive, toExclusive }
}

function mapCapacitySource(
  source: 'override' | 'default' | 'fallback',
): 'OVERRIDE' | 'DEFAULT' | 'FALLBACK' | 'MISSING' {
  switch (source) {
    case 'override':
      return 'OVERRIDE'
    case 'default':
      return 'DEFAULT'
    case 'fallback':
      return 'FALLBACK'
    default:
      return 'MISSING'
  }
}

function parseNonNegativeIntString(s: string): number {
  const n = Number.parseInt(s, 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function parseNonNegativeBigIntString(s: string): number {
  try {
    const b = BigInt(s)
    if (b < 0n) return 0
    if (b > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER
    return Number(b)
  } catch {
    return 0
  }
}

export async function serviceGetCollaboratorOperationalHealthSnapshot(
  pool: pg.Pool,
  collaboratorId: string,
  query: CollaboratorOperationalHealthQuery,
): Promise<CollaboratorOperationalHealthSnapshotV1> {
  const collaborator = await findCollaboratorById(pool, collaboratorId)
  if (!collaborator) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }

  const referenceDate = collaboratorOperationalHealthReferenceDateOrTodayUtc(query.referenceDate)
  const recentDays = query.recentDays ?? 7
  const { fromInclusive, toExclusive } = collaboratorHealthTimeWindowUtc(referenceDate, recentDays)

  const [capacityRow, openAgg, timeAgg] = await Promise.all([
    serviceResolveCollaboratorDailyCapacity(pool, collaboratorId, referenceDate),
    aggregateOpenAssignmentsForCollaborator(pool, collaboratorId),
    aggregateTimeEntriesForCollaboratorWindow(pool, collaboratorId, fromInclusive, toExclusive),
  ])

  const resolvedDailyMinutes = capacityRow.resolvedDailyMinutes
  const windowCapacityMinutes = resolvedDailyMinutes * recentDays

  const capacitySource = mapCapacitySource(capacityRow.source)
  const openDistinctSteps = parseNonNegativeIntString(openAgg.open_distinct_steps)
  const teamLinkedSteps = parseNonNegativeIntString(openAgg.team_linked_step_count)

  const workloadBlock = {
    openDistinctSteps,
    plannedOpenMinutesSum: parseNonNegativeBigIntString(openAgg.planned_open_sum),
    realizedOpenMinutesSum: parseNonNegativeBigIntString(openAgg.realized_open_sum),
    pendingOpenMinutesSum: parseNonNegativeBigIntString(openAgg.pending_open_sum),
    primaryContributorSteps: parseNonNegativeIntString(openAgg.primary_step_count),
    supportContributorSteps: parseNonNegativeIntString(openAgg.support_step_count),
    teamLinkedSteps,
    collaboratorDirectSteps: parseNonNegativeIntString(openAgg.collaborator_direct_step_count),
  }

  const recentTimeEntriesBlock = {
    windowFrom: fromInclusive.toISOString(),
    windowToExclusive: toExclusive.toISOString(),
    totalMinutes: parseNonNegativeBigIntString(timeAgg.total_minutes),
    entryCount: parseNonNegativeIntString(timeAgg.entry_count),
    lastEntryAt: timeAgg.last_entry_at ? timeAgg.last_entry_at.toISOString() : null,
  }

  const warnings = buildCollaboratorOperationalHealthDataQualityWarnings({
    teamLinkedSteps,
    capacitySource,
    openDistinctSteps,
    collaboratorIsActive: collaborator.is_active,
  })

  return {
    schemaVersion: COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_SCHEMA_VERSION,
    snapshotVersion: COLLABORATOR_OPERATIONAL_HEALTH_SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    referenceDate,
    recentDays,
    collaborator: {
      id: collaborator.id,
      full_name: collaborator.full_name,
      code: collaborator.code,
      status: collaborator.status,
      isActive: collaborator.is_active,
    },
    capacity: {
      referenceDate,
      resolvedDailyMinutes,
      source: capacitySource,
      recentDays,
      windowCapacityMinutes,
    },
    workload: workloadBlock,
    recentTimeEntries: recentTimeEntriesBlock,
    dataQuality: { warnings },
  }
}
