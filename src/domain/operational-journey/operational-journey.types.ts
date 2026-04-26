import type { MyActivityItem } from '../my-activities/my-activities.types'

export type OperationalJourneyTimeEntry = {
  id: string
  conveyorId: string
  conveyorName: string
  stepNodeId: string
  stepName: string
  minutes: number
  entryAt: string
  notes: string | null
}

export type PendenciaTempoItem = {
  assigneeId: string
  conveyorId: string
  conveyorName: string
  stepNodeId: string
  stepName: string
  areaName: string
  optionName: string
  plannedMinutes: number | null
  realizedMinutes: number | null
  gapMinutes: number
}

export type OperationalPeriodPreset =
  | '7d'
  | '15d'
  | '30d'
  | 'month'
  | 'custom'

export type OperationalJourneyData = {
  meta: { semanticsVersion: '1.5' }
  collaborator: { id: string; fullName: string | null }
  period: { from: string; to: string }
  query: {
    limit: number
    conveyorId: string | null
    periodPreset: OperationalPeriodPreset
  }
  load: {
    assignmentCount: number
    plannedMinutesOnStepsSum: number
  }
  coberturaTempo: {
    ratio: number | null
    previstoMinutosEscopo: number
    realizadoMinutosAcumuladoEscopo: number
    formula: string
  }
  execution: {
    realizedMinutesInPeriod: number
    realizedMinutesTotal: number
  }
  risk: {
    byBucket: Record<MyActivityItem['operationalBucket'], number>
    overdueCount: number
  }
  signals: {
    pressaoAtrasoAlocacoes: number
    pendenciaTempo: {
      count: number
      items: PendenciaTempoItem[]
    }
  }
  assignmentsOpen: MyActivityItem[]
  assignmentsAtRisk: MyActivityItem[]
  recentTimeEntries: OperationalJourneyTimeEntry[]
}
