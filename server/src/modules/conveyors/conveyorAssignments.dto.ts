import type {
  ConveyorNodeAssigneeListRow,
  ConveyorNodeAssigneeRow,
  ConveyorTimeEntryListRow,
  ConveyorTimeEntryRow,
} from './conveyorAssignments.repository.js'

export type AssigneeCreatedDto = {
  id: string
  conveyorId: string
  stepNodeId: string
  type: 'COLLABORATOR' | 'TEAM'
  collaboratorId: string | null
  teamId: string | null
  isPrimary: boolean
  assignmentOrigin: 'manual' | 'base' | 'reaproveitada'
  orderIndex: number
  createdAt: string
}

export type AssigneeListItemDto = {
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

/** Campos derivados de `metadata_json` interno — nunca expor o JSON bruto. */
export type TimeEntryDelegationPublic = {
  isDelegated: boolean
  recordedByAppUserId: string | null
  /** Email do utilizador que registou (equivalente legível a “nome” na conta). */
  recordedByUserEmail: string | null
  delegationReason: string | null
}

export type TimeEntryCreatedDto = TimeEntryDelegationPublic & {
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

export type TimeEntryListItemDto = TimeEntryDelegationPublic & {
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

function delegationFromStoredMetadata(
  metadataJson: unknown | null,
  recordedByUserEmail: string | null,
): TimeEntryDelegationPublic {
  const isObj =
    metadataJson !== null &&
    metadataJson !== undefined &&
    typeof metadataJson === 'object' &&
    !Array.isArray(metadataJson)
  const o = isObj ? (metadataJson as Record<string, unknown>) : {}
  const ridRaw = o.recordedByAppUserId
  const recordedByAppUserId =
    typeof ridRaw === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      ridRaw,
    )
      ? ridRaw
      : null
  const isDelegated = o.isDelegated === true || Boolean(recordedByAppUserId)
  const dr = o.delegationReason
  const delegationReason =
    typeof dr === 'string' && dr.trim().length > 0 ? dr.trim() : null
  return {
    isDelegated,
    recordedByAppUserId,
    recordedByUserEmail: recordedByUserEmail ?? null,
    delegationReason,
  }
}

export function assigneeRowToCreated(row: ConveyorNodeAssigneeRow): AssigneeCreatedDto {
  return {
    id: row.id,
    conveyorId: row.conveyor_id,
    stepNodeId: row.conveyor_node_id,
    type: row.assignment_type,
    collaboratorId: row.collaborator_id,
    teamId: row.team_id,
    isPrimary: row.is_primary,
    assignmentOrigin: row.assignment_origin,
    orderIndex: row.order_index,
    createdAt: row.created_at.toISOString(),
  }
}

export function assigneeListRowToDto(
  row: ConveyorNodeAssigneeListRow,
): AssigneeListItemDto {
  return {
    id: row.id,
    type: row.assignment_type,
    collaboratorId: row.collaborator_id,
    collaboratorName: row.collaborator_name,
    teamId: row.team_id,
    teamName: row.team_name,
    isPrimary: row.is_primary,
    assignmentOrigin: row.assignment_origin,
    orderIndex: row.order_index,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export function timeEntryRowToCreated(
  row: ConveyorTimeEntryRow,
  recordedByUserEmail: string | null,
): TimeEntryCreatedDto {
  const d = delegationFromStoredMetadata(row.metadata_json, recordedByUserEmail)
  return {
    ...d,
    id: row.id,
    conveyorId: row.conveyor_id,
    stepNodeId: row.conveyor_node_id,
    collaboratorId: row.collaborator_id,
    conveyorNodeAssigneeId: row.conveyor_node_assignee_id,
    minutes: row.minutes,
    notes: row.notes,
    entryMode: row.entry_mode,
    entryAt: row.entry_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  }
}

export function timeEntryListRowToDto(row: ConveyorTimeEntryListRow): TimeEntryListItemDto {
  const d = delegationFromStoredMetadata(
    row.metadata_json,
    row.recorded_by_user_email,
  )
  return {
    ...d,
    id: row.id,
    collaboratorId: row.collaborator_id,
    collaboratorName: row.collaborator_name,
    conveyorNodeAssigneeId: row.conveyor_node_assignee_id,
    minutes: row.minutes,
    notes: row.notes,
    entryMode: row.entry_mode,
    entryAt: row.entry_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}
