import type pg from 'pg'
import { analyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.logic.js'
import type { SequenceAnalysisNode } from '../conveyors/conveyorActivitySequence.logic.js'
import {
  listConveyorNodesForSequenceAnalysis,
  listPlannedCollaboratorsByActivityNode,
} from '../conveyors/conveyors.repository.js'
import {
  mapWorkQueueSequenceForCollaborator,
  type WorkQueueSequenceForCollaborator,
} from './work-queue-sequence-for-collaborator.js'

function mapNodesForSequence(
  nodes: Awaited<ReturnType<typeof listConveyorNodesForSequenceAnalysis>>,
): SequenceAnalysisNode[] {
  return nodes.map((n) => ({
    id: n.id,
    parent_id: n.parent_id,
    node_type: n.node_type,
    order_index: n.order_index,
    name: n.name,
    operational_status: n.operational_status,
    is_active: n.is_active,
  }))
}

export async function serviceAnalyzeWorkQueueSequenceForCollaborator(
  pool: pg.Pool,
  input: {
    conveyorId: string
    activityNodeId: string
    collaboratorId: string
  },
): Promise<WorkQueueSequenceForCollaborator> {
  const [nodes, plannedByNode] = await Promise.all([
    listConveyorNodesForSequenceAnalysis(pool, input.conveyorId),
    listPlannedCollaboratorsByActivityNode(pool, input.conveyorId),
  ])
  const seq = analyzeConveyorActivitySequence(
    mapNodesForSequence(nodes),
    input.activityNodeId,
    {
      currentCollaboratorId: input.collaboratorId,
      plannedCollaboratorsByActivityNodeId: plannedByNode,
    },
  )
  return mapWorkQueueSequenceForCollaborator(seq)
}
