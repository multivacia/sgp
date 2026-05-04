export type OperationalEventCategory =
  | 'delay'
  | 'completion'
  | 'reopen'
  | 'block'
  | 'pause'
  | 'note'
  | 'system'
  | 'other'

export type OperationalEventTimelineFilterCategory =
  | 'all'
  | 'delay'
  | 'completion'
  | 'reopen'
  | 'block'
  | 'pause'
  | 'note'
  | 'other'

export type OperationalEventSeverity = 'info' | 'warning' | 'success' | 'critical'

export type ConveyorOperationalEventType =
  | 'CONVEYOR_ENTERED_DELAY'
  | 'CONVEYOR_LEFT_DELAY'
  | 'CONVEYOR_STEP_COMPLETED'
  | 'CONVEYOR_STEP_REOPENED'
  | 'CONVEYOR_STEP_BLOCKED'
  | 'CONVEYOR_STEP_UNBLOCKED'
  | 'CONVEYOR_STEP_PAUSED'
  | 'CONVEYOR_STEP_RESUMED'
  | 'MANUAL_NOTE'
  | string

export type ConveyorOperationalEventSource =
  | 'SYSTEM'
  | 'USER_ACTION'
  | 'RECONCILIATION'
  | 'IMPORT'
  | 'ARGOS_PREP'
  | string

export type ConveyorOperationalEvent = {
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

export type ConveyorOperationalEventDisplay = {
  label: string
  description: string
  tone: 'warning' | 'success' | 'neutral'
  chipLabel: string
  category: OperationalEventCategory
  severity: OperationalEventSeverity
}
