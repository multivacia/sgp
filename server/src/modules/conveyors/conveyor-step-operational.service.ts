import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { serviceCreateConveyorOperationalEvent } from './operational-events/conveyor-operational-events.service.js'
import { getStepCompletionFacts } from './operational-events/conveyor-operational-events.repository.js'
import {
  findConveyorById,
  listConveyorNodesByConveyorId,
  updateConveyorNodeStepOperationalFields,
} from './conveyors.repository.js'
import { canTransitionStepStatus, isStepAbortedStatus, type ConveyorNodeStepOperationalStatusDb } from './stepOperationalStatus.js'
import type { ConveyorDetailApi } from './conveyors.dto.js'
import { loadConveyorStructureWithAssignees, mapDetailRowToApi } from './conveyors.service.js'
import {
  serviceAnalyzeConveyorActivitySequence,
  type ConveyorActivitySequenceAnalysis,
} from './conveyorActivitySequence.service.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type { PoolOrClient } from './conveyorAssignments.repository.js'
import { findAssigneeIdForStepAndCollaborator } from './conveyorAssignments.repository.js'
import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js'
import { appUserHasPermission } from '../permissions/permissions.repository.js'
import { canConveyorAcceptTimeEntry } from './conveyorOperationalStatus.js'
import {
  resolveTimeEntryJustification,
  TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
} from '../../shared/timeEntryJustificationResolver.js'
import { lockConveyorAndStepForUpdate } from './lockConveyorAndStepForUpdate.js'

const NOTE_MAX = 2000

function trimNote(note?: string | null): string | null {
  const t = note?.trim()
  if (!t) return null
  return t.slice(0, NOTE_MAX)
}

function pendingAfterReopen(planned: number | null | undefined, realized: number): number {
  const p = planned == null || Number.isNaN(planned) ? 0 : Math.max(0, planned)
  const r = Math.max(0, realized)
  return Math.max(0, p - r)
}

export type ConveyorStepCompletionAction = 'COMPLETE' | 'REOPEN'

export type CompleteConveyorStepOnClientInput = {
  conveyorId: string
  stepNodeId: string
  /** app_users.id quando disponível; null no modo produção sem vínculo. */
  actorAppUserId: string | null
  productionCollaboratorId?: string | null
  note?: string | null
  outOfSequenceJustification?: string | null
  trigger?: 'COMPLETE' | 'PRODUCTION_MARK_AS_DONE'
  /** Análise prévia (evita releitura dentro da transação). */
  sequence?: ConveyorActivitySequenceAnalysis
  currentStatus?: ConveyorNodeStepOperationalStatusDb
}

/**
 * Conclusão explícita de STEP dentro de transação já aberta.
 * Reutilizado pelo PATCH admin e pelo fluxo production (markAsDone).
 */
