/**
 * Contrato do POST /api/v1/conveyors — alinhado ao backend (Zod `postConveyorBodySchema`).
 */

export type ConveyorSourceOrigin = 'manual' | 'reaproveitada' | 'base'

export type ConveyorPriority = 'alta' | 'media' | 'baixa'

export type ConveyorOriginRegister = 'MANUAL' | 'BASE' | 'HYBRID'

export type CreateConveyorDados = {
  nome: string
  cliente?: string
  veiculo?: string
  modeloVersao?: string
  placa?: string
  observacoes?: string
  responsavel?: string
  prazoEstimado?: string
  prioridade?: ConveyorPriority | ''
  colaboradorId?: string | null
}

/** Alocação por etapa no POST /api/v1/conveyors — persistida em `conveyor_node_assignees`. */
export type CreateConveyorStepAssigneeInput = {
  /** Retrocompat: ausente => COLLABORATOR no backend. */
  type?: 'COLLABORATOR' | 'TEAM'
  collaboratorId?: string | null
  teamId?: string | null
  isPrimary: boolean
  assignmentOrigin?: 'manual' | 'base' | 'reaproveitada'
  orderIndex?: number
}

export type CreateConveyorStepInput = {
  titulo: string
  orderIndex: number
  plannedMinutes: number
  sourceOrigin: ConveyorSourceOrigin
  required?: boolean
  /** Se não vazio, deve haver exatamente um `isPrimary: true` (validação no servidor). */
  assignees?: CreateConveyorStepAssigneeInput[]
}

export type CreateConveyorAreaInput = {
  titulo: string
  orderIndex: number
  sourceOrigin: ConveyorSourceOrigin
  steps: CreateConveyorStepInput[]
}

export type CreateConveyorOptionInput = {
  titulo: string
  orderIndex: number
  sourceOrigin: ConveyorSourceOrigin
  areas: CreateConveyorAreaInput[]
}

/** Corpo JSON do POST /api/v1/conveyors */
export type CreateConveyorInput = {
  dados: CreateConveyorDados
  originType: ConveyorOriginRegister
  baseId?: string | null
  baseCode?: string | null
  baseName?: string | null
  baseVersion?: number | null
  /** Item raiz (ITEM) da matriz operacional usada na materialização. */
  matrixRootItemId?: string | null
  options: CreateConveyorOptionInput[]
}

export type ConveyorOperationalStatus =
  | 'NO_BACKLOG'
  | 'EM_REVISAO'
  | 'PRONTA_LIBERAR'
  | 'EM_PRODUCAO'
  | 'CONCLUIDA'

/** Envelope `data` da resposta 201 — alinhado a `ConveyorCreatedApi` no servidor */
export type ConveyorCreatedSummary = {
  id: string
  code: string | null
  name: string
  priority: ConveyorPriority
  originRegister: ConveyorOriginRegister
  operationalStatus: ConveyorOperationalStatus
  totals: {
    totalOptions: number
    totalAreas: number
    totalSteps: number
    totalPlannedMinutes: number
  }
  createdAt: string
}

export type ConveyorStructureStep = {
  id: string
  name: string
  orderIndex: number
  plannedMinutes: number | null
}

export type ConveyorStructureArea = {
  id: string
  name: string
  orderIndex: number
  steps: ConveyorStructureStep[]
}

export type ConveyorStructureOption = {
  id: string
  name: string
  orderIndex: number
  areas: ConveyorStructureArea[]
}

export type ConveyorStructure = {
  options: ConveyorStructureOption[]
}

/** Resposta do GET /api/v1/conveyors/:id (esteira ativa). */
export type ConveyorDetail = {
  id: string
  code: string | null
  name: string
  clientName: string | null
  vehicle: string | null
  modelVersion: string | null
  plate: string | null
  initialNotes: string | null
  responsible: string | null
  priority: ConveyorPriority
  originRegister: ConveyorOriginRegister
  /** Snapshot da base no registo (quando aplicável). */
  baseRefSnapshot?: string | null
  baseCodeSnapshot?: string | null
  baseNameSnapshot?: string | null
  baseVersionSnapshot?: number | null
  /** Item raiz da matriz (metadata), quando existir. */
  matrixRootItemId?: string | null
  operationalStatus: ConveyorOperationalStatus
  createdAt: string
  completedAt: string | null
  estimatedDeadline: string | null
  totalOptions: number
  totalAreas: number
  totalSteps: number
  totalPlannedMinutes: number
  structure: ConveyorStructure
}

/** PATCH /api/v1/conveyors/:id — campos opcionais (≥1). */
export type PatchConveyorDadosBody = Partial<CreateConveyorDados>

/** PATCH /api/v1/conveyors/:id/structure — substitui árvore (regras no servidor). */
export type PatchConveyorStructureBody = {
  originType: ConveyorOriginRegister
  baseId?: string | null
  baseCode?: string | null
  baseName?: string | null
  baseVersion?: number | null
  matrixRootItemId?: string | null
  options: CreateConveyorOptionInput[]
}

/** Corpo do PATCH /api/v1/conveyors/:id/status */
export type PatchConveyorStatusBody = {
  operationalStatus: ConveyorOperationalStatus
}

/** Item do GET /api/v1/conveyors */
export type ConveyorListItem = {
  id: string
  code: string | null
  name: string
  clientName: string | null
  responsible: string | null
  priority: ConveyorPriority
  originRegister: ConveyorOriginRegister
  createdAt: string
  operationalStatus: ConveyorOperationalStatus
  completedAt: string | null
  /** Prazo estimado (esteira) — usado no painel operacional / atraso. */
  estimatedDeadline: string | null
  totalSteps: number
}

export type ListConveyorsQuery = {
  q?: string
  priority?: ConveyorPriority
  responsible?: string
  operationalStatus?: ConveyorOperationalStatus
}
