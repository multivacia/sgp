import type pg from 'pg'
import { DatabaseError } from 'pg'
import {
  findAppUserEmailById,
  findCollaboratorIdByAppUserId,
} from '../auth/auth.repository.js'
import { insertAdminAuditEvent } from '../admin-audit/admin-audit.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { normalizeExecutedQuantityInput } from '../../shared/activityOperationalQuantity.js'
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
  findStepOperationalStatusByNodeId,
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
import { findConveyorById, updateConveyorOperationalStatus } from './conveyors.repository.js'
import {
  canConveyorAcceptTimeEntry,
  timeEntryBlockedMessage,
} from './conveyorOperationalStatus.js'
import { serviceAnalyzeConveyorActivitySequence } from './conveyorActivitySequence.service.js'
import type { ConveyorActivitySequenceAnalysis } from './conveyorActivitySequence.service.js'
import { completeConveyorStepOnClient } from './conveyor-step-operational.service.js'
import type { ConveyorNodeStepOperationalStatusDb } from './stepOperationalStatus.js'
import { isStepAbortedStatus } from './stepOperationalStatus.js'
import { serviceCreateConveyorOperationalEvent } from './operational-events/conveyor-operational-events.service.js'
import { lockConveyorAndStepForUpdate } from './lockConveyorAndStepForUpdate.js'
import {
  pickStandardJustificationSnapshot,
  resolveTimeEntryJustification,
  standardJustificationRowFields,
  type ResolvedStandardJustification,
  TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
} from '../../shared/timeEntryJustificationResolver.js'
import { resolveProductionStepAssigneeId } from '../production/production-plan-assignee.js'

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
  executedQuantity?: number | null
  notes?: string | null
  entryMode?: 'manual' | 'guided' | 'imported'
  metadataJson?: unknown | null
  entryOrigin?: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exceptionJustification?: string | null
  exceptionJustificationId?: string | null
  exceptionJustificationComplement?: string | null
  /** Derivado da análise de sequência; quando true, `outOfSequenceJustification` é obrigatória. */
  isOutOfSequence?: boolean
  outOfSequenceJustification?: string | null
  outOfSequenceJustificationId?: string | null
  outOfSequenceJustificationComplement?: string | null
  /** Justificativa voluntária em apontamento normal (sem exceção/OOS). */
  voluntaryJustificationId?: string | null
  voluntaryJustificationComplement?: string | null
  /** Para evento operacional opcional após insert. */
  actorAppUserId?: string | null
  /** Avaliação subjetiva do colaborador sobre o estado atual da atividade (0-100). Kiosk only. */
  sessionCompletionPct?: number | null
  /** Colaborador indicou que a atividade está concluída. Kiosk only. */
  markAsDone?: boolean
  /** Análise de sequência prévia (evita releitura na transação). */
  sequence?: ConveyorActivitySequenceAnalysis
  standardJustificationException?: ResolvedStandardJustification | null
  standardJustificationOos?: ResolvedStandardJustification | null
}

export type CreateTimeEntryForAppUserInput = {
  appUserId: string
  conveyorId: string
  conveyorNodeId: string
  minutes: number
  executedQuantity?: number | null
  notes?: string | null
  exceptionJustification?: string
  exceptionJustificationId?: string
  exceptionJustificationComplement?: string
  outOfSequenceJustification?: string
  outOfSequenceJustificationId?: string
  outOfSequenceJustificationComplement?: string
  voluntaryJustificationId?: string
  voluntaryJustificationComplement?: string
  entryAt?: Date
  entryMode?: 'manual' | 'guided' | 'imported'
  markAsDone?: boolean
}

export type CreateTimeEntryOnBehalfInput = {
  actorAppUserId: string
  conveyorId: string
  conveyorNodeId: string
  targetCollaboratorId: string
  entryAt?: Date
  minutes: number
  executedQuantity?: number | null
  notes?: string | null
  reason: string
  outOfSequenceJustification?: string
  outOfSequenceJustificationId?: string
  outOfSequenceJustificationComplement?: string
}

const DELEGATION_REASON_MAX = 4000

