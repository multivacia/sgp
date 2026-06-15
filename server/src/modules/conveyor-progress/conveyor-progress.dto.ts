export type TimeEntryAnalyticalItemDto = {
  timeEntryId: string
  entryDate: string
  collaboratorName: string
  durationMinutes: number
  executedQuantity?: number | null
  notes?: string | null
  entryMode?: string | null
}

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
  tasks: TaskProgressItemDto[]
}

export type ConveyorProgressResponseDto = {
  items: ConveyorProgressItemDto[]
}
