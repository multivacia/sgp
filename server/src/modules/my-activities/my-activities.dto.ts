import type { OperationalBucket } from '../../shared/operationalBucket.js'

export type TimeEntryCandidatePreviousOpenApi = {
  taskTitle: string
  sectorTitle: string
  activityTitle: string
}

/** Item de GET /api/v1/me/time-entry-candidates — atividades ainda apontáveis. */
export type TimeEntryCandidateItemApi = {
  conveyorId: string
  conveyorCode: string | null
  conveyorName: string
  clientName: string | null
  vehicleLabel: string | null
  plate: string | null
  stepNodeId: string
  stepName: string
  /** Mesmo que `stepName` — terminologia Atividade. */
  activityTitle: string
  /** Nó OPTION (Tarefa). */
  taskTitle?: string
  areaName: string
  /** Mesmo que `areaName` — terminologia Setor. */
  sectorTitle: string
  roleInStep: 'primary' | 'support'
  assignmentType: 'COLLABORATOR' | 'TEAM'
  plannedMinutes: number | null
  realizedMinutes: number
  pendingMinutes: number
  isAssignedToMe: boolean
  /** S2: exceção sem alocação. */
  requiresJustification: boolean
  /** S3: execução fora da sequência recomendada. */
  isOutOfSequence: boolean
  requiresOutOfSequenceJustification: boolean
  previousOpenCount: number
  previousOpenActivities: TimeEntryCandidatePreviousOpenApi[]
}

/** Item de GET /api/v1/my-activities — alocação real em STEP + contexto da esteira. */
export type MyActivityItemApi = {
  assigneeId: string
  conveyorId: string
  conveyorCode: string | null
  conveyorName: string
  conveyorStatus: string
  /** Prazo da esteira (string livre / ISO), quando existir. */
  estimatedDeadline: string | null
  /**
   * Bucket operacional alinhado ao Painel Operacional de Esteiras
   * (`src/lib/backlog/operationalBuckets.ts`).
   */
  operationalBucket: OperationalBucket
  stepNodeId: string
  stepName: string
  optionName: string
  areaName: string
  roleInStep: 'primary' | 'support'
  plannedMinutes: number | null
  /** Soma real em `conveyor_time_entries` para este STEP + colaborador; `null` se ainda não houver apontamentos. */
  realizedMinutes: number | null
}
