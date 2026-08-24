export type ConveyorOperationalStatusApi =
  | 'EM_ELABORACAO'
  | 'AGUARDANDO_PLANEJAMENTO'
  | 'EM_PLANEJAMENTO'
  | 'A_INICIAR'
  | 'EM_ANDAMENTO'
  | 'FINALIZADA'
  | 'CANCELADA'

export type ConveyorCreatedApi = {
  id: string
  code: string | null
  name: string
  priority: 'alta' | 'media' | 'baixa'
  originRegister: 'MANUAL' | 'BASE' | 'HYBRID'
  operationalStatus: ConveyorOperationalStatusApi
  totals: {
    totalOptions: number
    totalAreas: number
    totalSteps: number
    totalPlannedMinutes: number
  }
  createdAt: string
}

export type ConveyorListItemApi = {
  id: string
  code: string | null
  name: string
  clientName: string | null
  responsible: string | null
  priority: 'alta' | 'media' | 'baixa'
  originRegister: 'MANUAL' | 'BASE' | 'HYBRID'
  createdAt: string
  operationalStatus: ConveyorOperationalStatusApi
  completedAt: string | null
  /** Prazo estimado ao nível da esteira (texto livre / ISO) — painel operacional e atraso. */
  estimatedDeadline: string | null
  totalSteps: number
}

export type ConveyorStructureStepAssigneeApi = {
  type: 'COLLABORATOR' | 'TEAM'
  collaboratorId: string | null
  collaboratorName: string | null
  teamId: string | null
  teamName: string | null
  isPrimary: boolean
  orderIndex: number | null
}

export type ConveyorNodeStepOperationalStatusApi =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'REOPENED'
  | 'ABORTED'

export type ConveyorStructureStepApi = {
  id: string
  name: string
  orderIndex: number
  plannedMinutes: number | null
  plannedQuantity?: number
  assignees: ConveyorStructureStepAssigneeApi[]
  operationalStatus: ConveyorNodeStepOperationalStatusApi
  isCompleted: boolean
  completedAt: string | null
  completedByName: string | null
  completionEventId: string | null
  abortedAt?: string | null
  abortedByName?: string | null
  abortReasonCode?: string | null
  abortReasonText?: string | null
  abortReasonLabelSnapshot?: string | null
}

export type ConveyorStructureAreaApi = {
  id: string
  name: string
  orderIndex: number
  steps: ConveyorStructureStepApi[]
}

export type ConveyorStructureOptionApi = {
  id: string
  name: string
  orderIndex: number
  areas: ConveyorStructureAreaApi[]
}

export type ConveyorStructureApi = {
  options: ConveyorStructureOptionApi[]
}

/** GET /api/v1/conveyors/:id — registo ativo (deleted_at IS NULL). */
export type ConveyorDetailApi = {
  id: string
  code: string | null
  name: string
  clientName: string | null
  vehicle: string | null
  modelVersion: string | null
  plate: string | null
  initialNotes: string | null
  responsible: string | null
  priority: 'alta' | 'media' | 'baixa'
  originRegister: 'MANUAL' | 'BASE' | 'HYBRID'
  /** Snapshot histórico da base (quando aplicável). */
  baseRefSnapshot: string | null
  baseCodeSnapshot: string | null
  baseNameSnapshot: string | null
  baseVersionSnapshot: number | null
  /** Item raiz da matriz operacional (metadata_json), quando existir. */
  matrixRootItemId: string | null
  operationalStatus: ConveyorOperationalStatusApi
  createdAt: string
  completedAt: string | null
  estimatedDeadline: string | null
  totalOptions: number
  totalAreas: number
  totalSteps: number
  totalPlannedMinutes: number
  structure: ConveyorStructureApi
}
