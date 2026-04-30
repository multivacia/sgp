export const conveyorOperationalEventTypeValues = [
  'CONVEYOR_ENTERED_DELAY',
  'CONVEYOR_LEFT_DELAY',
  'CONVEYOR_STEP_COMPLETED',
  'MANUAL_NOTE',
] as const

export type ConveyorOperationalEventType =
  (typeof conveyorOperationalEventTypeValues)[number]

export const conveyorOperationalEventSourceValues = [
  'SYSTEM',
  'USER_ACTION',
  'RECONCILIATION',
  'IMPORT',
  'ARGOS_PREP',
] as const

export type ConveyorOperationalEventSource =
  (typeof conveyorOperationalEventSourceValues)[number]

export type ConveyorOperationalEventRow = {
  id: string
  conveyor_id: string
  node_id: string | null
  event_type: ConveyorOperationalEventType
  previous_value: string | null
  new_value: string | null
  reason: string | null
  source: ConveyorOperationalEventSource
  occurred_at: Date
  created_by: string | null
  metadata_json: Record<string, unknown> | null
  idempotency_key: string | null
  created_at: Date
}

export type InsertConveyorOperationalEventInput = {
  conveyorId: string
  nodeId?: string | null
  eventType: ConveyorOperationalEventType
  previousValue?: string | null
  newValue?: string | null
  reason?: string | null
  source: ConveyorOperationalEventSource
  occurredAt: string
  createdBy?: string | null
  metadataJson?: Record<string, unknown> | null
  idempotencyKey?: string | null
}

export type ListConveyorOperationalEventsFilters = {
  conveyorId?: string
  nodeId?: string
  eventType?: ConveyorOperationalEventType
  limit?: number
}

export type ConveyorOperationalEventSnapshotItem = {
  eventId: string
  conveyorId: string
  nodeId: string | null
  eventType: ConveyorOperationalEventType
  previousValue: string | null
  newValue: string | null
  reason: string | null
  source: ConveyorOperationalEventSource
  occurredAt: string
  createdAt: string
  metadataJson: Record<string, unknown> | null
}

