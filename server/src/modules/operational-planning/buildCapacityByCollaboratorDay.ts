import type pg from 'pg'
import { listCollaborators } from '../collaborators/collaborators.repository.js'
import {
  getOperationalCapacitySettings,
  listCollaboratorCapacityOverrides,
  type CollaboratorCapacityOverrideRow,
} from '../operational-settings/operational-settings.repository.js'
import { resolveDailyCapacityMinutes } from '../operational-settings/operational-settings.service.js'
import type { PlanItemEnrichedRow } from './operational-planning.repository.js'

export type CapacityByCollaboratorDayRow = {
  collaboratorId: string
  date: string
  capacityMinutes: number
  plannedMinutes: number
}

function toDateKey(value: string | Date | null | undefined): string | null {
  if (value == null) return null
  if (typeof value === 'string') {
    const t = value.trim()
    return t.length >= 10 ? t.slice(0, 10) : t || null
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  return null
}

/**
 * Espelha a seleção de `getActiveCollaboratorCapacityOverride` (vigência + ordenação).
 */
export function pickOverrideDailyMinutesForDate(
  overrides: readonly CollaboratorCapacityOverrideRow[],
  collaboratorId: string,
  date: string,
): number | null {
  const refDate = date.trim().slice(0, 10)
  const candidates = overrides.filter((o) => {
    if (o.collaborator_id !== collaboratorId) return false
    if (o.deleted_at != null) return false
    if (!o.is_active) return false
    const from = toDateKey(o.effective_from)
    const to = toDateKey(o.effective_to)
    if (from && from > refDate) return false
    if (to && to < refDate) return false
    return true
  })
  candidates.sort((a, b) => {
    const aFrom = toDateKey(a.effective_from)
    const bFrom = toDateKey(b.effective_from)
    const aNull = aFrom == null ? 1 : 0
    const bNull = bFrom == null ? 1 : 0
    if (aNull !== bNull) return aNull - bNull
    if (aFrom && bFrom && aFrom !== bFrom) return bFrom.localeCompare(aFrom)
    const aUp = a.updated_at instanceof Date ? a.updated_at.getTime() : Date.parse(String(a.updated_at))
    const bUp = b.updated_at instanceof Date ? b.updated_at.getTime() : Date.parse(String(b.updated_at))
    return (Number.isFinite(bUp) ? bUp : 0) - (Number.isFinite(aUp) ? aUp : 0)
  })
  const minutes = candidates[0]?.daily_minutes
  return minutes == null || !Number.isFinite(minutes) ? null : minutes
}

export function sumPlannedMinutesByCollaboratorDay(
  items: readonly Pick<
    PlanItemEnrichedRow,
    'assigned_collaborator_id' | 'planned_date' | 'planned_minutes'
  >[],
): Map<string, number> {
  const planned = new Map<string, number>()
  for (const it of items) {
    const cid = it.assigned_collaborator_id?.trim()
    const date = toDateKey(it.planned_date)
    if (!cid || !date) continue
    const key = `${cid}|${date}`
    const add = Math.max(0, Number(it.planned_minutes ?? 0) || 0)
    planned.set(key, (planned.get(key) ?? 0) + add)
  }
  return planned
}

/** Colaboradores elegíveis ao quadro: ativos e não excluídos. */
export async function listActiveCollaboratorIdsForPlanningBoard(
  pool: pg.Pool,
): Promise<string[]> {
  const rows = await listCollaborators(pool, { status: 'ACTIVE' })
  return rows
    .filter((c) => c.is_active !== false && String(c.status).toUpperCase() === 'ACTIVE')
    .map((c) => c.id)
}

/**
 * Matriz colaborador × dia da semana com capacidade efetiva e minutos já persistidos no plano.
 * Inclui células sem atividade (`plannedMinutes: 0`) para alertas em rascunho.
 */
export async function buildCapacityByCollaboratorDay(
  pool: pg.Pool,
  input: {
    items: readonly Pick<
      PlanItemEnrichedRow,
      'assigned_collaborator_id' | 'planned_date' | 'planned_minutes'
    >[]
    weekdayDates: readonly string[]
    collaboratorIds?: readonly string[]
  },
): Promise<CapacityByCollaboratorDayRow[]> {
  const weekdayDates = input.weekdayDates
    .map((d) => d.trim().slice(0, 10))
    .filter((d) => d.length === 10)
  if (weekdayDates.length === 0) return []

  const idSet = new Set<string>(input.collaboratorIds ?? [])
  for (const it of input.items) {
    const cid = it.assigned_collaborator_id?.trim()
    if (cid) idSet.add(cid)
  }
  const collaboratorIds = [...idSet].sort((a, b) => a.localeCompare(b))
  if (collaboratorIds.length === 0) return []

  const plannedByKey = sumPlannedMinutesByCollaboratorDay(input.items)

  const [settings, overrides] = await Promise.all([
    getOperationalCapacitySettings(pool),
    listCollaboratorCapacityOverrides(pool, { includeDeleted: false }),
  ])
  const defaultDailyMinutes = settings?.default_daily_minutes ?? null
  const relevantOverrides = overrides.filter(
    (o) => o.is_active && o.deleted_at == null && idSet.has(o.collaborator_id),
  )

  const out: CapacityByCollaboratorDayRow[] = []
  for (const collaboratorId of collaboratorIds) {
    for (const date of weekdayDates) {
      const overrideDailyMinutes = pickOverrideDailyMinutesForDate(
        relevantOverrides,
        collaboratorId,
        date,
      )
      const capacityMinutes = resolveDailyCapacityMinutes({
        defaultDailyMinutes,
        overrideDailyMinutes,
      })
      out.push({
        collaboratorId,
        date,
        capacityMinutes,
        plannedMinutes: plannedByKey.get(`${collaboratorId}|${date}`) ?? 0,
      })
    }
  }

  out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.collaboratorId.localeCompare(b.collaboratorId),
  )
  return out
}
