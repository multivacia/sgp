import type { OperationalBucket } from '../../shared/operationalBucket.js'

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