export async function completeConveyorStepOnClient(
  client: PoolOrClient,
  input: CompleteConveyorStepOnClientInput,
): Promise<{ idempotent: boolean; occurredIso: string | null }> {
  const current: ConveyorNodeStepOperationalStatusDb =
    input.currentStatus ?? 'PENDING'

  if (current === 'COMPLETED') {
    return { idempotent: true, occurredIso: null }
  }

  if (!canTransitionStepStatus(current, 'COMPLETED')) {
    throw new AppError(
      `Transição de estado da etapa não permitida (${current} → COMPLETED).`,
      422,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  const seq = input.sequence
  if (!seq?.targetFound) {
    throw new AppError(
      'Esta atividade não está incluída na sequência operacional recomendada.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  let outOfSeqJustificationStored: string | null = null
  if (seq.isOutOfSequence) {
    const j = (input.outOfSequenceJustification ?? '').trim()
    if (!j.length) {
      throw new AppError(
        'Informe uma justificativa para executar esta atividade fora da sequência recomendada.',
        422,
        ErrorCodes.STEP_COMPLETION_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      )
    }
    outOfSeqJustificationStored = j
  }

  const occurredAt = new Date()
  const occurredIso = occurredAt.toISOString()
  const facts = await getStepCompletionFacts(client, input.conveyorId, input.stepNodeId)
  const noteSafe = trimNote(input.note)
  const idempotencyKey = `conveyor_step_completed:${input.conveyorId}:${input.stepNodeId}:${occurredIso}`

  const updated = await updateConveyorNodeStepOperationalFields(
    client,
    input.conveyorId,
    input.stepNodeId,
    {
      operational_status: 'COMPLETED',
      operational_completed_at: occurredIso,
      operational_completed_by: input.actorAppUserId,
    },
  )
  if (!updated) {
    throw new AppError('Não foi possível atualizar a etapa.', 500, ErrorCodes.INTERNAL)
  }

  await serviceCreateConveyorOperationalEvent(client, {
    conveyorId: input.conveyorId,
    nodeId: input.stepNodeId,
    eventType: 'CONVEYOR_STEP_COMPLETED',
    previousValue: current,
    newValue: 'COMPLETED',
    reason: 'EXPLICITLY_COMPLETED',
    source: 'USER_ACTION',
    occurredAt: occurredIso,
    createdBy: input.actorAppUserId,
    idempotencyKey,
    metadataJson: {
      stepNodeId: input.stepNodeId,
      plannedMinutes: facts?.plannedMinutes ?? null,
      realizedMinutes: facts?.realizedMinutes ?? null,
      reason: 'EXPLICITLY_COMPLETED',
      note: noteSafe,
      idempotencyKey,
      activityNodeId: input.stepNodeId,
      outOfSequence: seq.isOutOfSequence,
      outOfSequenceJustification: outOfSeqJustificationStored,
      previousOpenCount: seq.previousOpenCount,
      previousOpenActivityIds: seq.previousOpenActivities.map((a) => a.activityNodeId),
      trigger: input.trigger ?? 'COMPLETE',
      productionCollaboratorId: input.productionCollaboratorId ?? null,
      accessChannel:
        input.trigger === 'PRODUCTION_MARK_AS_DONE' ? 'PRODUCTION_AVATAR_PIN' : undefined,
    },
  })

  return { idempotent: false, occurredIso }
}

async function assertCanPatchStepCompletion(
  pool: pg.Pool,
  input: {
    actorAppUserId: string
    action: ConveyorStepCompletionAction
    conveyorId: string
    stepNodeId: string
  },
  conveyor: NonNullable<Awaited<ReturnType<typeof findConveyorById>>>,
): Promise<void> {
  if (input.action === 'REOPEN') {
    const allowed = await appUserHasPermission(pool, input.actorAppUserId, 'conveyors.create')
    if (!allowed) {
      throw new AppError('Sem permissão para reabrir esta atividade.', 403, ErrorCodes.FORBIDDEN)
    }
    return
  }

  const isGestor = await appUserHasPermission(pool, input.actorAppUserId, 'conveyors.create')
  if (isGestor) return

  const collaboratorId = await findCollaboratorIdByAppUserId(pool, input.actorAppUserId)
  if (!collaboratorId) {
    throw new AppError(
      'Conta sem colaborador operacional vinculado. Contacte o administrador.',
      403,
      ErrorCodes.FORBIDDEN,
    )
  }

  if (!canConveyorAcceptTimeEntry(conveyor.operational_status)) {
    throw new AppError(
      'Esta esteira não está liberada para conclusão operacional de atividades.',
      422,
      ErrorCodes.CONVEYOR_TIME_ENTRY_STATUS_NOT_ALLOWED,
    )
  }

  const assigneeId = await findAssigneeIdForStepAndCollaborator(
    pool,
    input.conveyorId,
    input.stepNodeId,
    collaboratorId,
  )
  if (!assigneeId) {
    throw new AppError(
      'Para concluir esta atividade, informe uma justificativa ao registrar o apontamento.',
      403,
      ErrorCodes.FORBIDDEN,
    )
  }
}

/** Exportado para testes e PATCH de conclusão / reabertura explícita de STEP. */
export async function servicePatchConveyorStepCompletion(
  pool: pg.Pool,
  input: {
    conveyorId: string
    stepNodeId: string
    actorAppUserId: string
    action: ConveyorStepCompletionAction
    note?: string | null
    /** Obrigatória em COMPLETE quando a atividade está fora da sequência recomendada. */
    outOfSequenceJustification?: string
    justificationId?: string
    justificationComplement?: string
  },
): Promise<{ detail: ConveyorDetailApi; idempotent: boolean }> {
  const conveyor = await findConveyorById(pool, input.conveyorId)
  if (!conveyor) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }

  const nodes = await listConveyorNodesByConveyorId(pool, input.conveyorId)
  const stepRow = nodes.find((n) => n.id === input.stepNodeId)
  if (!stepRow) {
    throw new AppError('Etapa não encontrada nesta esteira.', 404, ErrorCodes.NOT_FOUND)
  }
  if (stepRow.node_type !== 'STEP') {
    throw new AppError('Apenas etapas (STEP) podem ser concluídas explicitamente.', 422, ErrorCodes.VALIDATION_ERROR)
  }

  await assertCanPatchStepCompletion(pool, input, conveyor)

  const current: ConveyorNodeStepOperationalStatusDb =
    stepRow.operational_status ?? 'PENDING'

  if (input.action === 'COMPLETE') {
    return serviceCompleteStep(pool, input, conveyor, current, nodes)
  }
  return serviceReopenStep(pool, input, current, stepRow)
}

async function serviceCompleteStep(
  pool: pg.Pool,
  input: {
    conveyorId: string
    stepNodeId: string
    actorAppUserId: string
    note?: string | null
    outOfSequenceJustification?: string
    justificationId?: string
    justificationComplement?: string
  },
  conveyor: NonNullable<Awaited<ReturnType<typeof findConveyorById>>>,
  current: ConveyorNodeStepOperationalStatusDb,
  nodes: Awaited<ReturnType<typeof listConveyorNodesByConveyorId>>,
): Promise<{ detail: ConveyorDetailApi; idempotent: boolean }> {
  if (current === 'COMPLETED') {
    const structure = await loadConveyorStructureWithAssignees(pool, input.conveyorId, nodes)
    return { detail: mapDetailRowToApi(conveyor, structure), idempotent: true }
  }

  if (!canTransitionStepStatus(current, 'COMPLETED')) {
    throw new AppError(
      `Transição de estado da etapa não permitida (${current} → COMPLETED).`,
      422,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  const isGestor = await appUserHasPermission(pool, input.actorAppUserId, 'conveyors.create')
  const actorCollaboratorId = isGestor
    ? undefined
    : (await findCollaboratorIdByAppUserId(pool, input.actorAppUserId)) ?? undefined

  const seq = await serviceAnalyzeConveyorActivitySequence(
    pool,
    input.conveyorId,
    input.stepNodeId,
    actorCollaboratorId,
  )
  if (!seq.targetFound) {
    throw new AppError(
      'Esta atividade não está incluída na sequência operacional recomendada.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  let outOfSeqJustificationStored: string | null = null
  if (seq.isOutOfSequence) {
    const resolved = await resolveTimeEntryJustification(pool, {
      required: true,
      justificationId: input.justificationId,
      justificationComplement: input.justificationComplement,
      legacyText: input.outOfSequenceJustification,
      requiredErrorCode: ErrorCodes.STEP_COMPLETION_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      requiredErrorMessage: TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
    })
    outOfSeqJustificationStored = resolved.legacyText
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const locked = await lockConveyorAndStepForUpdate(client, input.conveyorId, input.stepNodeId)
    const lockedStatus: ConveyorNodeStepOperationalStatusDb =
      locked.step.operational_status ?? 'PENDING'
    if (lockedStatus === 'COMPLETED') {
      await client.query('COMMIT')
      const structure = await loadConveyorStructureWithAssignees(pool, input.conveyorId, nodes)
      return { detail: mapDetailRowToApi(conveyor, structure), idempotent: true }
    }
    if (isStepAbortedStatus(lockedStatus) || !canTransitionStepStatus(lockedStatus, 'COMPLETED')) {
      throw new AppError(
        `Transição de estado da etapa não permitida (${lockedStatus} → COMPLETED).`,
        422,
        ErrorCodes.INVALID_STATUS_TRANSITION,
      )
    }
    await completeConveyorStepOnClient(client, {
      conveyorId: input.conveyorId,
      stepNodeId: input.stepNodeId,
      actorAppUserId: input.actorAppUserId,
      note: input.note,
      outOfSequenceJustification: outOfSeqJustificationStored,
      trigger: 'COMPLETE',
      sequence: seq,
      currentStatus: lockedStatus,
    })
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const rowAfter = await findConveyorById(pool, input.conveyorId)
  if (!rowAfter) {
    throw new AppError('Esteira não encontrada após conclusão da etapa.', 500, ErrorCodes.INTERNAL)
  }
  const nodesAfter = await listConveyorNodesByConveyorId(pool, input.conveyorId)
  const structureAfter = await loadConveyorStructureWithAssignees(pool, input.conveyorId, nodesAfter)
  return { detail: mapDetailRowToApi(rowAfter, structureAfter), idempotent: false }
}

async function serviceReopenStep(
  pool: pg.Pool,
  input: {
    conveyorId: string
    stepNodeId: string
    actorAppUserId: string
    note?: string | null
  },
  current: ConveyorNodeStepOperationalStatusDb,
  stepRow: Awaited<ReturnType<typeof listConveyorNodesByConveyorId>>[number],
): Promise<{ detail: ConveyorDetailApi; idempotent: boolean }> {
  if (current !== 'COMPLETED') {
    throw new AppError(
      'A etapa só pode ser reaberta quando estiver concluída.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  if (!canTransitionStepStatus(current, 'REOPENED')) {
    throw new AppError(
      `Transição de estado da etapa não permitida (${current} → REOPENED).`,
      422,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  const previousCompletedAtIso = stepRow.operational_completed_at
  const reopenKeySuffix = previousCompletedAtIso ?? 'none'
  const idempotencyKey = `conveyor_step_reopened:${input.conveyorId}:${input.stepNodeId}:${reopenKeySuffix}`

  const occurredAt = new Date()
  const occurredIso = occurredAt.toISOString()
  const facts = await getStepCompletionFacts(pool, input.conveyorId, input.stepNodeId)
  const planned = facts?.plannedMinutes ?? null
  const realized = facts?.realizedMinutes ?? 0
  const pendingMinutesAfterReopen = pendingAfterReopen(planned, realized)
  const noteSafe = trimNote(input.note)

  const client = await pool.connect()
  let eventCreated = true
  try {
    await client.query('BEGIN')
    const locked = await lockConveyorAndStepForUpdate(client, input.conveyorId, input.stepNodeId)
    const lockedStatus: ConveyorNodeStepOperationalStatusDb =
      locked.step.operational_status ?? 'PENDING'
    if (lockedStatus !== 'COMPLETED') {
      throw new AppError(
        'A etapa só pode ser reaberta quando estiver concluída.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (!canTransitionStepStatus(lockedStatus, 'REOPENED')) {
      throw new AppError(
        `Transição de estado da etapa não permitida (${lockedStatus} → REOPENED).`,
        422,
        ErrorCodes.INVALID_STATUS_TRANSITION,
      )
    }
    const updated = await updateConveyorNodeStepOperationalFields(client, input.conveyorId, input.stepNodeId, {
      operational_status: 'REOPENED',
      operational_completed_at: null,
      operational_completed_by: null,
    })
    if (!updated) {
      throw new AppError('Não foi possível atualizar a etapa.', 500, ErrorCodes.INTERNAL)
    }
    const ev = await serviceCreateConveyorOperationalEvent(client, {
      conveyorId: input.conveyorId,
      nodeId: input.stepNodeId,
      eventType: 'CONVEYOR_STEP_REOPENED',
      previousValue: lockedStatus,
      newValue: 'REOPENED',
      reason: 'EXPLICITLY_REOPENED',
      source: 'USER_ACTION',
      occurredAt: occurredIso,
      createdBy: input.actorAppUserId,
      idempotencyKey,
      metadataJson: {
        note: noteSafe,
        previousOperationalStatus: lockedStatus,
        newOperationalStatus: 'REOPENED',
        previousCompletedAt: locked.step.operational_completed_at ?? previousCompletedAtIso,
        previousCompletedBy: locked.step.operational_completed_by ?? stepRow.operational_completed_by ?? null,
        plannedMinutes: planned,
        realizedMinutes: realized,
        pendingMinutesAfterReopen,
        idempotencyKey,
      },
    })
    eventCreated = ev.created
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const rowAfter = await findConveyorById(pool, input.conveyorId)
  if (!rowAfter) {
    throw new AppError('Esteira não encontrada após reabertura da etapa.', 500, ErrorCodes.INTERNAL)
  }
  const nodesAfter = await listConveyorNodesByConveyorId(pool, input.conveyorId)
  const structureAfter = await loadConveyorStructureWithAssignees(pool, input.conveyorId, nodesAfter)
  return { detail: mapDetailRowToApi(rowAfter, structureAfter), idempotent: !eventCreated }
}
