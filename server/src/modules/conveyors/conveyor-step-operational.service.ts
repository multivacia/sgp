import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { serviceCreateConveyorOperationalEvent } from './operational-events/conveyor-operational-events.service.js'
import { getStepCompletionFacts } from './operational-events/conveyor-operational-events.repository.js'
import {
  findConveyorById,
  listConveyorNodesByConveyorId,
  updateConveyorNodeStepOperationalFields,
} from './conveyors.repository.js'
import { canTransitionStepStatus, type ConveyorNodeStepOperationalStatusDb } from './stepOperationalStatus.js'
import type { ConveyorDetailApi } from './conveyors.dto.js'
import { loadConveyorStructureWithAssignees, mapDetailRowToApi } from './conveyors.service.js'
import { serviceAnalyzeConveyorActivitySequence } from './conveyorActivitySequence.service.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'

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

  const seq = await serviceAnalyzeConveyorActivitySequence(
    pool,
    input.conveyorId,
    input.stepNodeId,
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

  const facts = await getStepCompletionFacts(pool, input.conveyorId, input.stepNodeId)
  const noteSafe = trimNote(input.note)
  /** Inclui instante da conclusão para permitir múltiplos ciclos concluir → reabrir → concluir sem colidir com chaves antigas. */
  const idempotencyKey = `conveyor_step_completed:${input.conveyorId}:${input.stepNodeId}:${occurredIso}`

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const updated = await updateConveyorNodeStepOperationalFields(client, input.conveyorId, input.stepNodeId, {
      operational_status: 'COMPLETED',
      operational_completed_at: occurredIso,
      operational_completed_by: input.actorAppUserId,
    })
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
        trigger: 'COMPLETE',
      },
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
      previousValue: current,
      newValue: 'REOPENED',
      reason: 'EXPLICITLY_REOPENED',
      source: 'USER_ACTION',
      occurredAt: occurredIso,
      createdBy: input.actorAppUserId,
      idempotencyKey,
      metadataJson: {
        note: noteSafe,
        previousOperationalStatus: current,
        newOperationalStatus: 'REOPENED',
        previousCompletedAt: previousCompletedAtIso,
        previousCompletedBy: stepRow.operational_completed_by ?? null,
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
