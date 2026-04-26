/**
 * Contratos de leitura — alinhados a `conveyorAssignments.dto.ts` no servidor.
 */

export type ConveyorStepAssigneeListItem = {
  id: string
  type: 'COLLABORATOR' | 'TEAM'
  collaboratorId: string | null
  collaboratorName: string | null
  teamId: string | null
  teamName: string | null
  isPrimary: boolean
  assignmentOrigin: 'manual' | 'base' | 'reaproveitada'
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export type TimeEntryDelegationClient = {
  isDelegated: boolean
  recordedByAppUserId: string | null
  recordedByUserEmail: string | null
  delegationReason: string | null
}

export type ConveyorStepTimeEntryListItem = TimeEntryDelegationClient & {
  id: string
  collaboratorId: string
  collaboratorName: string | null
  conveyorNodeAssigneeId: string | null
  minutes: number
  notes: string | null
  entryMode: 'manual' | 'guided' | 'imported'
  entryAt: string
  createdAt: string
  updatedAt: string
}

/** POST /api/v1/conveyors/.../time-entries — resposta (envelope `data`). */
export type ConveyorStepTimeEntryCreated = TimeEntryDelegationClient & {
  id: string
  conveyorId: string
  stepNodeId: string
  collaboratorId: string
  conveyorNodeAssigneeId: string | null
  minutes: number
  notes: string | null
  entryMode: 'manual' | 'guided' | 'imported'
  entryAt: string
  createdAt: string
}

export type PostConveyorStepTimeEntryBody = {
  minutes: number
  notes?: string | null
  entryAt?: string
  entryMode?: 'manual' | 'guided' | 'imported'
}

/** POST .../time-entries/on-behalf */
export type PostConveyorStepTimeEntryOnBehalfBody = {
  targetCollaboratorId: string
  minutes: number
  notes?: string | null
  entryAt?: string
  reason: string
}
