import type pg from 'pg'
import { calculateConveyorDelayState, type ConveyorDelayStateInput } from './conveyor-delay-state.js'
import { serviceCreateConveyorOperationalEvent } from './conveyor-operational-events.service.js'
import type { ConveyorOperationalEventRow, ConveyorOperationalEventSource } from './conveyor-operational-events.types.js'

export type DetectAndRecordConveyorDelayTransitionInput = {
  conveyorId: string
  before: ConveyorDelayStateInput
  after: ConveyorDelayStateInput
  source: Extract<ConveyorOperationalEventSource, 'SYSTEM' | 'USER_ACTION'>
  occurredAt: Date
  createdBy?: string | null
  reason?: string | null
}

function toIsoOrNull(v: string | Date | null): string | null {
  if (v == null) return null
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function buildIdempotencyKey(input: {
  conveyorId: string
  eventType: 'CONVEYOR_ENTERED_DELAY' | 'CONVEYOR_LEFT_DELAY'
  afterIsDelayed: boolean
  afterDeadlineIso: string | null
  afterPendingMinutes: number
}): string {
  return [
    'conveyor_delay',
    input.conveyorId,
    input.eventType,
    String(input.afterIsDelayed),
    input.afterDeadlineIso ?? 'null',
    String(input.afterPendingMinutes),
  ].join(':')
}

export async function detectAndRecordConveyorDelayTransition(
  pool: pg.Pool,
  input: DetectAndRecordConveyorDelayTransitionInput,
): Promise<{ created: boolean; event: ConveyorOperationalEventRow } | null> {
  const beforeState = calculateConveyorDelayState(input.before)
  const afterState = calculateConveyorDelayState(input.after)

  let eventType: 'CONVEYOR_ENTERED_DELAY' | 'CONVEYOR_LEFT_DELAY' | null = null
  if (!beforeState.isDelayed && afterState.isDelayed) {
    eventType = 'CONVEYOR_ENTERED_DELAY'
  } else if (beforeState.isDelayed && !afterState.isDelayed) {
    eventType = 'CONVEYOR_LEFT_DELAY'
  }
  if (!eventType) return null

  const afterDeadlineIso = toIsoOrNull(input.after.estimatedDeadline)
  const idempotencyKey = buildIdempotencyKey({
    conveyorId: input.conveyorId,
    eventType,
    afterIsDelayed: afterState.isDelayed,
    afterDeadlineIso,
    afterPendingMinutes: input.after.pendingMinutes,
  })

  return serviceCreateConveyorOperationalEvent(pool, {
    conveyorId: input.conveyorId,
    nodeId: null,
    eventType,
    previousValue: beforeState.reason ?? String(beforeState.isDelayed),
    newValue: afterState.reason ?? String(afterState.isDelayed),
    reason: input.reason ?? afterState.reason,
    source: input.source,
    occurredAt: input.occurredAt.toISOString(),
    createdBy: input.createdBy ?? null,
    idempotencyKey,
    metadataJson: {
      before: {
        isDelayed: beforeState.isDelayed,
        reason: beforeState.reason,
        pendingMinutes: input.before.pendingMinutes,
        estimatedDeadline: toIsoOrNull(input.before.estimatedDeadline),
      },
      after: {
        isDelayed: afterState.isDelayed,
        reason: afterState.reason,
        pendingMinutes: input.after.pendingMinutes,
        estimatedDeadline: afterDeadlineIso,
      },
    },
  })
}

