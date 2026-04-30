export type ConveyorOperationalEventType =
  | 'CONVEYOR_ENTERED_DELAY'
  | 'CONVEYOR_LEFT_DELAY'
  | 'CONVEYOR_STEP_COMPLETED'
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
}

