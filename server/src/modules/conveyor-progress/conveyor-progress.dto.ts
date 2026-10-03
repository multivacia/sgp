import type {
  TimeEfficiencyStatus,
  WeightedTimeEfficiencySummary,
} from '../../shared/conveyorProgressMetrics.js'

export type TimeEntryAnalyticalItemDto = {
  timeEntryId: string
  entryDate: string
  collaboratorName: string
  durationMinutes: number
  executedQuantity?: number | null
  notes?: string | null
  entryMode?: string | null
}

export type ActivityTimeEfficiencyDto = {
  status: TimeEfficiencyStatus
  isPartial: boolean
  includedInCalculation: boolean
  efficiencyPct: number | null
  deviationMinutes: number | null
  deviationPct: number | null
}

export type AggregateTimeEfficiencyDto = WeightedTimeEfficiencySummary

export type ActivityProgressItemDto = {
  activityId: string
  activityName: string
  status: string
  collaboratorName?: string | null
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
  timeEfficiency: ActivityTimeEfficiencyDto
  timeEntries: TimeEntryAnalyticalItemDto[]
}

export type SectorProgressItemDto = {
  sectorId: string
  sectorName: string
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
  timeEfficiency: AggregateTimeEfficiencyDto
  activities: ActivityProgressItemDto[]
}

export type TaskProgressItemDto = {
  taskId: string
  taskName: string
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
  timeEfficiency: AggregateTimeEfficiencyDto
  sectors: SectorProgressItemDto[]
}

export type ConveyorProgressItemDto = {
  conveyorId: string
  conveyorCode?: string | null
  conveyorName: string
  operationalStatus: string
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
  timeEfficiency: AggregateTimeEfficiencyDto
  tasks: TaskProgressItemDto[]
}

export type ConveyorProgressResponseDto = {
  items: ConveyorProgressItemDto[]
  summary: {
    timeEfficiency: AggregateTimeEfficiencyDto
  }
}
