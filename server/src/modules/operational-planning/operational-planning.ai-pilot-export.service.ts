import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  getOperationalCapacitySettings,
  listCollaboratorCapacityOverrides,
} from '../operational-settings/operational-settings.repository.js'
import { resolveDailyCapacityMinutes } from '../operational-settings/operational-settings.service.js'
import { pickOverrideDailyMinutesForDate } from './buildCapacityByCollaboratorDay.js'
import {
  buildAiPilotExportFilename,
  buildAiPilotExportWorkbookBuffer,
  type AiPilotActivityRow,
  type AiPilotCapacityRow,
} from './operational-planning.ai-pilot-export.js'
import {
  listAiPilotActivities,
  listAiPilotCapacityCollaborators,
  listAiPilotFixedAllocations,
  listAiPilotSequences,
  sumAiPilotAllocatedMinutesByCollaboratorDay,
} from './operational-planning.ai-pilot-export.repository.js'
import {
  fridayAfterMonday,
  mondayOfWeekContaining,
  parseIsoDateUtc,
} from './operational-planning.week.js'

const MAX_RANGE_DAYS = 31
const MS_DAY = 86_400_000

const PRIORITY_RANK: Record<string, number> = { alta: 1, media: 2, baixa: 3 }

function todayInSaoPaulo(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now)
}

/** Sem datas → semana corrente (seg–sex). Só `inicio` → até a sexta da mesma semana. */
export function resolveAiPilotExportRange(
  input: { inicio?: string; fim?: string },
  now: Date = new Date(),
): { startDate: string; endDate: string } {
  const startDate = input.inicio ?? mondayOfWeekContaining(todayInSaoPaulo(now))
  const endDate = input.fim ?? fridayAfterMonday(mondayOfWeekContaining(startDate))
  const spanDays = (parseIsoDateUtc(endDate).getTime() - parseIsoDateUtc(startDate).getTime()) / MS_DAY
  if (spanDays < 0) {
    throw new AppError('fim deve ser igual ou posterior a inicio.', 400, ErrorCodes.VALIDATION_ERROR)
  }
  if (spanDays > MAX_RANGE_DAYS) {
    throw new AppError(
      `Intervalo máximo de ${MAX_RANGE_DAYS} dias.`,
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return { startDate, endDate }
}

/** Dias úteis (seg–sex) no intervalo inclusivo. */
export function weekdaysBetween(startDate: string, endDate: string): string[] {
  const out: string[] = []
  const end = parseIsoDateUtc(endDate).getTime()
  for (let t = parseIsoDateUtc(startDate).getTime(); t <= end; t += MS_DAY) {
    const d = new Date(t)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export async function serviceExportAiPilotPlanningXlsx(
  pool: pg.Pool,
  input: { inicio?: string; fim?: string },
): Promise<{ buffer: Buffer; filename: string }> {
  const { startDate, endDate } = resolveAiPilotExportRange(input)
  const dates = weekdaysBetween(startDate, endDate)

  const [activityRows, fixedRows, allocatedRows, settings, overrides] = await Promise.all([
    listAiPilotActivities(pool),
    listAiPilotFixedAllocations(pool, startDate, endDate),
    sumAiPilotAllocatedMinutesByCollaboratorDay(pool, startDate, endDate),
    getOperationalCapacitySettings(pool),
    listCollaboratorCapacityOverrides(pool, { includeDeleted: false }),
  ])

  const activities: AiPilotActivityRow[] = activityRows.map((r) => ({
    activityId: r.activity_id,
    name: r.name,
    priority: PRIORITY_RANK[r.conveyor_priority] ?? 2,
    orderIndex: r.order_index,
    status: r.operational_status === 'IN_PROGRESS' ? 'em_andamento' : 'pendente',
    durationMinutes: Math.max(0, r.planned_minutes ?? 0) * Math.max(1, r.planned_quantity ?? 1),
    conveyorId: r.conveyor_id,
    conveyorCode: r.conveyor_code ?? '',
    conveyorSequence: Number(r.conveyor_sequence),
  }))

  const sequenceRows = await listAiPilotSequences(
    pool,
    activities.map((a) => a.activityId),
  )

  const allocatedByKey = new Map<string, number>()
  for (const r of allocatedRows) {
    allocatedByKey.set(`${r.collaborator_id}|${r.planned_date}`, Number(r.allocated_minutes))
  }
  const collaborators = await listAiPilotCapacityCollaborators(pool, [
    ...new Set(allocatedRows.map((r) => r.collaborator_id)),
  ])

  const defaultDailyMinutes = settings?.default_daily_minutes ?? null
  const defaultCapacity = resolveDailyCapacityMinutes({
    defaultDailyMinutes,
    overrideDailyMinutes: null,
  })
  const capacities: AiPilotCapacityRow[] = []
  for (const c of collaborators) {
    for (const date of dates) {
      const overrideDailyMinutes = pickOverrideDailyMinutesForDate(overrides, c.id, date)
      const capacityMinutes = resolveDailyCapacityMinutes({ defaultDailyMinutes, overrideDailyMinutes })
      capacities.push({
        collaboratorId: c.id,
        collaboratorName: c.full_name,
        date,
        capacityMinutes,
        allocatedMinutes: allocatedByKey.get(`${c.id}|${date}`) ?? 0,
        reductionReason:
          capacityMinutes < defaultCapacity
            ? `Jornada reduzida por override de capacidade (${capacityMinutes} de ${defaultCapacity} min)`
            : '',
      })
    }
  }

  const buffer = await buildAiPilotExportWorkbookBuffer({
    startDate,
    endDate,
    generatedAt: new Date(),
    activities,
    sequences: sequenceRows.map((r) => ({
      activityId: r.activity_id,
      collaboratorId: r.collaborator_id,
      collaboratorName: r.collaborator_name,
      sequencePosition: Number(r.sequence_position),
      origin: r.origin,
    })),
    capacities,
    fixedAllocations: fixedRows.map((r) => ({
      activityId: r.activity_id,
      collaboratorId: r.collaborator_id,
      date: r.planned_date,
      durationMinutes: r.duration_minutes,
    })),
  })

  return { buffer, filename: buildAiPilotExportFilename(startDate, endDate) }
}
