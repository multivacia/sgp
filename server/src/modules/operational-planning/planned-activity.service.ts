import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  findStepPlanningForCollaborator,
  sumCollaboratorRealizedMinutesByStep,
} from './planned-activity.repository.js'

export const TIME_ENTRY_EXCEEDED_PLANNED_JUSTIFICATION_MESSAGE =
  'Informe uma justificativa para apontar acima do tempo previsto da atividade.'

export const TIME_ENTRY_NOT_PLANNED_MESSAGE =
  'Esta atividade não está planejada. Fale com o gestor para incluí-la no planejamento.'

/**
 * Resultado da regra de apontamento (TASK `apontamento-somente-planejado`):
 * - `MINE`: atividade planejada para o colaborador → aponta sem justificativa de exceção;
 * - `OTHER`: planejada só para outro colaborador → aponta com justificativa de exceção.
 * Atividade não planejada para ninguém lança `TIME_ENTRY_NOT_PLANNED` (422).
 */
export type TimeEntryPlanningGate =
  | { kind: 'MINE'; plannedMinutesForCollaborator: number | null }
  | { kind: 'OTHER' }

export async function resolveTimeEntryPlanningGate(
  pool: pg.Pool | pg.PoolClient,
  input: { conveyorId: string; stepNodeId: string; collaboratorId: string },
): Promise<TimeEntryPlanningGate> {
  const planning = await findStepPlanningForCollaborator(pool, input)
  if (planning.plannedForCollaborator) {
    return {
      kind: 'MINE',
      plannedMinutesForCollaborator: planning.plannedMinutesForCollaborator,
    }
  }
  if (planning.plannedForAnyone) return { kind: 'OTHER' }
  throw new AppError(TIME_ENTRY_NOT_PLANNED_MESSAGE, 422, ErrorCodes.TIME_ENTRY_NOT_PLANNED)
}

/** Recusa apontamento em atividade não planejada para ninguém (ex.: gestor em nome de outro). */
export async function assertStepPlannedForAnyone(
  pool: pg.Pool | pg.PoolClient,
  input: { conveyorId: string; stepNodeId: string; collaboratorId: string },
): Promise<void> {
  const planning = await findStepPlanningForCollaborator(pool, input)
  if (!planning.plannedForAnyone) {
    throw new AppError(TIME_ENTRY_NOT_PLANNED_MESSAGE, 422, ErrorCodes.TIME_ENTRY_NOT_PLANNED)
  }
}

/** Regra pura: realizado + novo apontamento acima do previsto exige justificativa. */
export function requiresExcessTimeJustification(input: {
  plannedMinutes: number | null
  realizedMinutes: number
  minutesNovo: number
}): boolean {
  if (!Number.isInteger(input.minutesNovo) || input.minutesNovo <= 0) return false
  const planned = input.plannedMinutes
  if (planned == null || !Number.isFinite(planned) || planned <= 0) return false
  return input.realizedMinutes + input.minutesNovo > planned
}

/**
 * Excesso de tempo do próprio colaborador: previsto = soma de todos os itens planejados
 * válidos dele na atividade; realizado = soma dos apontamentos dele na atividade.
 */
export async function resolveCollaboratorExcessCheck(
  pool: pg.Pool | pg.PoolClient,
  input: {
    stepNodeId: string
    collaboratorId: string
    plannedMinutesForCollaborator: number | null
    minutesNovo: number
  },
): Promise<{ required: boolean; plannedMinutes: number | null; realizedMinutes: number }> {
  const realizedByStep = await sumCollaboratorRealizedMinutesByStep(pool, input.collaboratorId, [
    input.stepNodeId,
  ])
  const realizedMinutes = realizedByStep.get(input.stepNodeId) ?? 0
  return {
    required: requiresExcessTimeJustification({
      plannedMinutes: input.plannedMinutesForCollaborator,
      realizedMinutes,
      minutesNovo: input.minutesNovo,
    }),
    plannedMinutes: input.plannedMinutesForCollaborator,
    realizedMinutes,
  }
}
