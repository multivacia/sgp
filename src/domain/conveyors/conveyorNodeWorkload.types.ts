import type { OperationalBucket } from '../../lib/backlog/operationalBuckets'

export type ConveyorNodeWorkloadStep = {
  optionId: string
  optionName: string
  areaId: string
  areaName: string
  stepId: string
  stepName: string
  plannedMinutes: number | null
  realizedMinutes: number
  pendingMinutes: number
}

export type ConveyorNodeWorkloadArea = {
  optionId: string
  optionName: string
  areaId: string
  areaName: string
  plannedMinutesSum: number
  realizedMinutesSum: number
  pendingMinutesSum: number
}

export type ConveyorNodeWorkloadConveyorContext = {
  operationalBucket: OperationalBucket
  isOverdueContext: boolean
}

export type ConveyorNodeWorkload = {
  semanticsVersion: '1.5'
  conveyorId: string
  conveyor: ConveyorNodeWorkloadConveyorContext
  steps: ConveyorNodeWorkloadStep[]
  areas: ConveyorNodeWorkloadArea[]
  notes: string
}
