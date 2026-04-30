import type pg from 'pg'
import { DatabaseError } from 'pg'
import {
  findAppUserEmailById,
  findCollaboratorIdByAppUserId,
} from '../auth/auth.repository.js'
import { insertAdminAuditEvent } from '../admin-audit/admin-audit.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  assigneeRowToCreated,
  assigneeListRowToDto,
  timeEntryRowToCreated,
  timeEntryListRowToDto,
  type AssigneeCreatedDto,
  type AssigneeListItemDto,
  type TimeEntryCreatedDto,
  type TimeEntryListItemDto,
} from './conveyorAssignments.dto.js'
import {
  findAssigneeIdForStepAndCollaborator,
  findConveyorNodeById,
  findConveyorNodeAssigneeById,
  findConveyorTimeEntryById,
  insertConveyorNodeAssignee,
  insertConveyorTimeEntry,
  listConveyorNodeAssigneesByStep,
  listConveyorTimeEntriesByStep,
  newAssignmentId,
  softDeleteConveyorNodeAssignee,
  softDeleteConveyorTimeEntry,
  type InsertConveyorNodeAssigneeRow,
  type InsertConveyorTimeEntryRow,
} from './conveyorAssignments.repository.js'
import { findTeamById } from '../teams/teams.repository.js'
import { detectAndRecordConveyorStepCompleted } from './operational-events/conveyor-step-completion-events.service.js'

function isPgUniqueViolation(err: unknown): boolean {
  return err instanceof DatabaseError && err.code === '23505'
}

function isPgCheckOrRaise(err: unknown): boolean {
  return err instanceof DatabaseError && (err.code === '23514' || err.code === 'P0001')
}