/**
 * Apontamento pelo colaborador autenticado (`app_users.collaborator_id`).
 * Com alocação no STEP: apontamento normal. Sem alocação: exige `exceptionJustification`
 * (apontamento por exceção — não cria alocação).
 * Fora da sequência recomendada: exige `outOfSequenceJustification`.
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

  const seq = await serviceAnalyzeConveyorActivitySequence(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
    collaboratorId,
  )
  if (!seq.targetFound) {
    throw new AppError(
      'Esta atividade não está incluída na sequência operacional recomendada.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  let outSeqJust: string | null = null
  let oosStandard: ResolvedStandardJustification | null = null
  if (seq.isOutOfSequence) {
    const resolved = await resolveTimeEntryJustification(pool, {
      required: true,
      justificationId: input.outOfSequenceJustificationId,
      justificationComplement: input.outOfSequenceJustificationComplement,
      legacyText: input.outOfSequenceJustification,
      requiredErrorCode: ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      requiredErrorMessage: TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
    })
    outSeqJust = resolved.legacyText
    oosStandard = resolved.standard
  }

  const commonSeq = {
    isOutOfSequence: seq.isOutOfSequence,
    outOfSequenceJustification: outSeqJust,
    actorAppUserId: input.appUserId,
  }

  const assigneeId = await findAssigneeIdForStepAndCollaborator(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
    collaboratorId,
  )
  if (assigneeId) {
    return serviceCreateConveyorTimeEntry(pool, {
      conveyorId: input.conveyorId,
      conveyorNodeId: input.conveyorNodeId,
      collaboratorId,
      conveyorNodeAssigneeId: assigneeId,
      entryAt: input.entryAt,
      minutes: input.minutes,
      executedQuantity: input.executedQuantity,
      notes: input.notes ?? null,
      entryMode: input.entryMode,
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      markAsDone: input.markAsDone,
      sequence: seq,
    outOfSequenceJustificationId: input.outOfSequenceJustificationId,
    outOfSequenceJustificationComplement: input.outOfSequenceJustificationComplement,
    voluntaryJustificationId: input.voluntaryJustificationId,
    voluntaryJustificationComplement: input.voluntaryJustificationComplement,
    standardJustificationException: null,
      standardJustificationOos: oosStandard,
      ...commonSeq,
    })
  }

  const planAssigneeId = await resolveProductionStepAssigneeId(pool, {
    conveyorId: input.conveyorId,
    stepNodeId: input.conveyorNodeId,
    collaboratorId,
  })
  if (planAssigneeId) {
    return serviceCreateConveyorTimeEntry(pool, {
      conveyorId: input.conveyorId,
      conveyorNodeId: input.conveyorNodeId,
      collaboratorId,
      conveyorNodeAssigneeId: planAssigneeId,
      entryAt: input.entryAt,
      minutes: input.minutes,
      executedQuantity: input.executedQuantity,
      notes: input.notes ?? null,
      entryMode: input.entryMode,
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      markAsDone: input.markAsDone,
      sequence: seq,
    outOfSequenceJustificationId: input.outOfSequenceJustificationId,
    outOfSequenceJustificationComplement: input.outOfSequenceJustificationComplement,
    voluntaryJustificationId: input.voluntaryJustificationId,
    voluntaryJustificationComplement: input.voluntaryJustificationComplement,
    standardJustificationException: null,
      standardJustificationOos: oosStandard,
      ...commonSeq,
    })
  }

  const exceptionResolved = await resolveTimeEntryJustification(pool, {
    required: true,
    justificationId: input.exceptionJustificationId,
    justificationComplement: input.exceptionJustificationComplement,
    legacyText: input.exceptionJustification,
    requiredErrorCode: ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION,
    requiredErrorMessage: TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
  })

  return serviceCreateConveyorTimeEntry(pool, {
    conveyorId: input.conveyorId,
    conveyorNodeId: input.conveyorNodeId,
    collaboratorId,
    conveyorNodeAssigneeId: null,
    entryAt: input.entryAt,
    minutes: input.minutes,
    executedQuantity: input.executedQuantity,
    notes: input.notes ?? null,
    entryMode: input.entryMode,
    entryOrigin: 'UNASSIGNED_EXCEPTION',
    exceptionJustification: exceptionResolved.legacyText,
    markAsDone: input.markAsDone,
    sequence: seq,
    outOfSequenceJustificationId: input.outOfSequenceJustificationId,
    outOfSequenceJustificationComplement: input.outOfSequenceJustificationComplement,
    voluntaryJustificationId: input.voluntaryJustificationId,
    voluntaryJustificationComplement: input.voluntaryJustificationComplement,
    standardJustificationException: exceptionResolved.standard,
    standardJustificationOos: oosStandard,
    ...commonSeq,
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

  let executedQuantityDb: number | null = null
  try {
    executedQuantityDb = normalizeExecutedQuantityInput(input.executedQuantity)
  } catch {
    throw new AppError(
      'executedQuantity deve ser número inteiro >= 0.',
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

  const conveyor = await findConveyorById(pool, input.conveyorId)
  if (!conveyor) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  if (!canConveyorAcceptTimeEntry(conveyor.operational_status)) {
    throw new AppError(
      timeEntryBlockedMessage(conveyor.operational_status),
      422,
      ErrorCodes.CONVEYOR_TIME_ENTRY_STATUS_NOT_ALLOWED,
    )
  }

  const stepOp = await findStepOperationalStatusByNodeId(pool, input.conveyorNodeId)
  const op = (stepOp ?? 'PENDING').trim() || 'PENDING'
  if (op === 'COMPLETED') {
    throw new AppError(
      'Esta atividade já está concluída operacionalmente; não é possível novo apontamento.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (isStepAbortedStatus(op as ConveyorNodeStepOperationalStatusDb)) {
    throw new AppError(
      'Esta atividade foi dispensada; não é possível novo apontamento.',
      409,
      ErrorCodes.CONFLICT,
    )
  }

  const entryOrigin = input.entryOrigin ?? 'ASSIGNED'
  let exceptionJustification: string | null = null
  let exceptionStandard = input.standardJustificationException ?? null
  if (entryOrigin === 'UNASSIGNED_EXCEPTION') {
    if (exceptionStandard || input.exceptionJustification?.trim()) {
      exceptionJustification = input.exceptionJustification?.trim() ?? null
    } else {
      const resolved = await resolveTimeEntryJustification(pool, {
        required: true,
        justificationId: input.exceptionJustificationId,
        justificationComplement: input.exceptionJustificationComplement,
        legacyText: input.exceptionJustification,
        requiredErrorCode: ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION,
        requiredErrorMessage: TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
      })
      exceptionJustification = resolved.legacyText
      exceptionStandard = resolved.standard
    }
    if (!exceptionJustification?.length) {
      throw new AppError(
        TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
        422,
        ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION,
      )
    }
    if (input.conveyorNodeAssigneeId != null) {
      throw new AppError(
        'Apontamento por exceção não pode referenciar alocação.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }

  const isOos = Boolean(input.isOutOfSequence)
  let oosJustDb: string | null = null
  let oosStandard = input.standardJustificationOos ?? null
  if (isOos) {
    if (oosStandard || input.outOfSequenceJustification?.trim()) {
      oosJustDb = input.outOfSequenceJustification?.trim() ?? null
    } else {
      const resolved = await resolveTimeEntryJustification(pool, {
        required: true,
        justificationId: input.outOfSequenceJustificationId,
        justificationComplement: input.outOfSequenceJustificationComplement,
        legacyText: input.outOfSequenceJustification,
        requiredErrorCode: ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
        requiredErrorMessage:
          'Informe uma justificativa para executar esta atividade fora da sequência recomendada.',
      })
      oosJustDb = resolved.legacyText
      oosStandard = resolved.standard
    }
    if (!oosJustDb?.length) {
      throw new AppError(
        'Informe uma justificativa para executar esta atividade fora da sequência recomendada.',
        422,
        ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      )
    }
  }

  const standardFields = pickStandardJustificationSnapshot(exceptionStandard, oosStandard)

  let voluntaryStandard: ResolvedStandardJustification | null = null
  if (
    input.voluntaryJustificationId &&
    !exceptionStandard &&
    !oosStandard &&
    entryOrigin === 'ASSIGNED' &&
    !isOos
  ) {
    const resolved = await resolveTimeEntryJustification(pool, {
      required: false,
      justificationId: input.voluntaryJustificationId,
      justificationComplement: input.voluntaryJustificationComplement,
    })
    voluntaryStandard = resolved.standard
  }

  const mergedStandardFields =
    voluntaryStandard != null
      ? standardJustificationRowFields(voluntaryStandard)
      : standardFields

  const row: InsertConveyorTimeEntryRow = {
    id: newAssignmentId(),
    conveyor_id: input.conveyorId,
    conveyor_node_id: input.conveyorNodeId,
    collaborator_id: input.collaboratorId,
    conveyor_node_assignee_id: input.conveyorNodeAssigneeId ?? null,
    entry_at: input.entryAt ?? new Date(),
    minutes: input.minutes,
    executed_quantity: executedQuantityDb,
    notes: input.notes ?? null,
    entry_mode: input.entryMode ?? 'manual',
    metadata_json: input.metadataJson ?? null,
    entry_origin: entryOrigin,
    exception_justification: exceptionJustification,
    is_out_of_sequence: isOos,
    out_of_sequence_justification: isOos ? oosJustDb : null,
    session_completion_pct: typeof input.sessionCompletionPct === 'number' ? input.sessionCompletionPct : null,
    mark_as_done: input.markAsDone ?? false,
    ...mergedStandardFields,
  }

  const markAsDone = input.markAsDone === true
  const seq =
    input.sequence ??
    (await serviceAnalyzeConveyorActivitySequence(
      pool,
      input.conveyorId,
      input.conveyorNodeId,
      input.collaboratorId,
    ))

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const locked = await lockConveyorAndStepForUpdate(client, input.conveyorId, input.conveyorNodeId)
    const lockedStatus: ConveyorNodeStepOperationalStatusDb =
      locked.step.operational_status ?? 'PENDING'
    if (lockedStatus === 'COMPLETED') {
      throw new AppError(
        'Esta atividade já está concluída operacionalmente; não é possível novo apontamento.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (isStepAbortedStatus(lockedStatus)) {
      throw new AppError(
        'Esta atividade foi dispensada; não é possível novo apontamento.',
        409,
        ErrorCodes.CONFLICT,
      )
    }
    const shouldAutoStartLocked = locked.conveyor.operational_status === 'A_INICIAR'
    await insertConveyorTimeEntry(client, row)
    if (shouldAutoStartLocked) {
      await updateConveyorOperationalStatus(
        client,
        input.conveyorId,
        'EM_ANDAMENTO',
        'keep',
      )
    }

    if (isOos && input.actorAppUserId) {
      await serviceCreateConveyorOperationalEvent(client, {
        conveyorId: input.conveyorId,
        nodeId: input.conveyorNodeId,
        eventType: 'CONVEYOR_STEP_OUT_OF_SEQUENCE_TIME_ENTRY',
        previousValue: null,
        newValue: 'OUT_OF_SEQUENCE_TIME_ENTRY',
        reason: 'TIME_ENTRY_OUT_OF_SEQUENCE',
        source: 'USER_ACTION',
        occurredAt: new Date().toISOString(),
        createdBy: input.actorAppUserId,
        metadataJson: {
          activityNodeId: input.conveyorNodeId,
          timeEntryId: row.id,
          justification: oosJustDb,
          trigger: 'TIME_ENTRY',
          markAsDone,
        },
        idempotencyKey: `oos_te:${row.id}`,
      })
    }

    if (markAsDone) {
      await completeConveyorStepOnClient(client, {
        conveyorId: input.conveyorId,
        stepNodeId: input.conveyorNodeId,
        actorAppUserId: input.actorAppUserId ?? null,
        outOfSequenceJustification: oosJustDb,
        trigger: 'COMPLETE',
        sequence: seq,
        currentStatus: lockedStatus,
      })
    }

    await client.query('COMMIT')
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore */
    }
    if (isPgCheckOrRaise(err)) {
      throw new AppError(
        err instanceof Error ? err.message : 'Regra de integridade violada.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    throw err
  } finally {
    client.release()
  }

  const created = await findConveyorTimeEntryById(pool, row.id)
  if (!created) {
    throw new AppError('Apontamento não encontrado após criação.', 500, ErrorCodes.INTERNAL)
  }
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

  const seq = await serviceAnalyzeConveyorActivitySequence(
    pool,
    input.conveyorId,
    input.conveyorNodeId,
    input.targetCollaboratorId,
  )
  if (!seq.targetFound) {
    throw new AppError(
      'Esta atividade não está incluída na sequência operacional recomendada.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  let outSeqJust: string | null = null
  let oosStandard: ResolvedStandardJustification | null = null
  if (seq.isOutOfSequence) {
    const resolved = await resolveTimeEntryJustification(pool, {
      required: true,
      justificationId: input.outOfSequenceJustificationId,
      justificationComplement: input.outOfSequenceJustificationComplement,
      legacyText: input.outOfSequenceJustification,
      requiredErrorCode: ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      requiredErrorMessage: TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
    })
    outSeqJust = resolved.legacyText
    oosStandard = resolved.standard
  }

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

  let executedQuantityDb: number | null = null
  try {
    executedQuantityDb = normalizeExecutedQuantityInput(input.executedQuantity)
  } catch {
    throw new AppError(
      'executedQuantity deve ser número inteiro >= 0.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const standardFields = pickStandardJustificationSnapshot(null, oosStandard)

  const row: InsertConveyorTimeEntryRow = {
    id: newAssignmentId(),
    conveyor_id: input.conveyorId,
    conveyor_node_id: input.conveyorNodeId,
    collaborator_id: input.targetCollaboratorId,
    conveyor_node_assignee_id: assigneeId,
    entry_at: input.entryAt ?? new Date(),
    minutes: input.minutes,
    executed_quantity: executedQuantityDb,
    notes: input.notes ?? null,
    entry_mode: 'manual',
    metadata_json: metadataJson,
    entry_origin: 'ASSIGNED',
    exception_justification: null,
    is_out_of_sequence: seq.isOutOfSequence,
    out_of_sequence_justification: seq.isOutOfSequence ? outSeqJust : null,
    session_completion_pct: null,
    mark_as_done: false,
    ...standardFields,
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const locked = await lockConveyorAndStepForUpdate(client, input.conveyorId, input.conveyorNodeId)
    const lockedStatus: ConveyorNodeStepOperationalStatusDb =
      locked.step.operational_status ?? 'PENDING'
    if (lockedStatus === 'COMPLETED') {
      throw new AppError(
        'Esta atividade já está concluída operacionalmente; não é possível novo apontamento.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (isStepAbortedStatus(lockedStatus)) {
      throw new AppError(
        'Esta atividade foi dispensada; não é possível novo apontamento.',
        409,
        ErrorCodes.CONFLICT,
      )
    }
    try {
      await insertConveyorTimeEntry(client, row)
      if (seq.isOutOfSequence) {
        await serviceCreateConveyorOperationalEvent(client, {
          conveyorId: input.conveyorId,
          nodeId: input.conveyorNodeId,
          eventType: 'CONVEYOR_STEP_OUT_OF_SEQUENCE_TIME_ENTRY',
          previousValue: null,
          newValue: 'OUT_OF_SEQUENCE_TIME_ENTRY',
          reason: 'TIME_ENTRY_OUT_OF_SEQUENCE',
          source: 'USER_ACTION',
          occurredAt: new Date().toISOString(),
          createdBy: input.actorAppUserId,
          metadataJson: {
            activityNodeId: input.conveyorNodeId,
            timeEntryId: row.id,
            justification: outSeqJust,
            trigger: 'TIME_ENTRY_ON_BEHALF',
          },
          idempotencyKey: `oos_te_ob:${row.id}`,
        })
      }
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
