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
  plannedQuantity?: number
  sourceOrigin: ConveyorSourceOrigin
  required?: boolean
  /** Identidade estável da atividade (lineage matriz → esteira). Opcional — retrocompat. */
  sourceKey?: string | null
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

export type DocumentReviewAuditDecision = {
  index: number
  extractedServiceDescription: string
  finalDecision:
    | 'ACCEPT_SUGGESTED'
    | 'SELECT_ALTERNATIVE'
    | 'CONFIRM_CREATE_NEW'
    | 'IGNORE_ITEM'
  finalSourceOrigin: ConveyorSourceOrigin
  matchedMatrixNodeId?: string | null
  selectedAlternativeMatrixNodeId?: string | null
  plannedMinutes?: number | null
  confidence?: number | null
  /** R6 S9 — metadados seguros de expansão de subárvore (sem árvore completa). */
  matchedMatrixNodeType?: 'TASK' | 'SECTOR' | 'ACTIVITY' | null
  reusedStructureKind?: 'MATRIX_SUBTREE' | 'MATRIX_ACTIVITY' | null
  expandedSubtree?: boolean
  expandedAreasCount?: number | null
  expandedActivitiesCount?: number | null
  expandedPlannedMinutesTotal?: number | null
  subtreeMaterializationSkippedDuplicate?: boolean
}

export type DocumentReviewAuditPayload = {
  schemaVersion: 'r6_document_review_audit_v1'
  source: {
    provider: string
    documentType: string
    documentNumber?: string
    requestId: string
    correlationId: string
  }
  summary: {
    totalServiceItems: number
    reusedCount: number
    acceptedSimilarCount: number
    selectedAlternativeCount: number
    createNewConfirmedCount: number
    ignoredCount: number
    expandedSubtreeDecisionsCount?: number
    uniqueSubtreeRootsMaterialized?: number
  }
  decisions: DocumentReviewAuditDecision[]
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
  metadata?: {
    documentReviewAudit?: DocumentReviewAuditPayload
  }
  options: CreateConveyorOptionInput[]
}

export type ConveyorOperationalStatus =
  | 'EM_ELABORACAO'
  | 'AGUARDANDO_PLANEJAMENTO'
  | 'EM_PLANEJAMENTO'
  | 'A_INICIAR'
  | 'EM_ANDAMENTO'
  | 'FINALIZADA'
  | 'CANCELADA'

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

export type ConveyorStructureStepAssignee = {
  type: 'COLLABORATOR' | 'TEAM'
  collaboratorId: string | null
  collaboratorName: string | null
  teamId: string | null
  teamName: string | null
  isPrimary: boolean
  orderIndex: number | null
}

export type ConveyorNodeStepOperationalStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'REOPENED'
  | 'ABORTED'

export type ConveyorStructureStep = {
  id: string
  name: string
  orderIndex: number
  plannedMinutes: number | null
  plannedQuantity?: number
  /** Presente no GET detalhe — alocações por etapa. */
  assignees?: ConveyorStructureStepAssignee[]
  operationalStatus: ConveyorNodeStepOperationalStatus
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

/** POST /api/v1/conveyors/:id/structure/items — inclusão tardia multinível (append-only). */
export type StructureAppendKind = 'OPTION' | 'AREA' | 'STEP'

type PostConveyorStructureItemCommon = {
  reason: string
  originType: ConveyorOriginRegister
  matrixRootItemId?: string | null
}

export type PostConveyorStructureItemOptionBody = PostConveyorStructureItemCommon & {
  appendKind?: 'OPTION'
  targetParentNodeId?: null
  option: CreateConveyorOptionInput
}

export type PostConveyorStructureItemAreaBody = PostConveyorStructureItemCommon & {
  appendKind: 'AREA'
  targetParentNodeId: string
  area: CreateConveyorAreaInput
}

export type PostConveyorStructureItemStepBody = PostConveyorStructureItemCommon & {
  appendKind: 'STEP'
  targetParentNodeId: string
  step: CreateConveyorStepInput
}

export type PostConveyorStructureItemBody =
  | PostConveyorStructureItemOptionBody
  | PostConveyorStructureItemAreaBody
  | PostConveyorStructureItemStepBody

/** Corpo do PATCH /api/v1/conveyors/:id/status */
export type PatchConveyorStatusBody = {
  operationalStatus: ConveyorOperationalStatus
}

/** Corpo do POST /api/v1/conveyors/:id/return-to-backlog | return-to-planning */
export type ConveyorReturnBody = {
  reason: string
}

export type ConveyorStepCompletionAction = 'COMPLETE' | 'REOPEN'

/** PATCH /api/v1/conveyors/:conveyorId/steps/:stepNodeId/completion */
export type PatchConveyorStepCompletionBody = {
  action: ConveyorStepCompletionAction
  note?: string
  /** Obrigatório quando a conclusão está fora da sequência recomendada (S3). */
  outOfSequenceJustification?: string
  justificationId?: string
  justificationComplement?: string
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
