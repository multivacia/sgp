import type {
  ConveyorActivitySequenceAnalysis,
  PreviousOpenActivitySummary,
} from '../conveyors/conveyorActivitySequence.logic.js'
import {
  resolveSequencePresentation,
  type SequenceWarningType,
} from './work-queue-sequence-presentation.js'

export type WorkQueuePreviousOpenFromOtherCollaborator = PreviousOpenActivitySummary

export type WorkQueueSequenceForCollaborator = {
  targetFound: boolean
  structuralSequenceIndex: number
  hasPreviousPendingStep: boolean
  allPreviousOpenActivities: PreviousOpenActivitySummary[]
  sequenceWarningType?: SequenceWarningType
  sequenceWarningLabel?: string
  /** Igual a hasPreviousPendingStep — uso em POST/persistência, não em badge de listagem. */
  isOutOfSequence: boolean
  requiresOutOfSequenceJustification: boolean
  canPointTime: boolean
  blockingReason?: string
  previousOpenCount: number
  /** Predecessoras abertas do colaborador atual (informativo). */
  previousOpenActivities: PreviousOpenActivitySummary[]
  /** Predecessoras abertas de outro colaborador (informativo). */
  awaitingPreviousActivities: PreviousOpenActivitySummary[]
  /** @deprecated use awaitingPreviousActivities.length > 0 */
  hasPreviousOpenActivitiesFromOtherCollaborators: boolean
  /** @deprecated use awaitingPreviousActivities */
  previousOpenActivitiesFromOtherCollaborators: WorkQueuePreviousOpenFromOtherCollaborator[]
  /** @deprecated use sequenceWarningLabel */
  previousOpenActivitiesWarningMessage: string | null
}

export type MapWorkQueueSequenceInput = {
  seq: ConveyorActivitySequenceAnalysis
  isActivityCompleted: boolean
  conveyorOperationalStatus: string | null
  planItemStatus?: string | null
}

export function mapWorkQueueSequenceForCollaborator(
  input: MapWorkQueueSequenceInput | ConveyorActivitySequenceAnalysis,
  legacy?: {
    isActivityCompleted?: boolean
    conveyorOperationalStatus?: string | null
    planItemStatus?: string | null
  },
): WorkQueueSequenceForCollaborator {
  const seq = 'seq' in input ? input.seq : input
  const isActivityCompleted =
    'isActivityCompleted' in input
      ? input.isActivityCompleted
      : (legacy?.isActivityCompleted ?? false)
  const conveyorOperationalStatus =
    'conveyorOperationalStatus' in input
      ? input.conveyorOperationalStatus
      : (legacy?.conveyorOperationalStatus ?? null)
  const planItemStatus =
    'planItemStatus' in input ? input.planItemStatus : legacy?.planItemStatus

  if (!seq.targetFound) {
    return {
      targetFound: false,
      structuralSequenceIndex: -1,
      hasPreviousPendingStep: false,
      allPreviousOpenActivities: [],
      isOutOfSequence: false,
      requiresOutOfSequenceJustification: false,
      canPointTime: false,
      previousOpenCount: 0,
      previousOpenActivities: [],
      awaitingPreviousActivities: [],
      hasPreviousOpenActivitiesFromOtherCollaborators: false,
      previousOpenActivitiesFromOtherCollaborators: [],
      previousOpenActivitiesWarningMessage: null,
    }
  }

  const presentation = resolveSequencePresentation({
    isActivityCompleted,
    conveyorOperationalStatus,
    planItemStatus,
    hasPreviousPendingStep: seq.hasPreviousPendingStep,
    allPreviousOpenActivities: seq.allPreviousOpenActivities,
  })

  const awaitingPreviousActivities = seq.awaitingOthersActivities.slice(0, 3)
  const previousOpenActivities = seq.previousOpenActivities.slice(0, 3)

  return {
    targetFound: true,
    structuralSequenceIndex: seq.structuralSequenceIndex,
    hasPreviousPendingStep: presentation.hasPreviousPendingStep,
    allPreviousOpenActivities: seq.allPreviousOpenActivities.slice(0, 3),
    sequenceWarningType: presentation.sequenceWarningType,
    sequenceWarningLabel: presentation.sequenceWarningLabel,
    isOutOfSequence: seq.isOutOfSequence,
    requiresOutOfSequenceJustification: presentation.requiresOutOfSequenceJustification,
    canPointTime: presentation.canPointTime,
    blockingReason: presentation.blockingReason,
    previousOpenCount: seq.previousOpenCount,
    previousOpenActivities,
    awaitingPreviousActivities,
    hasPreviousOpenActivitiesFromOtherCollaborators: awaitingPreviousActivities.length > 0,
    previousOpenActivitiesFromOtherCollaborators: awaitingPreviousActivities,
    previousOpenActivitiesWarningMessage: presentation.sequenceWarningLabel ?? null,
  }
}

/** @deprecated use mapWorkQueueSequenceForCollaborator */
export const analyzeWorkQueueSequenceForCollaborator = mapWorkQueueSequenceForCollaborator
