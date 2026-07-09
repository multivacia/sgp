export type TimeEntryAnalyticalItem = {
  timeEntryId: string
  entryDate: string
  collaboratorName: string
  durationMinutes: number
  executedQuantity?: number | null
  notes?: string | null
  entryMode?: string | null
}

export type TimeEfficiencyStatus =
  | 'SEM_TEMPO_PREVISTO'
  | 'NAO_INICIADA'
  | 'CONCLUIDA_SEM_APONTAMENTO'
  | 'MAIS_RAPIDO'
  | 'DENTRO_DO_PREVISTO'
  | 'LEVE_DESVIO'
  | 'ATENCAO'
  | 'CRITICO'

export type TimeEfficiencyClassification =
  | 'MAIS_RAPIDO'
  | 'DENTRO_DO_PREVISTO'
  | 'LEVE_DESVIO'
  | 'ATENCAO'
  | 'CRITICO'

export type ActivityTimeEfficiency = {
  status: TimeEfficiencyStatus
  isPartial: boolean
  includedInCalculation: boolean
  efficiencyPct: number | null
  deviationMinutes: number | null
  deviationPct: number | null
  classification: TimeEfficiencyClassification | null
}

export type AggregateTimeEfficiency = {
  status: TimeEfficiencyStatus | null
  efficiencyPct: number | null
  deviationMinutes: number | null
  deviationPct: number | null
  classification: TimeEfficiencyClassification | null
  notStartedCount: number
  withoutPlannedTimeCount: number
  completedWithoutTimeCount: number
  partialCount: number
  includedInCalculationCount: number
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
  timeEfficiency: ActivityTimeEfficiency
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
  timeEfficiency: AggregateTimeEfficiency
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
  timeEfficiency: AggregateTimeEfficiency
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
  timeEfficiency: AggregateTimeEfficiency
  tasks: TaskProgressItem[]
}

export type ConveyorProgressResponse = {
  items: ConveyorProgressItem[]
  summary: {
    timeEfficiency: AggregateTimeEfficiency
  }
}

export type ConveyorProgressFetchFilters = {
  search?: string
  operationalStatus?: string
  timeEntryFrom?: string
  timeEntryTo?: string
  collaboratorId?: string
  onlyExceeded?: boolean
}
