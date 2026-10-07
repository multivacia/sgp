import type { MyActivityItem } from '../my-activities/my-activities.types'

export type OperationalJourneyCollaborator = {
  id: string
  fullName: string | null
}

/**
 * Alocação da jornada + identificação do colaborador. Os campos de colaborador são
 * opcionais para tolerar respostas de versões anteriores da API.
 */
export type OperationalJourneyAssignment = MyActivityItem & {
  collaboratorId?: string
  collaboratorName?: string | null
}

export type OperationalJourneyTimeEntry = {
  id: string
  collaboratorId?: string
  collaboratorName?: string | null
  conveyorId: string
  conveyorName: string
  stepNodeId: string
  stepName: string
  minutes: number
  entryAt: string
  notes: string | null
  entryOrigin?: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exceptionJustification?: string | null
  isOutOfSequence?: boolean
  outOfSequenceJustification?: string | null
  /** Justificativa padronizada (catálogo) — inclui a voluntária de apontamento normal. */
  standardJustificationLabel?: string | null
  standardJustificationComplement?: string | null
}

/** Lançamento Extra Esteira (tempo fora de esteira) no período da jornada. */
export type OperationalJourneyExtraTimeEntry = {
  id: string
  collaboratorId: string
  collaboratorName: string | null
  /** Data de trabalho `YYYY-MM-DD` (dia civil de São Paulo). */
  entryDate: string
  minutes: number
  description: string
  notes: string | null
  origin: 'WEB' | 'PRODUCTION'
}

export type PendenciaTempoItem = {
  assigneeId: string
  collaboratorId?: string
  collaboratorName?: string | null
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
  /** Primeiro colaborador do escopo — compatibilidade com a jornada de 1 colaborador. */
  collaborator: { id: string; fullName: string | null }
  /** Escopo consolidado: 1..N colaboradores, na ordem solicitada. */
  collaborators?: OperationalJourneyCollaborator[]
  period: { from: string; to: string }
  query: {
    limit: number
    conveyorId: string | null
    periodPreset: OperationalPeriodPreset
    collaboratorIds?: string[]
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
  extraTimeEntriesSummary: {
    totalMinutes: number
    entriesCount: number
    topDescriptions: Array<{
      descriptionId: string
      description: string
      totalMinutes: number
      entriesCount: number
    }>
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
  assignmentsOpen: OperationalJourneyAssignment[]
  assignmentsAtRisk: OperationalJourneyAssignment[]
  recentTimeEntries: OperationalJourneyTimeEntry[]
  /** Ausente em respostas antigas — tratar como lista vazia. */
  recentExtraTimeEntries?: OperationalJourneyExtraTimeEntry[]
}
