import type pg from 'pg'
import {
  listConveyorNodesForSequenceAnalysis,
  listPlannedCollaboratorsByActivityNode,
} from './conveyors.repository.js'
import {
  analyzeConveyorActivitySequence,
  type ConveyorActivitySequenceAnalysis,
  type SequenceAnalysisNode,
} from './conveyorActivitySequence.logic.js'

export type { ConveyorActivitySequenceAnalysis, SequenceAnalysisNode }

/**
 * Análise de sequência operacional recomendada para uma Atividade (STEP).
 */
export async function serviceAnalyzeConveyorActivitySequence(
  pool: pg.Pool,
  conveyorId: string,
  activityNodeId: string,
  currentCollaboratorId?: string,
): Promise<ConveyorActivitySequenceAnalysis> {
  const nodesPromise = listConveyorNodesForSequenceAnalysis(pool, conveyorId)
  const plannedPromise = currentCollaboratorId
    ? listPlannedCollaboratorsByActivityNode(pool, conveyorId)
    : Promise.resolve(null)

  const [nodes, plannedByNode] = await Promise.all([nodesPromise, plannedPromise])

  const ownership =
    currentCollaboratorId && plannedByNode
      ? {
          currentCollaboratorId,
          plannedCollaboratorsByActivityNodeId: plannedByNode,
        }
      : undefined

  return analyzeConveyorActivitySequence(
    nodes as SequenceAnalysisNode[],
    activityNodeId,
    ownership,
  )
}
