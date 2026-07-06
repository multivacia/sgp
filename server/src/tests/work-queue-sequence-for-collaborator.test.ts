import { describe, expect, it } from 'vitest'
import {
  analyzeConveyorActivitySequence,
  type SequenceAnalysisNode,
} from '../modules/conveyors/conveyorActivitySequence.logic.js'
import type { StepCollaboratorOwnership } from '../modules/my-work-queue/my-work-queue-step-assignees.repository.js'
import {
  analyzeWorkQueueSequenceForCollaborator,
  PREVIOUS_OPEN_FROM_OTHER_COLLABORATOR_WARNING,
} from '../modules/my-work-queue/work-queue-sequence-for-collaborator.js'

const JOAO = '00000000-0000-0000-0000-000000000101'
const MARIA = '00000000-0000-0000-0000-000000000102'
const STEP_A = 'step-a'
const STEP_B = 'step-b'
const STEP_C = 'step-c'

function step(
  id: string,
  name: string,
  orderIndex: number,
  status: SequenceAnalysisNode['operational_status'] = 'PENDING',
): SequenceAnalysisNode {
  return {
    id,
    parent_id: 'area-1',
    node_type: 'STEP',
    order_index: orderIndex,
    name,
    operational_status: status,
    is_active: true,
  }
}

function abcNodes(
  statuses: Record<string, SequenceAnalysisNode['operational_status']> = {},
): SequenceAnalysisNode[] {
  return [
    {
      id: 'opt-1',
      parent_id: null,
      node_type: 'OPTION',
      order_index: 0,
      name: 'Tarefa',
      operational_status: null,
      is_active: true,
    },
    {
      id: 'area-1',
      parent_id: 'opt-1',
      node_type: 'AREA',
      order_index: 0,
      name: 'Setor',
      operational_status: null,
      is_active: true,
    },
    step(STEP_A, 'Atividade A', 0, statuses[STEP_A] ?? 'PENDING'),
    step(STEP_B, 'Atividade B', 1, statuses[STEP_B] ?? 'PENDING'),
    step(STEP_C, 'Atividade C', 2, statuses[STEP_C] ?? 'PENDING'),
  ]
}

function ownershipIndex(
  assignments: Record<string, { collaboratorId: string; name: string } | null>,
): Map<string, StepCollaboratorOwnership> {
  const index = new Map<string, StepCollaboratorOwnership>()
  for (const [stepId, assignment] of Object.entries(assignments)) {
    if (!assignment) {
      index.set(stepId, {
        collaboratorIds: new Set(),
        collaboratorNames: [],
        hasAssignee: false,
      })
      continue
    }
    index.set(stepId, {
      collaboratorIds: new Set([assignment.collaboratorId]),
      collaboratorNames: [assignment.name],
      hasAssignee: true,
    })
  }
  return index
}

