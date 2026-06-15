import type pg from 'pg'
import { findAppUserIdByCollaboratorId } from '../auth/auth.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { normalizeExecutedQuantityInput } from '../../shared/activityOperationalQuantity.js'
import { serviceAnalyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.service.js'
import {
  assertNodeIsStepForConveyor,
  collaboratorActiveForOperations,
} from '../conveyors/conveyorAssignments.service.js'
import {
  findConveyorTimeEntryById,
  findStepOperationalStatusByNodeId,
  insertConveyorTimeEntry,
  newAssignmentId,
  type InsertConveyorTimeEntryRow,
} from '../conveyors/conveyorAssignments.repository.js'
import { timeEntryRowToCreated, type TimeEntryCreatedDto } from '../conveyors/conveyorAssignments.dto.js'
import { findConveyorById, updateConveyorOperationalStatus } from '../conveyors/conveyors.repository.js'
import {
  canConveyorAcceptTimeEntry,
  timeEntryBlockedMessage,
} from '../conveyors/conveyorOperationalStatus.js'
import { completeConveyorStepOnClient } from '../conveyors/conveyor-step-operational.service.js'
import type { ConveyorNodeStepOperationalStatusDb } from '../conveyors/stepOperationalStatus.js'
import { serviceCreateConveyorOperationalEvent } from '../conveyors/operational-events/conveyor-operational-events.service.js'
import { resolveProductionStepAssigneeId } from './production-plan-assignee.js'
import { assertProductionOutOfSequenceJustification } from './production-out-of-sequence.js'

export type CreateProductionTimeEntryInput = {
  collaboratorId: string
  conveyorId: string
  stepNodeId: string
  minutes: number
  executedQuantity?: number | null
  note?: string | null
  sessionCompletionPct?: number | null
  markAsDone?: boolean
  outOfSequenceJustification?: string | null
}

/**
 * Cria apontamento de horas via Modo Produção.
 *
 * - collaboratorId vem da sessão production (não do body).
 * - Fora de sequência exige `outOfSequenceJustification` (3–500 chars).
 * - `markAsDone=true` conclui operacionalmente o STEP na mesma transação.
 * - Tempo ou sessionCompletionPct isolados nunca concluem o STEP.
 */
export async function serviceCreateProductionTimeEntry(
  pool: pg.Pool,
  input: CreateProductionTimeEntryInput,
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

  const collaboratorOk = await collaboratorActiveForOperations(pool, input.collaboratorId)
  if (!collaboratorOk) {
    throw new AppError(
      'Colaborador inexistente, inativo ou indisponível.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  await assertNodeIsStepForConveyor(pool, input.conveyorId, input.stepNodeId)

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

  const stepOpRaw = await findStepOperationalStatusByNodeId(pool, input.stepNodeId)
  const currentStatus = ((stepOpRaw ?? 'PENDING').trim() || 'PENDING') as ConveyorNodeStepOperationalStatusDb
  if (currentStatus === 'COMPLETED') {
    throw new AppError(
      'Esta atividade já está concluída operacionalmente; não é possível novo apontamento.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const seq = await serviceAnalyzeConveyorActivitySequence(
    pool,
    input.conveyorId,
    input.stepNodeId,
  )
  if (!seq.targetFound) {
    throw new AppError(
      'Esta atividade não está incluída na sequência operacional da esteira.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const isOos = seq.isOutOfSequence
  let oosJustDb: string | null = null
  if (isOos) {
    oosJustDb = assertProductionOutOfSequenceJustification(input.outOfSequenceJustification)
  }

  const assigneeId = await resolveProductionStepAssigneeId(pool, {
    conveyorId: input.conveyorId,
    stepNodeId: input.stepNodeId,
    collaboratorId: input.collaboratorId,
  })
  if (!assigneeId) {
    throw new AppError(
      'Esta atividade não está no seu planejamento publicado ou não permite apontamento.',
      422,
      ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION,
    )
  }

  const actorAppUserId = await findAppUserIdByCollaboratorId(pool, input.collaboratorId)
  const markAsDone = input.markAsDone === true
  const shouldAutoStart = conveyor.operational_status === 'A_INICIAR'

  const row: InsertConveyorTimeEntryRow = {
    id: newAssignmentId(),
    conveyor_id: input.conveyorId,
    conveyor_node_id: input.stepNodeId,
    collaborator_id: input.collaboratorId,
    conveyor_node_assignee_id: assigneeId,
    entry_at: new Date(),
    minutes: input.minutes,
    executed_quantity: executedQuantityDb,
    notes: input.note ?? null,
    entry_mode: 'manual',
    metadata_json: { accessChannel: 'PRODUCTION_AVATAR_PIN' },
    entry_origin: 'ASSIGNED',
    exception_justification: null,
    is_out_of_sequence: isOos,
    out_of_sequence_justification: isOos ? oosJustDb : null,
    session_completion_pct:
      typeof input.sessionCompletionPct === 'number' ? input.sessionCompletionPct : null,
    mark_as_done: markAsDone,
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await insertConveyorTimeEntry(client, row)

    if (shouldAutoStart) {
      await updateConveyorOperationalStatus(
        client,
        input.conveyorId,
        'EM_ANDAMENTO',
        'keep',
      )
    }

    if (isOos) {
      await serviceCreateConveyorOperationalEvent(client, {
        conveyorId: input.conveyorId,
        nodeId: input.stepNodeId,
        eventType: 'CONVEYOR_STEP_OUT_OF_SEQUENCE_TIME_ENTRY',
        previousValue: null,
        newValue: 'OUT_OF_SEQUENCE_TIME_ENTRY',
        reason: 'TIME_ENTRY_OUT_OF_SEQUENCE',
        source: 'USER_ACTION',
        occurredAt: new Date().toISOString(),
        createdBy: actorAppUserId,
        metadataJson: {
          activityNodeId: input.stepNodeId,
          timeEntryId: row.id,
          justification: oosJustDb,
          trigger: 'TIME_ENTRY',
          productionCollaboratorId: input.collaboratorId,
          accessChannel: 'PRODUCTION_AVATAR_PIN',
          markAsDone,
        },
        idempotencyKey: `oos_te:${row.id}`,
      })
    }

    if (markAsDone) {
      await completeConveyorStepOnClient(client, {
        conveyorId: input.conveyorId,
        stepNodeId: input.stepNodeId,
        actorAppUserId,
        productionCollaboratorId: input.collaboratorId,
        outOfSequenceJustification: oosJustDb,
        trigger: 'PRODUCTION_MARK_AS_DONE',
        sequence: seq,
        currentStatus,
      })
    }

    await client.query('COMMIT')
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore */
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
