import type { OperationalBucket } from '../../shared/operationalBucket.js'
import type { MyActivityItemApi } from '../my-activities/my-activities.dto.js'

export type OperationalJourneyTimeEntryApi = {
  id: string
  conveyorId: string
  conveyorName: string
  stepNodeId: string
  stepName: string
  minutes: number
  entryAt: string
  notes: string | null
}

export type PendenciaTempoItemApi = {
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

export type OperationalJourneyApi = {
  meta: {
    semanticsVersion: '1.5'
  }
  collaborator: { id: string; fullName: string | null }
  period: { from: string; to: string }
  query: {
    limit: number
    conveyorId: string | null
    periodPreset: '7d' | '15d' | '30d' | 'month' | 'custom'
  }
  load: {
    assignmentCount: number
    /** Previsto estrutural: soma de planned_minutes nos STEPs alocados (escopo). */
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
  assignmentsOpen: MyActivityItemApi[]
  assignmentsAtRisk: MyActivityItemApi[]
  recentTimeEntries: OperationalJourneyTimeEntryApi[]
}
