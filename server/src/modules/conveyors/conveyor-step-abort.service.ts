import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { appUserHasPermission } from '../permissions/permissions.repository.js'
import { findActiveStepAbortReasonByCode } from '../operational-settings/step-abort-reasons.repository.js'
import { serviceCreateConveyorOperationalEvent } from './operational-events/conveyor-operational-events.service.js'
import { getConveyorOperationalEventByIdempotencyKey } from './operational-events/conveyor-operational-events.repository.js'
import type { ConveyorOperationalEventRow } from './operational-events/conveyor-operational-events.types.js'
import {
  findConveyorById,
  listConveyorNodesByConveyorId,
  updateConveyorNodeStepAborted,
  updateConveyorNodeStepRestoreAborted,
} from './conveyors.repository.js'
import { loadConveyorStructureWithAssignees, mapDetailRowToApi } from './conveyors.service.js'
import type { ConveyorDetailApi } from './conveyors.dto.js'
import { lockConveyorAndStepForUpdate } from './lockConveyorAndStepForUpdate.js'
import {
  canTransitionStepStatus,
  STEP_ABORT_ALLOWED_ORIGINS,
  type ConveyorNodeStepOperationalStatusDb,
} from './stepOperationalStatus.js'
import {
  resolveStepAbortReason,
  type ResolvedStepAbortReason,
} from './stepAbortReasons.js'

const IDEMPOTENCY_KEY_MAX = 180

