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
import {
  pickStandardJustificationSnapshot,
  resolveTimeEntryJustification,
  TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
  type ResolvedStandardJustification,
} from '../../shared/timeEntryJustificationResolver.js'
import { sumRealizedMinutesByStepForConveyor } from '../conveyors/conveyorNodeWorkload.repository.js'

export const TIME_ENTRY_EXCEEDED_PLANNED_JUSTIFICATION_MESSAGE =
  'Informe uma justificativa para apontar acima do tempo previsto da atividade.'

async function resolveProductionExcessCheckPlannedMinutes(
  pool: pg.Pool,
  input: {
    conveyorId: string
    stepNodeId: string
    collaboratorId: string
  },
): Promise<number | null> {
  const r = await pool.query<{ planned_minutes: number | null }>(
    `
    SELECT i.planned_minutes
    FROM operational_work_plan_items i
    INNER JOIN operational_work_plans p
      ON p.id = i.work_plan_id
      AND p.deleted_at IS NULL
      AND p.status = 'PUBLISHED'
    WHERE i.deleted_at IS NULL
      AND i.status = 'PLANNED'
      AND i.conveyor_id = $1::uuid
      AND i.activity_node_id = $2::uuid
      AND i.assigned_collaborator_id = $3::uuid
    ORDER BY i.planned_date DESC, i.planned_order ASC
    LIMIT 1
    `,
    [input.conveyorId, input.stepNodeId, input.collaboratorId],
  )
  const raw = r.rows[0]?.planned_minutes
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null
  return Math.floor(raw)
}

export function productionRequiresExcessTimeJustification(input: {
  plannedMinutes: number | null
  realizedMinutes: number
  minutesNovo: number
}): boolean {
  if (!Number.isInteger(input.minutesNovo) || input.minutesNovo <= 0) return false
  const planned = input.plannedMinutes
  if (planned == null || !Number.isFinite(planned) || planned <= 0) return false
  return input.realizedMinutes + input.minutesNovo > planned
}

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
  justificationId?: string | null
  justificationComplement?: string | null
}

/**
 * Cria apontamento de horas via Modo Produção.
 *
 * - collaboratorId vem da sessão production (não do body).
 * - Fora de sequência exige `outOfSequenceJustification` (3–500 chars).
 * - `markAsDone=true` conclui operacionalmente o STEP na mesma transação.
 * - Tempo ou sessionCompletionPct isolados nunca concluem o STEP.
 *
 * Fluxo completion-only (`minutes=0` + `markAsDone=true`):
 * - Representa conclusão sem novo tempo trabalhado (ex.: tempo já apontado antes).
 * - Não insere em `conveyor_time_entries`: a constraint atual
 *   `chk_conveyor_time_entries_minutes_positive` exige `minutes > 0`.
 * - A rastreabilidade fica em `conveyor_nodes` (status/timestamp de conclusão) e
 *   `conveyor_operational_events` (`CONVEYOR_STEP_COMPLETED`, com colaborador/canal no metadata).
 * - A resposta HTTP usa DTO sintético (id gerado, sem linha persistida em time entries).
 * - Uma migration futura poderia permitir evento de apontamento com `minutes=0`, se necessário.
 */