describe('analyzeWorkQueueSequenceForCollaborator', () => {
  it('mesmo colaborador: B bloqueada por A pendente', () => {
    const nodes = abcNodes()
    const ownership = ownershipIndex({
      [STEP_A]: { collaboratorId: MARIA, name: 'Maria' },
      [STEP_B]: { collaboratorId: MARIA, name: 'Maria' },
      [STEP_C]: { collaboratorId: MARIA, name: 'Maria' },
    })

    const a = analyzeWorkQueueSequenceForCollaborator(
      analyzeConveyorActivitySequence(nodes, STEP_A),
      MARIA,
      ownership,
    )
    const b = analyzeWorkQueueSequenceForCollaborator(
      analyzeConveyorActivitySequence(nodes, STEP_B),
      MARIA,
      ownership,
    )

    expect(a.isOutOfSequence).toBe(false)
    expect(b.isOutOfSequence).toBe(true)
    expect(b.requiresOutOfSequenceJustification).toBe(true)
    expect(b.hasPreviousOpenActivitiesFromOtherCollaborators).toBe(false)
  })

  it('colaboradores diferentes: Maria em B com A de João pendente não é bloqueada', () => {
    const nodes = abcNodes()
    const ownership = ownershipIndex({
      [STEP_A]: { collaboratorId: JOAO, name: 'João' },
      [STEP_B]: { collaboratorId: MARIA, name: 'Maria' },
      [STEP_C]: { collaboratorId: MARIA, name: 'Maria' },
    })

    const b = analyzeWorkQueueSequenceForCollaborator(
      analyzeConveyorActivitySequence(nodes, STEP_B),
      MARIA,
      ownership,
    )

    expect(b.isOutOfSequence).toBe(false)
    expect(b.requiresOutOfSequenceJustification).toBe(false)
    expect(b.hasPreviousOpenActivitiesFromOtherCollaborators).toBe(true)
    expect(b.previousOpenActivitiesWarningMessage).toBe(
      PREVIOUS_OPEN_FROM_OTHER_COLLABORATOR_WARNING,
    )
    expect(b.previousOpenActivitiesFromOtherCollaborators[0]?.activityTitle).toBe('Atividade A')
  })

  it('após João concluir A, alerta em B desaparece para Maria', () => {
    const nodes = abcNodes({ [STEP_A]: 'COMPLETED' })
    const ownership = ownershipIndex({
      [STEP_A]: { collaboratorId: JOAO, name: 'João' },
      [STEP_B]: { collaboratorId: MARIA, name: 'Maria' },
    })

    const b = analyzeWorkQueueSequenceForCollaborator(
      analyzeConveyorActivitySequence(nodes, STEP_B),
      MARIA,
      ownership,
    )

    expect(b.hasPreviousOpenActivitiesFromOtherCollaborators).toBe(false)
    expect(b.previousOpenActivitiesWarningMessage).toBeNull()
  })

  it('Maria com B e C pendentes: B livre com alerta de A, C bloqueada por B', () => {
    const nodes = abcNodes()
    const ownership = ownershipIndex({
      [STEP_A]: { collaboratorId: JOAO, name: 'João' },
      [STEP_B]: { collaboratorId: MARIA, name: 'Maria' },
      [STEP_C]: { collaboratorId: MARIA, name: 'Maria' },
    })

    const b = analyzeWorkQueueSequenceForCollaborator(
      analyzeConveyorActivitySequence(nodes, STEP_B),
      MARIA,
      ownership,
    )
    const c = analyzeWorkQueueSequenceForCollaborator(
      analyzeConveyorActivitySequence(nodes, STEP_C),
      MARIA,
      ownership,
    )

    expect(b.isOutOfSequence).toBe(false)
    expect(b.hasPreviousOpenActivitiesFromOtherCollaborators).toBe(true)
    expect(c.isOutOfSequence).toBe(true)
    expect(c.requiresOutOfSequenceJustification).toBe(true)
    expect(c.hasPreviousOpenActivitiesFromOtherCollaborators).toBe(false)
  })

  it('pendência anterior sem responsável mantém bloqueio seguro', () => {
    const nodes = abcNodes()
    const ownership = ownershipIndex({
      [STEP_A]: null,
      [STEP_B]: { collaboratorId: MARIA, name: 'Maria' },
    })

    const b = analyzeWorkQueueSequenceForCollaborator(
      analyzeConveyorActivitySequence(nodes, STEP_B),
      MARIA,
      ownership,
    )

    expect(b.isOutOfSequence).toBe(true)
    expect(b.requiresOutOfSequenceJustification).toBe(true)
    expect(b.hasPreviousOpenActivitiesFromOtherCollaborators).toBe(false)
    expect(b.previousOpenActivities[0]?.activityTitle).toBe('Atividade A')
  })

  it('propaga targetFound da análise estrutural', () => {
    const nodes = abcNodes()
    const ownership = ownershipIndex({
      [STEP_B]: { collaboratorId: MARIA, name: 'Maria' },
    })

    const found = analyzeWorkQueueSequenceForCollaborator(
      analyzeConveyorActivitySequence(nodes, STEP_B),
      MARIA,
      ownership,
    )
    const missing = analyzeWorkQueueSequenceForCollaborator(
      analyzeConveyorActivitySequence(nodes, 'step-inexistente'),
      MARIA,
      ownership,
    )

    expect(found.targetFound).toBe(true)
    expect(missing.targetFound).toBe(false)
    expect(missing.structuralSequenceIndex).toBe(-1)
  })
})