export function parseIdempotencyKeyHeader(raw: string | undefined | null): string {
  const key = raw?.trim() ?? ''
  if (!key.length || key.length > IDEMPOTENCY_KEY_MAX) {
    throw new AppError(
      'Header Idempotency-Key é obrigatório (1–180 caracteres).',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return key
}

async function assertCanAbortOrRestore(pool: pg.Pool, actorAppUserId: string): Promise<void> {
  const allowed = await appUserHasPermission(pool, actorAppUserId, 'conveyors.create')
  if (!allowed) {
    throw new AppError(
      'Sem permissão para dispensar ou restaurar esta atividade.',
      403,
      ErrorCodes.FORBIDDEN,
    )
  }
}

function assertConveyorAllowsAbort(status: string): void {
  if (status === 'FINALIZADA' || status === 'CANCELADA') {
    throw new AppError(
      'Não é possível dispensar atividades em esteira finalizada ou cancelada.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
}

function cancellationReasonForAbort(reason: ResolvedStepAbortReason): string {
  if (reason.reasonText) {
    return `STEP_ABORTED:${reason.reasonCode}:${reason.reasonText}`
  }
  return `STEP_ABORTED:${reason.reasonCode}`
}

/**
 * Cancela itens de plano da esteira e do planejamento semanal vinculados ao STEP.
 * Adquire locks dos itens por id ASC (após lock esteira+STEP).
 */
async function cancelLinkedPlanItemsForAbortedStep(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    stepNodeId: string
    cancellationReason: string
  },
): Promise<{
  conveyorPlanItemIds: string[]
  workPlanItemIds: string[]
}> {
  const planItems = await client.query<{ id: string }>(
    `SELECT id::text
       FROM conveyor_operational_plan_items
      WHERE conveyor_id = $1::uuid
        AND activity_node_id = $2::uuid
        AND deleted_at IS NULL
        AND status <> 'CANCELLED'
      ORDER BY id ASC
      FOR UPDATE`,
    [input.conveyorId, input.stepNodeId],
  )
  const conveyorPlanItemIds = planItems.rows.map((r) => r.id)
  if (conveyorPlanItemIds.length) {
    await client.query(
      `UPDATE conveyor_operational_plan_items
          SET status = 'CANCELLED',
              cancellation_reason = $2::text,
              updated_at = now()
        WHERE id = ANY($1::uuid[])
          AND deleted_at IS NULL
          AND status <> 'CANCELLED'`,
      [conveyorPlanItemIds, input.cancellationReason],
    )
  }

  const workItems = await client.query<{ id: string }>(
    `SELECT id::text
       FROM operational_work_plan_items
      WHERE conveyor_id = $1::uuid
        AND activity_node_id = $2::uuid
        AND deleted_at IS NULL
        AND status <> 'CANCELLED'
      ORDER BY id ASC
      FOR UPDATE`,
    [input.conveyorId, input.stepNodeId],
  )
  const workPlanItemIds = workItems.rows.map((r) => r.id)
  if (workPlanItemIds.length) {
    await client.query(
      `UPDATE operational_work_plan_items
          SET status = 'CANCELLED',
              updated_at = now()
        WHERE id = ANY($1::uuid[])
          AND deleted_at IS NULL
          AND status <> 'CANCELLED'`,
      [workPlanItemIds],
    )
  }

  return { conveyorPlanItemIds, workPlanItemIds }
}

export type StepAbortIdempotencyEventType = 'CONVEYOR_STEP_ABORTED' | 'CONVEYOR_STEP_RESTORED'

export type StepAbortIdempotencyInput = {
  idempotencyKey: string
  expectedEventType: StepAbortIdempotencyEventType
  conveyorId: string
  stepNodeId: string
  currentStatus: ConveyorNodeStepOperationalStatusDb
  expectedStatusAfterOperation: ConveyorNodeStepOperationalStatusDb
}

function eventMatchesOperation(
  event: Pick<ConveyorOperationalEventRow, 'event_type' | 'conveyor_id' | 'node_id'>,
  expected: {
    expectedEventType: StepAbortIdempotencyEventType
    conveyorId: string
    stepNodeId: string
  },
): boolean {
  return (
    event.event_type === expected.expectedEventType &&
    event.conveyor_id === expected.conveyorId &&
    event.node_id === expected.stepNodeId
  )
}

/**
 * Decide replay idempotente ANTES de qualquer mutação.
 *
 * A `idempotency_key` tem índice único global em `conveyor_operational_events`,
 * logo uma chave já usada por outro tipo/esteira/nó nunca pode ser tratada como
 * replay: a operação atual não conseguiria gravar o evento e mutaria o STEP sem auditoria.
 *
 * Deve ser chamado sob lock (`lockConveyorAndStepForUpdate`) e antes de mutar.
 */
export async function resolveStepAbortIdempotencyReplay(
  queryable: pg.PoolClient,
  input: StepAbortIdempotencyInput,
): Promise<{ replay: boolean }> {
  const existing = await getConveyorOperationalEventByIdempotencyKey(
    queryable,
    input.idempotencyKey,
  )
  if (!existing) return { replay: false }

  if (!eventMatchesOperation(existing, input)) {
    throw new AppError(
      'Idempotency-Key já utilizada em outra operação.',
      409,
      ErrorCodes.CONFLICT,
    )
  }

  if (input.currentStatus === input.expectedStatusAfterOperation) {
    return { replay: true }
  }

  console.warn(
    JSON.stringify({
      event: 'conveyor_step_abort_idempotency_state_mismatch',
      expectedEventType: input.expectedEventType,
      conveyorId: input.conveyorId,
      stepNodeId: input.stepNodeId,
      existingEventId: existing.id,
      currentStatus: input.currentStatus,
      expectedStatusAfterOperation: input.expectedStatusAfterOperation,
    }),
  )
  throw new AppError(
    'Idempotency-Key já utilizada em outra operação.',
    409,
    ErrorCodes.CONFLICT,
  )
}

/**
 * Defesa adicional: evento devolvido com `created: false` tem de ser exatamente
 * o evento desta operação. Caso contrário a TX deve abortar (ROLLBACK).
 *
 * É conflito de idempotência (409), não falha interna: o diagnóstico fica no log
 * técnico e a mensagem HTTP permanece genérica.
 */
function assertReusedEventMatchesOperation(
  event: ConveyorOperationalEventRow,
  expected: {
    expectedEventType: StepAbortIdempotencyEventType
    conveyorId: string
    stepNodeId: string
  },
): void {
  if (eventMatchesOperation(event, expected)) return

  console.warn(
    JSON.stringify({
      event: 'conveyor_step_abort_reused_event_mismatch',
      expectedEventType: expected.expectedEventType,
      conveyorId: expected.conveyorId,
      stepNodeId: expected.stepNodeId,
      reusedEventId: event.id,
      reusedEventType: event.event_type,
      reusedConveyorId: event.conveyor_id,
      reusedNodeId: event.node_id,
    }),
  )
  throw new AppError(
    'Idempotency-Key já utilizada em outra operação.',
    409,
    ErrorCodes.CONFLICT,
  )
}

async function loadDetail(
  pool: pg.Pool,
  conveyorId: string,
): Promise<ConveyorDetailApi> {
  const rowAfter = await findConveyorById(pool, conveyorId)
  if (!rowAfter) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  const nodesAfter = await listConveyorNodesByConveyorId(pool, conveyorId)
  const structureAfter = await loadConveyorStructureWithAssignees(pool, conveyorId, nodesAfter)
  return mapDetailRowToApi(rowAfter, structureAfter)
}

export async function serviceAbortConveyorStep(
  pool: pg.Pool,
  input: {
    conveyorId: string
    stepNodeId: string
    actorAppUserId: string
    idempotencyKey: string
    reasonCode: string
    reasonText?: string | null
  },
): Promise<{ detail: ConveyorDetailApi; idempotent: boolean }> {
  await assertCanAbortOrRestore(pool, input.actorAppUserId)

  const client = await pool.connect()
  let idempotent = false
  try {
    await client.query('BEGIN')
    const { conveyor, step } = await lockConveyorAndStepForUpdate(
      client,
      input.conveyorId,
      input.stepNodeId,
    )

    const current: ConveyorNodeStepOperationalStatusDb = step.operational_status ?? 'PENDING'

    // Replay comprovado é resolvido antes do estado da esteira e antes da validação
    // do catálogo: se a operação já foi aplicada, desativar o motivo depois não pode
    // transformar a repetição idempotente em erro.
    const idempotency = await resolveStepAbortIdempotencyReplay(client, {
      idempotencyKey: input.idempotencyKey,
      expectedEventType: 'CONVEYOR_STEP_ABORTED',
      conveyorId: input.conveyorId,
      stepNodeId: input.stepNodeId,
      currentStatus: current,
      expectedStatusAfterOperation: 'ABORTED',
    })

    if (idempotency.replay) {
      idempotent = true
      await client.query('COMMIT')
    } else {
      assertConveyorAllowsAbort(conveyor.operational_status)

      if (current === 'ABORTED') {
        throw new AppError(
          'Esta atividade já está dispensada.',
          409,
          ErrorCodes.CONFLICT,
        )
      }

      if (!canTransitionStepStatus(current, 'ABORTED')) {
        throw new AppError(
          `Transição de estado da etapa não permitida (${current} → ABORTED).`,
          409,
          ErrorCodes.CONFLICT,
        )
      }

      const catalog = await findActiveStepAbortReasonByCode(client, input.reasonCode.trim())
      const reasonResolved = resolveStepAbortReason({
        reasonCode: input.reasonCode,
        reasonText: input.reasonText,
        catalog,
        requireActive: true,
      })
      if (!reasonResolved.ok) {
        throw new AppError(reasonResolved.message, 400, ErrorCodes.VALIDATION_ERROR)
      }
      const reason = reasonResolved.value

      const occurredIso = new Date().toISOString()
      const updated = await updateConveyorNodeStepAborted(
        client,
        input.conveyorId,
        input.stepNodeId,
        {
          aborted_at: occurredIso,
          aborted_by: input.actorAppUserId,
          abort_reason_code: reason.reasonCode,
          abort_reason_text: reason.reasonText,
          abort_reason_label_snapshot: reason.reasonLabel,
          expectedStatuses: STEP_ABORT_ALLOWED_ORIGINS,
        },
      )
      if (!updated) {
        throw new AppError(
          'Conflito ao dispensar a atividade (estado alterado concorrentemente).',
          409,
          ErrorCodes.CONFLICT,
        )
      }

      const cancelled = await cancelLinkedPlanItemsForAbortedStep(client, {
        conveyorId: input.conveyorId,
        stepNodeId: input.stepNodeId,
        cancellationReason: cancellationReasonForAbort(reason),
      })

      const ev = await serviceCreateConveyorOperationalEvent(client, {
        conveyorId: input.conveyorId,
        nodeId: input.stepNodeId,
        eventType: 'CONVEYOR_STEP_ABORTED',
        previousValue: current,
        newValue: 'ABORTED',
        reason: reason.reasonCode,
        source: 'USER_ACTION',
        occurredAt: occurredIso,
        createdBy: input.actorAppUserId,
        idempotencyKey: input.idempotencyKey,
        metadataJson: {
          stepNodeId: input.stepNodeId,
          reasonCode: reason.reasonCode,
          reasonText: reason.reasonText,
          reasonLabel: reason.reasonLabel,
          reasonLabelSnapshot: reason.reasonLabel,
          previousOperationalStatus: current,
          conveyorPlanItemIdsCancelled: cancelled.conveyorPlanItemIds,
          workPlanItemIdsCancelled: cancelled.workPlanItemIds,
          idempotencyKey: input.idempotencyKey,
        },
      })
      if (!ev.created) {
        assertReusedEventMatchesOperation(ev.event, {
          expectedEventType: 'CONVEYOR_STEP_ABORTED',
          conveyorId: input.conveyorId,
          stepNodeId: input.stepNodeId,
        })
      }
      idempotent = !ev.created

      await client.query('COMMIT')
    }
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw e
  } finally {
    client.release()
  }

  // Só após `client.release()`: `loadDetail` pede outra conexão ao pool.
  const detail = await loadDetail(pool, input.conveyorId)
  return { detail, idempotent }
}

export async function serviceRestoreAbortedConveyorStep(
  pool: pg.Pool,
  input: {
    conveyorId: string
    stepNodeId: string
    actorAppUserId: string
    idempotencyKey: string
  },
): Promise<{ detail: ConveyorDetailApi; idempotent: boolean }> {
  await assertCanAbortOrRestore(pool, input.actorAppUserId)

  const client = await pool.connect()
  let idempotent = false
  try {
    await client.query('BEGIN')
    const { conveyor, step } = await lockConveyorAndStepForUpdate(
      client,
      input.conveyorId,
      input.stepNodeId,
    )

    const current: ConveyorNodeStepOperationalStatusDb = step.operational_status ?? 'PENDING'

    // Ver `serviceAbortConveyorStep`: replay comprovado precede o estado da esteira.
    const idempotency = await resolveStepAbortIdempotencyReplay(client, {
      idempotencyKey: input.idempotencyKey,
      expectedEventType: 'CONVEYOR_STEP_RESTORED',
      conveyorId: input.conveyorId,
      stepNodeId: input.stepNodeId,
      currentStatus: current,
      expectedStatusAfterOperation: 'REOPENED',
    })

    if (idempotency.replay) {
      idempotent = true
      await client.query('COMMIT')
    } else {
      if (
        conveyor.operational_status === 'FINALIZADA' ||
        conveyor.operational_status === 'CANCELADA'
      ) {
        throw new AppError(
          'Não é possível restaurar atividades em esteira finalizada ou cancelada.',
          409,
          ErrorCodes.CONFLICT,
        )
      }

      if (current !== 'ABORTED') {
        throw new AppError(
          'A atividade só pode ser restaurada quando estiver dispensada.',
          409,
          ErrorCodes.CONFLICT,
        )
      }

      if (!canTransitionStepStatus(current, 'REOPENED')) {
        throw new AppError(
          `Transição de estado da etapa não permitida (${current} → REOPENED).`,
          409,
          ErrorCodes.CONFLICT,
        )
      }

      const previousAbort = {
        abortedAt: step.aborted_at,
        abortedBy: step.aborted_by,
        abortReasonCode: step.abort_reason_code,
        abortReasonText: step.abort_reason_text,
        abortReasonLabelSnapshot: step.abort_reason_label_snapshot,
      }

      const occurredIso = new Date().toISOString()
      const updated = await updateConveyorNodeStepRestoreAborted(
        client,
        input.conveyorId,
        input.stepNodeId,
      )
      if (!updated) {
        throw new AppError(
          'Conflito ao restaurar a atividade (estado alterado concorrentemente).',
          409,
          ErrorCodes.CONFLICT,
        )
      }

      const ev = await serviceCreateConveyorOperationalEvent(client, {
        conveyorId: input.conveyorId,
        nodeId: input.stepNodeId,
        eventType: 'CONVEYOR_STEP_RESTORED',
        previousValue: 'ABORTED',
        newValue: 'REOPENED',
        reason: 'EXPLICITLY_RESTORED_FROM_ABORTED',
        source: 'USER_ACTION',
        occurredAt: occurredIso,
        createdBy: input.actorAppUserId,
        idempotencyKey: input.idempotencyKey,
        metadataJson: {
          stepNodeId: input.stepNodeId,
          previousAbort,
          plansNotReactivated: true,
          idempotencyKey: input.idempotencyKey,
        },
      })
      if (!ev.created) {
        assertReusedEventMatchesOperation(ev.event, {
          expectedEventType: 'CONVEYOR_STEP_RESTORED',
          conveyorId: input.conveyorId,
          stepNodeId: input.stepNodeId,
        })
      }
      idempotent = !ev.created

      await client.query('COMMIT')
    }
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw e
  } finally {
    client.release()
  }

  // Só após `client.release()`: `loadDetail` pede outra conexão ao pool.
  const detail = await loadDetail(pool, input.conveyorId)
  return { detail, idempotent }
}
