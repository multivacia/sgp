import type pg from 'pg'
import { listCollaborators } from '../collaborators/collaborators.repository.js'
import {
  buildCollaboratorLoadInRange,
  collectPlanningItemsInRange,
  type PlanningDateRange,
  type PlanningRangeWeek,
} from './operational-planning.range.js'
import {
  buildPlanningAiExportFilename,
  buildPlanningAiExportWorkbookBuffer,
  type PlanningAiBacklogRow,
  type PlanningAiExportScope,
  type PlanningAiLoadDailyRow,
  type PlanningAiLoadRow,
  type PlanningAiPlannedRow,
} from './operational-planning.ai-export.js'
import type { OperationalPlanningExportSituation } from './operational-planning.export.js'
import { listFactoryIntakeItems } from './operational-planning.repository.js'
import {
  classifyCapacityRow,
  mapExportActivityStatusLabel,
  serviceListOperationalPlanningBacklog,
} from './operational-planning.service.js'

/** Item planejado em qualquer semana do recorte (pesquisa por período do Planejamento). */
export type PlanningPeriodItemApi = {
  workPlanItemId: string
  weekStartDate: string
  planSituation: OperationalPlanningExportSituation
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  assignedCollaboratorId: string | null
  assignedCollaboratorName: string | null
  assignedTeamName: string | null
  conveyorId: string
  conveyorCode: string | null
  conveyorTitle: string
  taskTitle: string
  sectorTitle: string
  activityNodeId: string
  activityTitle: string
  activityOperationalStatus: string | null
  activityStatusLabel: string
}

export type PlanningPeriodItemsResponse = {
  range: PlanningDateRange
  weeks: PlanningRangeWeek[]
  summary: { plannedItems: number; plannedMinutes: number; collaboratorsCount: number }
  items: PlanningPeriodItemApi[]
}

export async function serviceListPlanningPeriodItems(
  pool: pg.Pool,
  range: PlanningDateRange,
): Promise<PlanningPeriodItemsResponse> {
  const { weeks, items } = await collectPlanningItemsInRange(pool, range)
  const mapped = items.map<PlanningPeriodItemApi>((r) => ({
    workPlanItemId: r.id,
    weekStartDate: r.week_start_date,
    planSituation: r.plan_situation,
    plannedDate: r.planned_date,
    plannedOrder: r.planned_order,
    plannedMinutes: r.planned_minutes,
    assignedCollaboratorId: r.assigned_collaborator_id,
    assignedCollaboratorName: r.assigned_collaborator_name,
    assignedTeamName: r.assigned_team_name,
    conveyorId: r.conveyor_id,
    conveyorCode: r.conveyor_code,
    conveyorTitle: r.conveyor_title,
    taskTitle: r.task_title,
    sectorTitle: r.sector_title,
    activityNodeId: r.activity_node_id,
    activityTitle: r.activity_title,
    activityOperationalStatus: r.activity_operational_status,
    activityStatusLabel: mapExportActivityStatusLabel(r.activity_operational_status),
  }))
  return {
    range,
    weeks,
    summary: {
      plannedItems: mapped.length,
      plannedMinutes: mapped.reduce((s, i) => s + Math.max(0, i.plannedMinutes ?? 0), 0),
      collaboratorsCount: new Set(
        mapped.map((i) => i.assignedCollaboratorId).filter((id): id is string => Boolean(id)),
      ).size,
    },
    items: mapped,
  }
}

const PRIORITY_LABELS: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

function dash(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : '—'
}

/** Equipes ativas de cada colaborador (nomes separados por vírgula). */
async function listTeamNamesByCollaborator(pool: pg.Pool): Promise<Map<string, string>> {
  const r = await pool.query<{ collaborator_id: string; names: string }>(
    `
    SELECT tm.collaborator_id::text AS collaborator_id,
           string_agg(DISTINCT t.name, ', ' ORDER BY t.name) AS names
    FROM team_members tm
    INNER JOIN teams t ON t.id = tm.team_id AND t.deleted_at IS NULL
    WHERE tm.is_active = TRUE
    GROUP BY tm.collaborator_id
    `,
  )
  return new Map(r.rows.map((row) => [row.collaborator_id, row.names]))
}