export async function serviceCreateProductionTimeEntry(
  pool: pg.Pool,
  input: CreateProductionTimeEntryInput,
): Promise<TimeEntryCreatedDto> {
  const markAsDoneEarly = input.markAsDone === true
  if (!Number.isInteger(input.minutes)) {
    throw new AppError(
      'minutes deve ser um número inteiro.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (input.minutes < 0) {
    throw new AppError(
      'minutes não pode ser negativo.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (input.minutes === 0 && !markAsDoneEarly) {
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
    input.collaboratorId,
  )
  if (seq.structuralSequenceIndex < 0) {
    throw new AppError(
      'Esta atividade não está incluída na sequência operacional da esteira.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const isOos = seq.isOutOfSequence
  let oosJustDb: string | null = null
  let oosStandard: ResolvedStandardJustification | null = null
  if (isOos) {
    const resolved = await resolveTimeEntryJustification(pool, {
      required: true,
      justificationId: input.justificationId,
      justificationComplement: input.justificationComplement,
      legacyText: input.outOfSequenceJustification,
      requiredErrorCode: ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      requiredErrorMessage: TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
    })
    oosJustDb = resolved.legacyText
    oosStandard = resolved.standard
    if (!oosJustDb || oosJustDb.length < 3) {
      throw new AppError(
        'A justificativa deve ter pelo menos 3 caracteres.',
        422,
        ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      )
    }
  }

  const markAsDone = input.markAsDone === true
  /** Conclusão kiosk sem novo tempo: ver JSDoc de `serviceCreateProductionTimeEntry`. */
  const isCompletionOnly = markAsDone && input.minutes === 0

  let excessStandard: ResolvedStandardJustification | null = null
  if (!isCompletionOnly && input.minutes > 0) {
    const plannedMinutes = await resolveProductionExcessCheckPlannedMinutes(pool, {
      conveyorId: input.conveyorId,
      stepNodeId: input.stepNodeId,
      collaboratorId: input.collaboratorId,
    })
    const realizedByStep = await sumRealizedMinutesByStepForConveyor(pool, input.conveyorId)
    const realizedMinutes = realizedByStep.get(input.stepNodeId) ?? 0
    const requiresExcessJustification = productionRequiresExcessTimeJustification({
      plannedMinutes,
      realizedMinutes,
      minutesNovo: input.minutes,
    })
    if (requiresExcessJustification && !oosStandard) {
      const resolved = await resolveTimeEntryJustification(pool, {
        required: true,
        justificationId: input.justificationId,
        justificationComplement: input.justificationComplement,
        legacyText: input.outOfSequenceJustification,
        requiredErrorCode: ErrorCodes.TIME_ENTRY_EXCEEDED_PLANNED_REQUIRES_JUSTIFICATION,
        requiredErrorMessage: TIME_ENTRY_EXCEEDED_PLANNED_JUSTIFICATION_MESSAGE,
      })
      excessStandard = resolved.standard
      if (!resolved.legacyText || resolved.legacyText.length < 3) {
        throw new AppError(
          'A justificativa deve ter pelo menos 3 caracteres.',
          422,
          ErrorCodes.TIME_ENTRY_EXCEEDED_PLANNED_REQUIRES_JUSTIFICATION,
        )
      }
    }
  }

  const standardFields = pickStandardJustificationSnapshot(null, oosStandard ?? excessStandard)

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
  const shouldAutoStart = conveyor.operational_status === 'A_INICIAR'
  const completionRefId = newAssignmentId()

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (!isCompletionOnly) {
      const row: InsertConveyorTimeEntryRow = {
        id: completionRefId,
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
        ...standardFields,
      }
      await insertConveyorTimeEntry(client, row)
    }

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
          timeEntryId: completionRefId,
          justification: oosJustDb,
          trigger: isCompletionOnly ? 'PRODUCTION_MARK_AS_DONE' : 'TIME_ENTRY',
          productionCollaboratorId: input.collaboratorId,
          accessChannel: 'PRODUCTION_AVATAR_PIN',
          markAsDone,
          completionOnly: isCompletionOnly,
        },
        idempotencyKey: `oos_te:${completionRefId}`,
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

  if (isCompletionOnly) {
    const now = new Date().toISOString()
    return {
      id: completionRefId,
      conveyorId: input.conveyorId,
      stepNodeId: input.stepNodeId,
      collaboratorId: input.collaboratorId,
      conveyorNodeAssigneeId: assigneeId,
      minutes: 0,
      executedQuantity: executedQuantityDb,
      notes: input.note ?? null,
      entryMode: 'manual',
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      isOutOfSequence: isOos,
      outOfSequenceJustification: isOos ? oosJustDb : null,
      entryAt: now,
      createdAt: now,
      isDelegated: false,
      recordedByAppUserId: actorAppUserId,
      recordedByUserEmail: null,
      delegationReason: null,
    }
  }

  const created = await findConveyorTimeEntryById(pool, completionRefId)
  if (!created) {
    throw new AppError('Apontamento não encontrado após criação.', 500, ErrorCodes.INTERNAL)
  }
  return timeEntryRowToCreated(created, null)
}
