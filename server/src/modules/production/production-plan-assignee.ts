import type pg from 'pg'
import { DatabaseError } from 'pg'
import {
  findAssigneeIdForStepAndCollaborator,
  insertConveyorNodeAssignee,
  maxAssigneeOrderIndexForStep,
  newAssignmentId,
} from '../conveyors/conveyorAssignments.repository.js'
import { findStepPlanningForCollaborator } from '../operational-planning/planned-activity.repository.js'

export const PRODUCTION_PUBLISHED_PLAN_ASSIGNEE_METADATA = {
  source: 'production_published_plan',
} as const

function isPgUniqueViolation(err: unknown): boolean {
  return err instanceof DatabaseError && err.code === '23505'
}

/**
 * Resolve a alocação no STEP para apontamento em atividade **planejada para o colaborador**
 * (qualquer semana, plano publicado vigente). Sem item planejado para ele → `null`.
 * Reutiliza o assignee existente; sem assignee, cria apoio (`is_primary = false`).
 */
export async function resolveProductionStepAssigneeId(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    conveyorId: string
    stepNodeId: string
  },
): Promise<string | null> {
  const planning = await findStepPlanningForCollaborator(pool, input)
  if (!planning.plannedForCollaborator) return null

  const existing = await findAssigneeIdForStepAndCollaborator(
    pool,
    input.conveyorId,
    input.stepNodeId,
    input.collaboratorId,
  )
  if (existing) return existing

  const orderIndex = (await maxAssigneeOrderIndexForStep(pool, input.stepNodeId)) + 1

  try {
    const created = await insertConveyorNodeAssignee(pool, {
      id: newAssignmentId(),
      conveyor_id: input.conveyorId,
      conveyor_node_id: input.stepNodeId,
      assignment_type: 'COLLABORATOR',
      collaborator_id: input.collaboratorId,
      team_id: null,
      is_primary: false,
      assignment_origin: 'manual',
      order_index: orderIndex,
      metadata_json: PRODUCTION_PUBLISHED_PLAN_ASSIGNEE_METADATA,
    })
    return created.id
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      const raced = await findAssigneeIdForStepAndCollaborator(
        pool,
        input.conveyorId,
        input.stepNodeId,
        input.collaboratorId,
      )
      if (raced) return raced
    }
    throw err
  }
}
