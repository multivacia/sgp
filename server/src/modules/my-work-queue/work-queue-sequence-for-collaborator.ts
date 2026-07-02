import type { ConveyorActivitySequenceAnalysis, PreviousOpenActivitySummary } from '../conveyors/conveyorActivitySequence.logic.js'
import type { StepCollaboratorOwnership } from './my-work-queue-step-assignees.repository.js'

export type PreviousOpenActivityOwnership = 'self' | 'other' | 'unassigned'

export type WorkQueuePreviousOpenFromOtherCollaborator = PreviousOpenActivitySummary & {
  collaboratorNames: string[]
}

export type WorkQueueSequenceForCollaborator = {
  structuralSequenceIndex: number
  /** Bloqueio operacional do colaborador atual (pendência própria ou sem responsável). */
  isOutOfSequence: boolean
  requiresOutOfSequenceJustification: boolean
  previousOpenCount: number
  previousOpenActivities: PreviousOpenActivitySummary[]
  hasPreviousOpenActivitiesFromOtherCollaborators: boolean
  previousOpenActivitiesFromOtherCollaborators: WorkQueuePreviousOpenFromOtherCollaborator[]
  previousOpenActivitiesWarningMessage: string | null
}

export const PREVIOUS_OPEN_FROM_OTHER_COLLABORATOR_WARNING =
  'Atenção: existe atividade anterior pendente atribuída a outro colaborador. Você pode apontar esta atividade, mas a esteira ainda possui etapas anteriores abertas.'

function classifyPreviousOpenOwnership(
  activity: PreviousOpenActivitySummary,
  collaboratorId: string,
  ownershipByStep: Map<string, StepCollaboratorOwnership>,
): PreviousOpenActivityOwnership {
  const ownership = ownershipByStep.get(activity.activityNodeId)
  if (!ownership?.hasAssignee || ownership.collaboratorIds.size === 0) {
    return 'unassigned'
  }
  if (ownership.collaboratorIds.has(collaboratorId)) {
    return 'self'
  }
  return 'other'
}

export function analyzeWorkQueueSequenceForCollaborator(
  seq: ConveyorActivitySequenceAnalysis,
  collaboratorId: string,
  ownershipByStep: Map<string, StepCollaboratorOwnership>,
): WorkQueueSequenceForCollaborator {
  if (!seq.targetFound) {
    return {
      structuralSequenceIndex: -1,
      isOutOfSequence: false,
      requiresOutOfSequenceJustification: false,
      previousOpenCount: 0,
      previousOpenActivities: [],
      hasPreviousOpenActivitiesFromOtherCollaborators: false,
      previousOpenActivitiesFromOtherCollaborators: [],
      previousOpenActivitiesWarningMessage: null,
    }
  }

  const selfOrUnassigned: PreviousOpenActivitySummary[] = []
  const fromOthers: WorkQueuePreviousOpenFromOtherCollaborator[] = []

  for (const activity of seq.previousOpenActivities) {
    const ownership = classifyPreviousOpenOwnership(activity, collaboratorId, ownershipByStep)
    if (ownership === 'other') {
      const stepOwnership = ownershipByStep.get(activity.activityNodeId)
      fromOthers.push({
        ...activity,
        collaboratorNames: stepOwnership?.collaboratorNames ?? [],
      })
    } else if (ownership === 'self' || ownership === 'unassigned') {
      selfOrUnassigned.push(activity)
    }
  }

  const isOutOfSequence = selfOrUnassigned.length > 0
  const hasPreviousOpenActivitiesFromOtherCollaborators =
    !isOutOfSequence && fromOthers.length > 0

  return {
    structuralSequenceIndex: seq.structuralSequenceIndex,
    isOutOfSequence,
    requiresOutOfSequenceJustification: isOutOfSequence,
    previousOpenCount: selfOrUnassigned.length,
    previousOpenActivities: selfOrUnassigned.slice(0, 3),
    hasPreviousOpenActivitiesFromOtherCollaborators,
    previousOpenActivitiesFromOtherCollaborators: hasPreviousOpenActivitiesFromOtherCollaborators
      ? fromOthers.slice(0, 3)
      : [],
    previousOpenActivitiesWarningMessage: hasPreviousOpenActivitiesFromOtherCollaborators
      ? PREVIOUS_OPEN_FROM_OTHER_COLLABORATOR_WARNING
      : null,
  }
}
