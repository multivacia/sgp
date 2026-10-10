/**
 * Planejamento por intervalo de datas (atravessando semanas).
 *
 * Fonte canônica por semana: o plano editável exibido no quadro (rascunho ?? publicado),
 * igual a `serviceGetOperationalPlanningWeek` e ao export semanal. Itens filtrados pela
 * **data planejada** (inclusiva). Capacidade diária via `buildCapacityByCollaboratorDay`
 * (dias úteis seg–sex, mesma regra do quadro e do export).
 */
import type pg from 'pg'
import {
  listIsoDatesInRange,
  resolveOptionalDateRange,
  shiftIsoDate,
} from '../../shared/operationalDateRange.js'
import {
  buildCapacityByCollaboratorDay,
  listActiveCollaboratorIdsForPlanningBoard,
  type CapacityByCollaboratorDayRow,
} from './buildCapacityByCollaboratorDay.js'
import {
  findDraftOperationalWorkPlanByWeekStart,
  findPublishedOperationalWorkPlanByWeekStart,
  listEnrichedItemsForWorkPlanExport,
  type PlanItemExportRow,
} from './operational-planning.repository.js'
import { fridayAfterMonday, mondayOfWeekContaining, weekDayStrings } from './operational-planning.week.js'
import type { OperationalPlanningExportSituation } from './operational-planning.export.js'

/** Janela máxima da pesquisa/exportação por período no Planejamento (dias, inclusivo). */
export const MAX_PLANNING_RANGE_DAYS = 92

export type PlanningDateRange = { from: string; to: string }

export type PlanningRangeWeek = {
  weekStartDate: string
  weekEndDate: string
  /** `null` quando não existe plano (nem rascunho nem publicado) na semana. */
  situation: OperationalPlanningExportSituation | null
  workPlanId: string | null
}

export type PlanningRangeItemRow = PlanItemExportRow & {
  week_start_date: string
  plan_situation: OperationalPlanningExportSituation
}

export function resolvePlanningRange(
  from: string | null | undefined,
  to: string | null | undefined,
): PlanningDateRange | null {
  return resolveOptionalDateRange(from, to, MAX_PLANNING_RANGE_DAYS)
}

/** Semana operacional (seg–sex) que contém `weekStart` como intervalo. */
export function planningWeekRange(weekStartRaw: string): PlanningDateRange {
  const monday = mondayOfWeekContaining(weekStartRaw)
  return { from: monday, to: fridayAfterMonday(monday) }
}

function listMondaysInRange(range: PlanningDateRange): string[] {
  const out: string[] = []
  const last = mondayOfWeekContaining(range.to)
  for (let m = mondayOfWeekContaining(range.from); m <= last; m = shiftIsoDate(m, 7)) out.push(m)
  return out
}

/** Dias úteis (seg–sex) dentro do intervalo — mesma grade de capacidade do quadro semanal. */
export function planningWorkdaysInRange(range: PlanningDateRange): string[] {
  const inRange = new Set(listIsoDatesInRange(range.from, range.to))
  return listMondaysInRange(range)
    .flatMap((monday) => weekDayStrings(monday))
    .filter((d) => inRange.has(d))
}

export async function collectPlanningItemsInRange(
  pool: pg.Pool,
  range: PlanningDateRange,
): Promise<{ weeks: PlanningRangeWeek[]; items: PlanningRangeItemRow[] }> {
  const weeks: PlanningRangeWeek[] = []
  const items: PlanningRangeItemRow[] = []
  for (const weekStartDate of listMondaysInRange(range)) {
    const [draftRow, publishedRow] = await Promise.all([
      findDraftOperationalWorkPlanByWeekStart(pool, weekStartDate),
      findPublishedOperationalWorkPlanByWeekStart(pool, weekStartDate),
    ])
    const editableRow = draftRow ?? publishedRow
    const situation: OperationalPlanningExportSituation | null = !editableRow
      ? null
      : draftRow && publishedRow
        ? 'REVISAO_NAO_PUBLICADA'
        : draftRow
          ? 'RASCUNHO'
          : 'PUBLICADO'
    weeks.push({
      weekStartDate,
      weekEndDate: fridayAfterMonday(weekStartDate),
      situation,
      workPlanId: editableRow?.id ?? null,
    })
    if (!editableRow || !situation) continue
    const rows = await listEnrichedItemsForWorkPlanExport(pool, editableRow.id)
    for (const row of rows) {
      if (row.planned_date < range.from || row.planned_date > range.to) continue
      items.push({ ...row, week_start_date: weekStartDate, plan_situation: situation })
    }
  }
  return { weeks, items }
}

export type CollaboratorLoadRow = {
  collaboratorId: string
  /** Minutos de capacidade somados nos dias úteis do intervalo; `null` sem capacidade cadastrada. */
  capacityMinutes: number | null
  plannedMinutes: number
  workdays: number
  daysWithoutCapacity: number
}

/** Carga diária e consolidada por colaborador no intervalo (colaboradores ativos + alocados). */
export async function buildCollaboratorLoadInRange(
  pool: pg.Pool,
  range: PlanningDateRange,
  items: readonly PlanItemExportRow[],
): Promise<{ daily: CapacityByCollaboratorDayRow[]; totals: CollaboratorLoadRow[] }> {
  const workdays = planningWorkdaysInRange(range)
  const activeCollaboratorIds = await listActiveCollaboratorIdsForPlanningBoard(pool)
  const daily = await buildCapacityByCollaboratorDay(pool, {
    items,
    weekdayDates: workdays,
    collaboratorIds: activeCollaboratorIds,
  })
  const byCollaborator = new Map<string, CollaboratorLoadRow>()
  for (const row of daily) {
    const current = byCollaborator.get(row.collaboratorId) ?? {
      collaboratorId: row.collaboratorId,
      capacityMinutes: null,
      plannedMinutes: 0,
      workdays: 0,
      daysWithoutCapacity: 0,
    }
    current.workdays += 1
    current.plannedMinutes += row.plannedMinutes
    const validCapacity =
      typeof row.capacityMinutes === 'number' &&
      Number.isFinite(row.capacityMinutes) &&
      row.capacityMinutes > 0
    if (validCapacity) {
      current.capacityMinutes = (current.capacityMinutes ?? 0) + row.capacityMinutes
    } else {
      current.daysWithoutCapacity += 1
    }
    byCollaborator.set(row.collaboratorId, current)
  }
  return { daily, totals: [...byCollaborator.values()] }
}