/** Itens do plano da esteira já encaixados em algum plano semanal (rascunho ou publicado). */
async function listLinkedConveyorPlanItemIds(pool: pg.Pool): Promise<Set<string>> {
  const r = await pool.query<{ id: string }>(
    `
    SELECT DISTINCT i.conveyor_operational_plan_item_id::text AS id
    FROM operational_work_plan_items i
    INNER JOIN operational_work_plans p ON p.id = i.work_plan_id AND p.deleted_at IS NULL
    WHERE i.deleted_at IS NULL
      AND i.conveyor_operational_plan_item_id IS NOT NULL
    `,
  )
  return new Set(r.rows.map((row) => row.id))
}

/** Limite técnico do estoque exportado (o backlog da tela usa no máximo 200 por consulta). */
const AI_EXPORT_BACKLOG_LIMIT = 10_000

/**
 * Export "Planejamento para IA": Backlog (estoque atual), Planejado e Carga no recorte.
 * Somente leitura.
 */
export async function serviceExportPlanningAiXlsx(
  pool: pg.Pool,
  input: { range: PlanningDateRange; scope: PlanningAiExportScope },
): Promise<{ buffer: Buffer; filename: string }> {
  const { range, scope } = input
  const [{ weeks, items }, backlog, factoryIntake, linkedIds, collaborators, teamsByCollaborator] =
    await Promise.all([
      collectPlanningItemsInRange(pool, range),
      serviceListOperationalPlanningBacklog(pool, {
        q: null,
        limit: AI_EXPORT_BACKLOG_LIMIT,
        conveyorId: null,
        collaboratorId: null,
      }),
      listFactoryIntakeItems(pool),
      listLinkedConveyorPlanItemIds(pool),
      listCollaborators(pool, {}),
      listTeamNamesByCollaborator(pool),
    ])
  const collaboratorNameById = new Map(collaborators.map((c) => [c.id, c.full_name]))

  const backlogRows: PlanningAiBacklogRow[] = [
    ...backlog.items.map<PlanningAiBacklogRow>((b) => ({
      origin: 'Backlog',
      activityNodeId: b.activityNodeId,
      conveyorId: b.conveyorId,
      conveyorCode: dash(b.conveyorCode),
      conveyorTitle: b.conveyorTitle,
      clientName: dash(b.clientName),
      vehicle: dash(b.vehicleDescription),
      plate: dash(b.licensePlate),
      priority: PRIORITY_LABELS[b.conveyorPriority ?? ''] ?? dash(b.conveyorPriority),
      estimatedDeadline: dash(b.estimatedDeadline),
      deadlineOverdue: b.isOverdue ? 'Sim' : 'Não',
      taskTitle: b.taskTitle,
      sectorTitle: b.sectorTitle,
      activityTitle: b.activityTitle,
      plannedQuantity: b.plannedQuantity ?? null,
      plannedMinutes: b.plannedMinutes,
      realizedMinutes: b.realizedMinutes,
      pendingMinutes: b.pendingMinutes,
      responsibleCollaborators: b.assignedCollaborators.map((c) => c.fullName).join(', ') || '—',
      responsibleTeams: b.assignedTeams.map((t) => t.name).join(', ') || '—',
      outOfSequence: b.isOutOfSequence ? 'Sim' : 'Não',
      suggestedDate: null,
      suggestedAssignee: '—',
      situation: 'Disponível',
    })),
    ...factoryIntake
      .filter((f) => !linkedIds.has(f.conveyor_operational_plan_item_id))
      .map<PlanningAiBacklogRow>((f) => ({
        origin: 'Aguardando encaixe',
        activityNodeId: f.activity_node_id,
        conveyorId: f.conveyor_id,
        conveyorCode: '—',
        conveyorTitle: f.conveyor_name,
        clientName: '—',
        vehicle: '—',
        plate: '—',
        priority: '—',
        estimatedDeadline: '—',
        deadlineOverdue: '—',
        taskTitle: f.task_title,
        sectorTitle: f.sector_title,
        activityTitle: f.activity_title,
        plannedQuantity: null,
        plannedMinutes: f.planned_minutes,
        realizedMinutes: f.realized_minutes,
        pendingMinutes:
          f.planned_minutes == null ? null : Math.max(0, f.planned_minutes - f.realized_minutes),
        responsibleCollaborators: '—',
        responsibleTeams: '—',
        outOfSequence: '—',
        suggestedDate: f.planned_date,
        suggestedAssignee:
          [f.planned_collaborator_name, f.planned_team_name].filter(Boolean).join(' / ') || '—',
        situation: mapExportActivityStatusLabel(f.activity_operational_status),
      })),
  ]

  const plannedRows: PlanningAiPlannedRow[] = items.map((r) => ({
    weekStartDate: r.week_start_date,
    planSituation: r.plan_situation,
    plannedDate: r.planned_date,
    workPlanItemId: r.id,
    activityNodeId: r.activity_node_id,
    collaboratorId: r.assigned_collaborator_id ?? '—',
    collaboratorName: r.assigned_collaborator_name ?? 'Não atribuído',
    teamName: dash(r.assigned_team_name),
    conveyorCode: dash(r.conveyor_code),
    conveyorTitle: r.conveyor_title,
    clientName: dash(r.conveyor_client_name),
    priority: PRIORITY_LABELS[r.conveyor_priority ?? ''] ?? dash(r.conveyor_priority),
    estimatedDeadline: dash(r.conveyor_estimated_deadline),
    taskTitle: r.task_title,
    sectorTitle: r.sector_title,
    activityTitle: r.activity_title,
    plannedOrderDisplay: r.planned_order + 1,
    plannedQuantity: r.activity_planned_quantity ?? null,
    plannedMinutes: r.planned_minutes,
    activityStatusLabel: mapExportActivityStatusLabel(r.activity_operational_status),
    notes: dash(r.notes),
  }))

  const { daily, totals } = await buildCollaboratorLoadInRange(pool, range, items)
  const nameOf = (id: string) => collaboratorNameById.get(id) ?? '—'

  const loadRows: PlanningAiLoadRow[] = totals
    .map((t) => ({
      collaboratorId: t.collaboratorId,
      collaboratorName: nameOf(t.collaboratorId),
      teams: teamsByCollaborator.get(t.collaboratorId) ?? '—',
      workdays: t.workdays,
      daysWithoutCapacity: t.daysWithoutCapacity,
      capacityMinutes: t.capacityMinutes,
      plannedMinutes: t.plannedMinutes,
      statusLabel: classifyCapacityRow(t.capacityMinutes, t.plannedMinutes).statusLabel,
    }))
    .sort((a, b) => a.collaboratorName.localeCompare(b.collaboratorName, 'pt-BR'))

  const loadDailyRows: PlanningAiLoadDailyRow[] = daily
    .map((d) => {
      const classified = classifyCapacityRow(d.capacityMinutes, d.plannedMinutes)
      return {
        date: d.date,
        collaboratorId: d.collaboratorId,
        collaboratorName: nameOf(d.collaboratorId),
        capacityMinutes:
          classified.statusLabel === 'Capacidade não cadastrada' ? null : d.capacityMinutes,
        plannedMinutes: d.plannedMinutes,
        statusLabel: classified.statusLabel,
      }
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.collaboratorName.localeCompare(b.collaboratorName, 'pt-BR'),
    )

  const meta = {
    scope,
    from: range.from,
    to: range.to,
    generatedAt: new Date(),
    weeks: weeks.map((w) => ({
      weekStartDate: w.weekStartDate,
      weekEndDate: w.weekEndDate,
      situation: w.situation,
    })),
  }
  const buffer = await buildPlanningAiExportWorkbookBuffer({
    meta,
    backlogRows,
    plannedRows,
    loadRows,
    loadDailyRows,
  })
  return { buffer, filename: buildPlanningAiExportFilename(meta) }
}
