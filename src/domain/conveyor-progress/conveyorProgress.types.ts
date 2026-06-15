export type TimeEntryAnalyticalItem = {
  timeEntryId: string
  entryDate: string
  collaboratorName: string
  durationMinutes: number
  executedQuantity?: number | null
  notes?: string | null
  entryMode?: string | null
}

export type ActivityProgressItem = {
  activityId: string
  activityName: string
  status: string
  collaboratorName?: string | null
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
  timeEntries: TimeEntryAnalyticalItem[]
}

export type SectorProgressItem = {
  sectorId: string
  sectorName: string
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
  activities: ActivityProgressItem[]
}

export type TaskProgressItem = {
  taskId: string
  taskName: string
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
  sectors: SectorProgressItem[]
}

export type ConveyorProgressItem = {
  conveyorId: string
  conveyorCode?: string | null
  conveyorName: string
  operationalStatus: string
  plannedMinutes: number
  realizedMinutes: number
  remainingMinutes: number
  exceededMinutes: number
  progressPercent: number
  tasks: TaskProgressItem[]
}

export type ConveyorProgressResponse = {
  items: ConveyorProgressItem[]
}

export type ConveyorProgressFetchFilters = {
  search?: string
  operationalStatus?: string
  timeEntryFrom?: string
  timeEntryTo?: string
  collaboratorId?: string
  onlyExceeded?: boolean
}
