import type pg from 'pg'
import { getStepCompletionFacts } from './conveyor-operational-events.repository.js'
import { serviceCreateConveyorOperationalEvent } from './conveyor-operational-events.service.js'
import { calculateConveyorStepCompletionState } from './conveyor-step-completion-state.js'
import type { ConveyorOperationalEventRow, ConveyorOperationalEventSource } from './conveyor-operational-events.types.js'

export type DetectAndRecordConveyorStepCompletedInput = {
  conveyorId: string
  stepNodeId: string
  source: Extract<ConveyorOperationalEventSource, 'SYSTEM' | 'USER_ACTION'>
  occurredAt: Date
  createdBy?: string | null
}

export async function detectAndRecordConveyorStepCompleted(
  pool: pg.Pool,
  input: DetectAndRecordConveyorStepCompletedInput,
): Promise<{ created: boolean; event: ConveyorOperationalEventRow } | null> {
  const facts = await getStepCompletionFacts(pool, input.conveyorId, input.stepNodeId)
  if (!facts) return null

  // Consumo de tempo planejado não equivale a conclusão operacional.
  // TODO Sprint futura: considerar PATCH explícito de conclusão por STEP.
  const completion = calculateConveyorStepCompletionState({
    ...facts,
    explicitlyCompleted: false,
  })
  if (!completion.isCompleted) return null

  return serviceCreateConveyorOperationalEvent(pool, {
    conveyorId: input.conveyorId,
    nodeId: input.stepNodeId,
    eventType: 'CONVEYOR_STEP_COMPLETED',
    previousValue: 'IN_PROGRESS',
    newValue: 'COMPLETED',
    reason: completion.reason,
    source: input.source,
    occurredAt: input.occurredAt.toISOString(),
    createdBy: input.createdBy ?? null,
    idempotencyKey: `conveyor_step_completed:${input.conveyorId}:${input.stepNodeId}`,
    metadataJson: {
      stepNodeId: input.stepNodeId,
      plannedMinutes: facts.plannedMinutes,
      realizedMinutes: facts.realizedMinutes,
      reason: completion.reason,
    },
  })
}