export async function collaboratorActiveForOperations(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<boolean> {
  const r = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok FROM collaborators
     WHERE id = $1::uuid
       AND deleted_at IS NULL
       AND is_active = true
     LIMIT 1`,
    [collaboratorId],
  )
  return Boolean(r.rows[0])
}

/**
 * Validação de domínio (defesa em profundidade junto aos triggers).
 * Nó inexistente → 404; regras operacionais (conveyor / tipo) → 422.
 */
export async function assertNodeIsStepForConveyor(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
): Promise<void> {
  const node = await findConveyorNodeById(pool, conveyorNodeId)
  if (!node) {
    throw new AppError('Nó não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  if (node.conveyor_id !== conveyorId) {
    throw new AppError(
      'conveyor_id incompatível com o nó.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (node.node_type !== 'STEP') {
    throw new AppError(
      'Operação permitida apenas em atividades (STEP).',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
}

export type CreateNodeAssigneeInput = {
  conveyorId: string
  conveyorNodeId: string
  type?: 'COLLABORATOR' | 'TEAM'
  collaboratorId?: string
  teamId?: string
  isPrimary: boolean
  assignmentOrigin?: 'manual' | 'base' | 'reaproveitada'
  orderIndex?: number
  metadataJson?: unknown | null
}

export async function serviceCreateConveyorNodeAssignee(
  pool: pg.Pool,
  input: CreateNodeAssigneeInput,
): Promise<AssigneeCreatedDto> {
  const type = input.type ?? 'COLLABORATOR'
  if (type === 'COLLABORATOR') {
    if (!input.collaboratorId) {
      throw new AppError(
        'collaboratorId é obrigatório para assignee COLLABORATOR.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    const ok = await collaboratorActiveForOperations(pool, input.collaboratorId)
    if (!ok) {
      throw new AppError(
        'Colaborador inexistente, inativo ou indisponível.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  } else {
    if (!input.teamId) {
      throw new AppError(
        'teamId é obrigatório para assignee TEAM.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (input.isPrimary) {
      throw new AppError(
        'Assignee TEAM não pode ser principal.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    const t = await findTeamById(pool, input.teamId)
    if (!t || !t.is_active || t.deleted_at) {
      throw new AppError(
        'Time inexistente ou inativo.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }

  await assertNodeIsStepForConveyor(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
  )

  const row: InsertConveyorNodeAssigneeRow = {
    id: newAssignmentId(),
    conveyor_id: input.conveyorId,
    conveyor_node_id: input.conveyorNodeId,
    assignment_type: type,
    collaborator_id: type === 'COLLABORATOR' ? input.collaboratorId! : null,
    team_id: type === 'TEAM' ? input.teamId! : null,
    is_primary: input.isPrimary,
    assignment_origin: input.assignmentOrigin ?? 'manual',
    order_index: input.orderIndex ?? 0,
    metadata_json: input.metadataJson ?? null,
  }

  try {
    await insertConveyorNodeAssignee(pool, row)
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      throw new AppError(
        type === 'TEAM'
          ? 'Time já alocado nesta atividade.'
          : 'Colaborador já alocado nesta atividade, ou já existe um responsável principal.',
        409,
        ErrorCodes.CONFLICT,
      )
    }
    if (isPgCheckOrRaise(err)) {
      throw new AppError(
        err instanceof Error ? err.message : 'Regra de integridade violada.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    throw err
  }

  const created = await findConveyorNodeAssigneeById(pool, row.id)
  if (!created) {
    throw new AppError('Alocação não encontrada após criação.', 500, ErrorCodes.INTERNAL)
  }
  return assigneeRowToCreated(created)
}

export async function serviceListConveyorNodeAssignees(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
): Promise<AssigneeListItemDto[]> {
  await assertNodeIsStepForConveyor(pool, conveyorId, conveyorNodeId)
  const rows = await listConveyorNodeAssigneesByStep(pool, conveyorId, conveyorNodeId)
  return rows.map(assigneeListRowToDto)
}

export async function serviceDeleteConveyorNodeAssignee(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
  assigneeId: string,
): Promise<{ deleted: true; id: string }> {
  await assertNodeIsStepForConveyor(pool, conveyorId, conveyorNodeId)
  const removed = await softDeleteConveyorNodeAssignee(pool, {
    id: assigneeId,
    conveyorId,
    conveyorNodeId,
  })
  if (!removed) {
    throw new AppError('Responsável não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return { deleted: true, id: assigneeId }
}

export type CreateTimeEntryInput = {
  conveyorId: string
  conveyorNodeId: string
  collaboratorId: string
  conveyorNodeAssigneeId?: string | null
  entryAt?: Date
  minutes: number
  notes?: string | null
  entryMode?: 'manual' | 'guided' | 'imported'
  metadataJson?: unknown | null
}

export type CreateTimeEntryForAppUserInput = {
  appUserId: string
  conveyorId: string
  conveyorNodeId: string
  minutes: number
  notes?: string | null
  entryAt?: Date
  entryMode?: 'manual' | 'guided' | 'imported'
}

export type CreateTimeEntryOnBehalfInput = {
  actorAppUserId: string
  conveyorId: string
  conveyorNodeId: string
  targetCollaboratorId: string
  entryAt?: Date
  minutes: number
  notes?: string | null
  reason: string
}

const DELEGATION_REASON_MAX = 4000

/**
 * Apontamento pelo colaborador autenticado (`app_users.collaborator_id`).
 * Exige alocação ativa no STEP; ignora qualquer collaboratorId no cliente.
 */
export async function serviceCreateConveyorTimeEntryForAppUser(
  pool: pg.Pool,
  input: CreateTimeEntryForAppUserInput,
): Promise<TimeEntryCreatedDto> {
  await assertNodeIsStepForConveyor(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
  )

  const collaboratorId = await findCollaboratorIdByAppUserId(pool, input.appUserId)
  if (!collaboratorId) {
    throw new AppError(
      'Conta sem colaborador operacional vinculado. Contacte o administrador para associar o seu utilizador a um colaborador.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const assigneeId = await findAssigneeIdForStepAndCollaborator(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
    collaboratorId,
  )
  if (!assigneeId) {
    throw new AppError(
      'Não está alocado nesta atividade. Não é possível apontar.',
      403,
      ErrorCodes.FORBIDDEN,
    )
  }

  return serviceCreateConveyorTimeEntry(pool, {
    conveyorId: input.conveyorId,
    conveyorNodeId: input.conveyorNodeId,
    collaboratorId,
    conveyorNodeAssigneeId: assigneeId,
    entryAt: input.entryAt,
    minutes: input.minutes,
    notes: input.notes ?? null,
    entryMode: input.entryMode,
  })
}

export async function serviceCreateConveyorTimeEntry(
  pool: pg.Pool,
  input: CreateTimeEntryInput,
): Promise<TimeEntryCreatedDto> {
  if (input.minutes <= 0) {
    throw new AppError(
      'minutes deve ser maior que zero.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const ok = await collaboratorActiveForOperations(pool, input.collaboratorId)
  if (!ok) {
    throw new AppError(
      'Colaborador inexistente, inativo ou indisponível.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  await assertNodeIsStepForConveyor(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
  )

  const row: InsertConveyorTimeEntryRow = {
    id: newAssignmentId(),
    conveyor_id: input.conveyorId,
    conveyor_node_id: input.conveyorNodeId,
    collaborator_id: input.collaboratorId,
    conveyor_node_assignee_id: input.conveyorNodeAssigneeId ?? null,
    entry_at: input.entryAt ?? new Date(),
    minutes: input.minutes,
    notes: input.notes ?? null,
    entry_mode: input.entryMode ?? 'manual',
    metadata_json: input.metadataJson ?? null,
  }

  try {
    await insertConveyorTimeEntry(pool, row)
  } catch (err) {
    if (isPgCheckOrRaise(err)) {
      throw new AppError(
        err instanceof Error ? err.message : 'Regra de integridade violada.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    throw err
  }

  const created = await findConveyorTimeEntryById(pool, row.id)
  if (!created) {
    throw new AppError('Apontamento não encontrado após criação.', 500, ErrorCodes.INTERNAL)
  }
  await detectAndRecordConveyorStepCompleted(pool, {
    // TODO: quando existir conclusão explícita de STEP, esta chamada passará a materializar o evento.
    conveyorId: input.conveyorId,
    stepNodeId: input.conveyorNodeId,
    source: 'USER_ACTION',
    occurredAt: created.entry_at,
  })
  return timeEntryRowToCreated(created, null)
}

/**
 * Apontamento em nome de outro colaborador — exige alocação ativa do alvo no STEP.
 * `entry_mode` permanece `manual`; delegação em `metadata_json` + auditoria.
 */
export async function serviceCreateConveyorTimeEntryOnBehalf(
  pool: pg.Pool,
  input: CreateTimeEntryOnBehalfInput,
): Promise<TimeEntryCreatedDto> {
  const reason = input.reason.trim()
  if (!reason.length) {
    throw new AppError(
      'Indique o motivo do apontamento em nome de outro colaborador.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (reason.length > DELEGATION_REASON_MAX) {
    throw new AppError(
      'Motivo excede o tamanho máximo permitido.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (input.minutes <= 0) {
    throw new AppError(
      'minutes deve ser maior que zero.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const targetOk = await collaboratorActiveForOperations(
    pool,
    input.targetCollaboratorId,
  )
  if (!targetOk) {
    throw new AppError(
      'Colaborador inexistente, inativo ou indisponível.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  await assertNodeIsStepForConveyor(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
  )

  const assigneeId = await findAssigneeIdForStepAndCollaborator(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
    input.targetCollaboratorId,
  )
  if (!assigneeId) {
    throw new AppError(
      'O colaborador indicado não está alocado nesta atividade.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const metadataJson = {
    recordedByAppUserId: input.actorAppUserId,
    delegationReason: reason,
    isDelegated: true,
  }

  const row: InsertConveyorTimeEntryRow = {
    id: newAssignmentId(),
    conveyor_id: input.conveyorId,
    conveyor_node_id: input.conveyorNodeId,
    collaborator_id: input.targetCollaboratorId,
    conveyor_node_assignee_id: assigneeId,
    entry_at: input.entryAt ?? new Date(),
    minutes: input.minutes,
    notes: input.notes ?? null,
    entry_mode: 'manual',
    metadata_json: metadataJson,
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    try {
      await insertConveyorTimeEntry(client, row)
    } catch (err) {
      if (isPgCheckOrRaise(err)) {
        throw new AppError(
          err instanceof Error ? err.message : 'Regra de integridade violada.',
          422,
          ErrorCodes.VALIDATION_ERROR,
        )
      }
      throw err
    }
    await insertAdminAuditEvent(client, {
      eventType: 'time_entry_created_on_behalf',
      actorUserId: input.actorAppUserId,
      targetUserId: null,
      targetCollaboratorId: input.targetCollaboratorId,
      metadata: {
        conveyor_id: input.conveyorId,
        step_node_id: input.conveyorNodeId,
        time_entry_id: row.id,
        target_collaborator_id: input.targetCollaboratorId,
        reason,
      },
    })
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const created = await findConveyorTimeEntryById(pool, row.id)
  if (!created) {
    throw new AppError(
      'Apontamento não encontrado após criação.',
      500,
      ErrorCodes.INTERNAL,
    )
  }
  await detectAndRecordConveyorStepCompleted(pool, {
    // TODO: quando existir conclusão explícita de STEP, esta chamada passará a materializar o evento.
    conveyorId: input.conveyorId,
    stepNodeId: input.conveyorNodeId,
    source: 'USER_ACTION',
    occurredAt: created.entry_at,
    createdBy: input.actorAppUserId,
  })
  const actorEmail = await findAppUserEmailById(pool, input.actorAppUserId)
  return timeEntryRowToCreated(created, actorEmail)
}

export async function serviceListConveyorTimeEntries(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
): Promise<TimeEntryListItemDto[]> {
  await assertNodeIsStepForConveyor(pool, conveyorId, conveyorNodeId)
  const rows = await listConveyorTimeEntriesByStep(pool, conveyorId, conveyorNodeId)
  return rows.map(timeEntryListRowToDto)
}

export async function serviceDeleteConveyorTimeEntry(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
  timeEntryId: string,
): Promise<{ deleted: true; id: string }> {
  await assertNodeIsStepForConveyor(pool, conveyorId, conveyorNodeId)
  const removed = await softDeleteConveyorTimeEntry(pool, {
    id: timeEntryId,
    conveyorId,
    conveyorNodeId,
  })
  if (!removed) {
    throw new AppError('Apontamento não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return { deleted: true, id: timeEntryId }
}

export async function serviceDeleteConveyorTimeEntryAsAppUser(
  pool: pg.Pool,
  input: {
    appUserId: string
    conveyorId: string
    conveyorNodeId: string
    timeEntryId: string
  },
): Promise<{ deleted: true; id: string }> {
  const entry = await findConveyorTimeEntryById(pool, input.timeEntryId)
  if (
    !entry ||
    entry.conveyor_id !== input.conveyorId ||
    entry.conveyor_node_id !== input.conveyorNodeId
  ) {
    throw new AppError('Apontamento não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const collaboratorId = await findCollaboratorIdByAppUserId(pool, input.appUserId)
  if (!collaboratorId || entry.collaborator_id !== collaboratorId) {
    throw new AppError(
      'Não foi possível remover este apontamento.',
      403,
      ErrorCodes.FORBIDDEN,
    )
  }
  return serviceDeleteConveyorTimeEntry(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
    input.timeEntryId,
  )
}
