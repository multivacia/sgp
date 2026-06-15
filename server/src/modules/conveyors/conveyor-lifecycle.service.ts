import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type { ConveyorDetailApi } from './conveyors.dto.js'
import {
  findConveyorById,
  listConveyorNodesByConveyorId,
  updateConveyorOperationalStatus,
  type ConveyorOperationalStatusDb,
} from './conveyors.repository.js'
import { serviceGetConveyorPendingMinutes } from './conveyorNodeWorkload.service.js'
import {
  canReturnConveyorToBacklog,
  canReturnConveyorToPlanning,
  CONVEYOR_RETURN_REASON_MAX,
  CONVEYOR_RETURN_REASON_MIN,
  CONVEYOR_RETURN_REASON_REQUIRED_MESSAGE,
  CONVEYOR_RETURN_TO_BACKLOG_BLOCKED_MESSAGE,
  CONVEYOR_RETURN_TO_PLANNING_BLOCKED_MESSAGE,
  resolveCompletedAtMode,
} from './conveyorOperationalStatus.js'
import { mapDetailRowToApi, loadConveyorStructureWithAssignees } from './conveyors.service.js'
import { detectAndRecordConveyorDelayTransition } from './operational-events/conveyor-delay-events.service.js'
import { serviceCreateConveyorOperationalEvent } from './operational-events/conveyor-operational-events.service.js'

export function normalizeConveyorReturnReason(reason: string): string {
  const trimmed = reason.trim()
  if (!trimmed.length || trimmed.length < CONVEYOR_RETURN_REASON_MIN) {
    throw new AppError(
      CONVEYOR_RETURN_REASON_REQUIRED_MESSAGE,
      422,
      ErrorCodes.CONVEYOR_RETURN_REASON_REQUIRED,
    )
  }
  if (trimmed.length > CONVEYOR_RETURN_REASON_MAX) {
    throw new AppError(
      `O motivo deve ter no máximo ${CONVEYOR_RETURN_REASON_MAX} caracteres.`,
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return trimmed
}

type ReturnConveyorOptions = {
  actorUserId?: string | null
}

async function executeConveyorOperationalReturn(
  pool: pg.Pool,
  conveyorId: string,
  input: {
    targetStatus: ConveyorOperationalStatusDb
    eventType: 'CONVEYOR_RETURNED_TO_BACKLOG' | 'CONVEYOR_RETURNED_TO_PLANNING'
    canReturn: (from: ConveyorOperationalStatusDb) => boolean
    blockedMessage: string
    blockedCode:
      | typeof ErrorCodes.CONVEYOR_RETURN_TO_BACKLOG_STATUS_NOT_ALLOWED
      | typeof ErrorCodes.CONVEYOR_RETURN_TO_PLANNING_STATUS_NOT_ALLOWED
    reason: string
    actorUserId?: string | null
  },
): Promise<ConveyorDetailApi | null> {
  const row = await findConveyorById(pool, conveyorId)
  if (!row) return null

  const reason = normalizeConveyorReturnReason(input.reason)
  const fromStatus = row.operational_status

  if (!input.canReturn(fromStatus)) {
    throw new AppError(input.blockedMessage, 422, input.blockedCode)
  }

  if (fromStatus === input.targetStatus) {
    throw new AppError(
      'Não é permitido alterar para o mesmo status.',
      422,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  const beforePendingMinutes =
    (await serviceGetConveyorPendingMinutes(pool, conveyorId)) ?? 0
  const occurredAt = new Date()
  const completedAtMode = resolveCompletedAtMode(fromStatus, input.targetStatus)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const updated = await updateConveyorOperationalStatus(
      client,
      conveyorId,
      input.targetStatus,
      completedAtMode,
    )
    if (!updated) {
      await client.query('ROLLBACK')
      return null
    }

    await serviceCreateConveyorOperationalEvent(client, {
      conveyorId,
      eventType: input.eventType,
      previousValue: fromStatus,
      newValue: input.targetStatus,
      reason,
      source: 'USER_ACTION',
      occurredAt: occurredAt.toISOString(),
      createdBy: input.actorUserId ?? null,
    })

    await client.query('COMMIT')

    const afterPendingMinutes =
      (await serviceGetConveyorPendingMinutes(pool, conveyorId)) ?? 0
    await detectAndRecordConveyorDelayTransition(pool, {
      conveyorId,
      before: {
        operationalStatus: fromStatus,
        estimatedDeadline: row.estimated_deadline,
        pendingMinutes: beforePendingMinutes,
        now: occurredAt,
      },
      after: {
        operationalStatus: updated.operational_status,
        estimatedDeadline: updated.estimated_deadline,
        pendingMinutes: afterPendingMinutes,
        now: occurredAt,
      },
      source: 'USER_ACTION',
      occurredAt,
      createdBy: input.actorUserId ?? null,
    })

    const nodes = await listConveyorNodesByConveyorId(pool, conveyorId)
    const structure = await loadConveyorStructureWithAssignees(pool, conveyorId, nodes)
    return mapDetailRowToApi(updated, structure)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function serviceReturnConveyorToBacklog(
  pool: pg.Pool,
  conveyorId: string,
  reason: string,
  options?: ReturnConveyorOptions,
): Promise<ConveyorDetailApi | null> {
  return executeConveyorOperationalReturn(pool, conveyorId, {
    targetStatus: 'AGUARDANDO_PLANEJAMENTO',
    eventType: 'CONVEYOR_RETURNED_TO_BACKLOG',
    canReturn: canReturnConveyorToBacklog,
    blockedMessage: CONVEYOR_RETURN_TO_BACKLOG_BLOCKED_MESSAGE,
    blockedCode: ErrorCodes.CONVEYOR_RETURN_TO_BACKLOG_STATUS_NOT_ALLOWED,
    reason,
    actorUserId: options?.actorUserId,
  })
}

export async function serviceReturnConveyorToPlanning(
  pool: pg.Pool,
  conveyorId: string,
  reason: string,
  options?: ReturnConveyorOptions,
): Promise<ConveyorDetailApi | null> {
  return executeConveyorOperationalReturn(pool, conveyorId, {
    targetStatus: 'EM_PLANEJAMENTO',
    eventType: 'CONVEYOR_RETURNED_TO_PLANNING',
    canReturn: canReturnConveyorToPlanning,
    blockedMessage: CONVEYOR_RETURN_TO_PLANNING_BLOCKED_MESSAGE,
    blockedCode: ErrorCodes.CONVEYOR_RETURN_TO_PLANNING_STATUS_NOT_ALLOWED,
    reason,
    actorUserId: options?.actorUserId,
  })
}
