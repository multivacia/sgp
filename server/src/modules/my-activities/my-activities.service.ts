import type pg from 'pg'
import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  getOperationalBucketForConveyor,
  operationalBucketSortRank,
  parseFlexibleDeadlineToDate,
} from '../../shared/operationalBucket.js'
import type {
  MyActivityItemApi,
  TimeEntryCandidateItemApi,
} from './my-activities.dto.js'
import {
  listActivitiesRawForCollaborator,
  listTimeEntryCandidatesForCollaborator,
  type TimeEntryCandidateRawRow,
} from './my-activities.repository.js'

export type GetMyActivitiesQuery = {
  userId: string
}

/**
 * Ordenação final (após filtro por colaborador):
 * 1. bucket operacional: em atraso → em revisão → em andamento → no backlog → concluídas
 * 2. prazo estimado (mais urgente primeiro; sem prazo por último dentro do bucket)
 * 3. nome da esteira (pt-BR)
 * 4. ordem da matriz: opção → área → step (`order_index` da esteira)
 */
function mapAndSortActivities(rows: Awaited<
  ReturnType<typeof listActivitiesRawForCollaborator>
>): MyActivityItemApi[] {
  const now = new Date()
  const rawByAssigneeId = new Map(rows.map((r) => [r.assignee_id, r]))
  const mapped: MyActivityItemApi[] = rows.map((row) => {
    const operationalBucket = getOperationalBucketForConveyor(
      row.conveyor_status,
      row.estimated_deadline,
      now,
    )
    return {
      assigneeId: row.assignee_id,
      conveyorId: row.conveyor_id,
      conveyorCode: row.conveyor_code,
      conveyorName: row.conveyor_name,
      conveyorStatus: row.conveyor_status,
      estimatedDeadline: row.estimated_deadline,
      operationalBucket,
      stepNodeId: row.step_node_id,
      stepName: row.step_name,
      optionName: row.option_name,
      areaName: row.area_name,
      roleInStep: row.is_primary ? 'primary' : 'support',
      plannedMinutes:
        row.planned_minutes === null || row.planned_minutes === ''
          ? null
          : Number(row.planned_minutes),
      realizedMinutes:
        row.realized_minutes === null || row.realized_minutes === ''
          ? null
          : Number(row.realized_minutes),
    }
  })

  mapped.sort((a, b) => {
    const br =
      operationalBucketSortRank(a.operationalBucket) -
      operationalBucketSortRank(b.operationalBucket)
    if (br !== 0) return br

    const da = parseFlexibleDeadlineToDate(a.estimatedDeadline)
    const db = parseFlexibleDeadlineToDate(b.estimatedDeadline)
    const ma = da === null ? Number.POSITIVE_INFINITY : da.getTime()
    const mb = db === null ? Number.POSITIVE_INFINITY : db.getTime()
    if (ma !== mb) return ma - mb

    const nc = a.conveyorName
      .trim()
      .toLocaleLowerCase('pt-BR')
      .localeCompare(b.conveyorName.trim().toLocaleLowerCase('pt-BR'), 'pt-BR')
    if (nc !== 0) return nc

    const ra = rawByAssigneeId.get(a.assigneeId)
    const rb = rawByAssigneeId.get(b.assigneeId)
    if (!ra || !rb) return 0
    const oa = Number(ra.opt_order_index)
    const ob = Number(rb.opt_order_index)
    if (oa !== ob) return oa - ob
    const aa = Number(ra.area_order_index)
    const ab = Number(rb.area_order_index)
    if (aa !== ab) return aa - ab
    return Number(ra.step_order_index) - Number(rb.step_order_index)
  })

  return mapped
}

export async function serviceListMyActivities(
  pool: pg.Pool,
  query: GetMyActivitiesQuery,
): Promise<{ items: MyActivityItemApi[]; resolvedCollaboratorId: string }> {
  const collaboratorId = await findCollaboratorIdByAppUserId(pool, query.userId)

  if (!collaboratorId) {
    throw new AppError(
      'Operação indisponível: o seu utilizador não tem colaborador operacional vinculado (app_users.collaborator_id). Peça ao administrador de governança para associar o seu acesso a um colaborador.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const raw = await listActivitiesRawForCollaborator(pool, collaboratorId)
  const items = mapAndSortActivities(raw)
  return { items, resolvedCollaboratorId: collaboratorId }
}

/** Lista atividades alocadas (mesmo shape que Minhas atividades), por id de colaborador. */
export async function serviceListActivitiesForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  options?: { conveyorId?: string | null },
): Promise<MyActivityItemApi[]> {
  const raw = await listActivitiesRawForCollaborator(pool, collaboratorId, options)
  return mapAndSortActivities(raw)
}

function mapCandidateRow(row: TimeEntryCandidateRawRow): TimeEntryCandidateItemApi {
  const planned =
    row.planned_minutes === null || row.planned_minutes === ''
      ? null
      : Number(row.planned_minutes)
  const realized = Number(row.realized_minutes ?? 0)
  const plannedNum = planned == null || Number.isNaN(planned) ? 0 : Math.max(0, planned)
  const pendingMinutes = Math.max(0, plannedNum - Math.max(0, realized))
  const at =
    row.assignment_type === 'TEAM' ? ('TEAM' as const) : ('COLLABORATOR' as const)
  return {
    conveyorId: row.conveyor_id,
    conveyorCode: row.conveyor_code,
    conveyorName: row.conveyor_name,
    clientName: row.client_name,
    vehicleLabel: row.vehicle_label,
    plate: row.plate,
    stepNodeId: row.step_node_id,
    stepName: row.step_name,
    areaName: row.area_name,
    roleInStep: row.is_primary ? 'primary' : 'support',
    assignmentType: at,
    plannedMinutes: planned,
    realizedMinutes: realized,
    pendingMinutes,
  }
}

export async function serviceListTimeEntryCandidates(
  pool: pg.Pool,
  input: {
    collaboratorId: string | null
    q: string | null
    limit: number
  },
): Promise<{
  items: TimeEntryCandidateItemApi[]
  collaboratorId: string | null
  unavailableReason: string | null
}> {
  if (!input.collaboratorId) {
    return {
      items: [],
      collaboratorId: null,
      unavailableReason:
        'Operação indisponível: o seu utilizador não tem colaborador operacional vinculado (app_users.collaborator_id). Peça ao administrador de governança para associar o seu acesso a um colaborador.',
    }
  }

  const raw = await listTimeEntryCandidatesForCollaborator(pool, input.collaboratorId, {
    q: input.q,
    limit: input.limit,
  })
  return {
    items: raw.map(mapCandidateRow),
    collaboratorId: input.collaboratorId,
    unavailableReason: null,
  }
}
