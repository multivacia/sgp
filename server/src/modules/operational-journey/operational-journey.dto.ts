import type { OperationalBucket } from '../../shared/operationalBucket.js'
import type { MyActivityItemApi } from '../my-activities/my-activities.dto.js'

/** Identificação do colaborador dono de cada registro do escopo consolidado. */
export type OperationalJourneyCollaboratorApi = {
  id: string
  fullName: string | null
}

/** Alocação do escopo + identificação do colaborador a que pertence. */
export type OperationalJourneyAssignmentApi = MyActivityItemApi & {
  collaboratorId: string
  collaboratorName: string | null
}

export type OperationalJourneyTimeEntryApi = {
  id: string
  collaboratorId: string
  collaboratorName: string | null
  conveyorId: string
  conveyorName: string
  stepNodeId: string
  stepName: string
  minutes: number
  entryAt: string
  notes: string | null
  entryOrigin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exceptionJustification: string | null
  isOutOfSequence: boolean
  outOfSequenceJustification: string | null
}

export type PendenciaTempoItemApi = {
  assigneeId: string
  collaboratorId: string
  collaboratorName: string | null
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

export type OperationalJourneyExtraTimeEntryTopDescriptionApi = {
  descriptionId: string
  description: string
  totalMinutes: number
  entriesCount: number
}

export type OperationalJourneyApi = {
  meta: {
    semanticsVersion: '1.5'
  }
  /** Primeiro colaborador do escopo — mantido para compatibilidade (1 colaborador). */
  collaborator: { id: string; fullName: string | null }
  /** Escopo completo: 1..N colaboradores, na ordem solicitada. */
  collaborators: OperationalJourneyCollaboratorApi[]
  period: { from: string; to: string }
  query: {
    limit: number
    conveyorId: string | null
    periodPreset: '7d' | '15d' | '30d' | 'month' | 'custom'
    collaboratorIds: string[]
  }
  load: {
    /** Alocações do escopo (uma por colaborador × STEP; nunca o mesmo registro duas vezes). */
    assignmentCount: number
    /**
     * Previsto estrutural: soma do tempo unitário × quantidade dos STEPs alocados.
     * Com vários colaboradores no mesmo STEP, o previsto do STEP entra uma única vez.
     */
    plannedMinutesOnStepsSum: number
  }
  /** Cobertura de tempo: realizado acumulado nos mesmos STEPs / previsto estrutural do escopo. */
  coberturaTempo: {
    ratio: number | null
    previstoMinutosEscopo: number
    realizadoMinutosAcumuladoEscopo: number
    formula: string
  }
  execution: {
    /** Minutos apontados (período) — intervalo em `period`. */
    realizedMinutesInPeriod: number
    /** Minutos apontados (acumulado) no escopo (colaborador ± esteira). */
    realizedMinutesTotal: number
  }
  extraTimeEntriesSummary: {
    totalMinutes: number
    entriesCount: number
    topDescriptions: OperationalJourneyExtraTimeEntryTopDescriptionApi[]
  }
  risk: {
    byBucket: Record<OperationalBucket, number>
    /** Contagem de alocações no bucket em_atraso (sinal de pressão de atraso). */
    overdueCount: number
  }
  signals: {
    /** Mesmo valor que contagem em_atraso em `risk.byBucket` — etiqueta operacional. */
    pressaoAtrasoAlocacoes: number
    pendenciaTempo: {
      count: number
      items: PendenciaTempoItemApi[]
    }
  }
  assignmentsOpen: OperationalJourneyAssignmentApi[]
  assignmentsAtRisk: OperationalJourneyAssignmentApi[]
  recentTimeEntries: OperationalJourneyTimeEntryApi[]
}
