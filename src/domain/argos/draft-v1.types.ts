/**
 * Rascunho de esteira — versão 1 (ARGOS → SGP+).
 * Estruturado para entendimento e revisão no SGP+; não é payload de UI nem POST /conveyors.
 */

/** Versão fixa do schema do draft v1. */
export const CONVEYOR_DRAFT_SCHEMA_VERSION_V1 = '1.0.0' as const
export const CONVEYOR_DRAFT_SCHEMA_VERSION_V11 = '1.1.0' as const

export type ConveyorDraftSchemaVersionV1 = typeof CONVEYOR_DRAFT_SCHEMA_VERSION_V1
export type ConveyorDraftSchemaVersionV11 = typeof CONVEYOR_DRAFT_SCHEMA_VERSION_V11

/**
 * Campos operacionais sugeridos a partir do documento (texto livre onde aplicável).
 * O SGP+ valida, enriquece e persiste — não são obrigatoriamente finais.
 */
export type ConveyorDraftV1SuggestedDados = {
  title?: string
  clientName?: string
  vehicleDescription?: string
  modelVersion?: string
  licensePlate?: string
  notes?: string
  /** Referência opaca a colaborador no domínio SGP+ (se inferida). */
  suggestedResponsibleCollaboratorId?: string
  estimatedDeadline?: string
  priorityHint?: 'alta' | 'media' | 'baixa'
}

/**
 * Passo proposto na estrutura (sem IDs de persistência SGP+).
 */
export type ConveyorDraftV1Step = {
  orderIndex: number
  title: string
  plannedMinutes?: number
  /** Confiança 0–1 opcional ao nível do passo. */
  confidence?: number
}

/**
 * Área (agrupamento) dentro de uma opção.
 */
export type ConveyorDraftV1Area = {
  orderIndex: number
  title: string
  steps: ConveyorDraftV1Step[]
}

/**
 * Opção de alto nível (equivalente a um ramo de composição de esteira).
 */
export type ConveyorDraftV1Option = {
  orderIndex: number
  title: string
  areas: ConveyorDraftV1Area[]
}

/**
 * Draft v1 entregue pelo ARGOS.
 * `schemaVersion` deve ser exatamente {@link CONVEYOR_DRAFT_SCHEMA_VERSION_V1}.
 */
export type ConveyorDraftV1 = {
  schemaVersion: ConveyorDraftSchemaVersionV1
  suggestedDados: ConveyorDraftV1SuggestedDados
  /**
   * Estrutura proposta. Lista vazio = ARGOS não propôs árvore (apenas factos/dados).
   */
  options: ConveyorDraftV1Option[]
  /**
   * Extensão futura sem alterar o núcleo v1.
   */
  extensions?: Record<string, unknown>
}

export type ArgosSuggestedMatchAction =
  | 'REUSE_EXISTING'
  | 'REVIEW_SIMILAR'
  | 'CREATE_NEW'
  | 'IGNORE'

export type ArgosRedactionCategoryV11 =
  | 'cpf_cnpj'
  | 'rg_ie'
  | 'address'
  | 'phone'
  | 'email'
  | 'customer_name'
  | 'pricing'
  | 'payment_terms'
  | 'discount'
  | 'totals'

export type ArgosSourceDocumentV11 = {
  provider: 'BRAVO' | string
  documentType: 'OS_OR_BUDGET' | string
  documentNumber?: string
  issuedAt?: string
  receivedAt?: string
  entryDate?: string
}

export type ArgosOperationalContextV11 = {
  vehicle?: {
    model?: string
    year?: number
    color?: string
  }
  maskedIdentifiers?: {
    customerNameMasked?: string
    licensePlateMasked?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type ArgosServiceItemV11 = {
  id?: string
  description: string
  confidence?: number
  [key: string]: unknown
}

export type ArgosPartItemV11 = {
  id?: string
  description: string
  quantity?: number
  confidence?: number
  [key: string]: unknown
}

export type ArgosExtractedItemsV11 = {
  serviceItems: ArgosServiceItemV11[]
  partItems: ArgosPartItemV11[]
  operationalNotes: string[]
}

export type ArgosRedactionV11 = {
  personalDataRemoved: boolean
  financialDataRemoved: boolean
  removedCategories: ArgosRedactionCategoryV11[]
}

/** R6 S9 — subárvore materializável (sem dados sensíveis; sem peças/financeiro). */
export type ArgosMatrixSubtreeActivityV11 = {
  matrixNodeId: string
  title: string
  orderIndex: number
  plannedMinutes: number
  defaultResponsibleId?: string
  defaultResponsibleName?: string
  teamId?: string
  teamName?: string
  /** S9.4 — times da atividade na Matriz (múltiplos; `teamId`/`teamName` = primeiro, retrocompat). */
  teamAssignments?: Array<{ teamId: string; teamName?: string }>
}

export type ArgosMatrixSubtreeAreaV11 = {
  matrixNodeId: string
  title: string
  orderIndex: number
  plannedMinutes?: number
  activities: ArgosMatrixSubtreeActivityV11[]
}

export type ArgosMatrixSubtreeV11 = {
  rootNodeId: string
  rootNodeType: 'TASK' | 'SECTOR'
  rootTitle: string
  totalAreas: number
  totalActivities: number
  totalPlannedMinutes: number
  subtreeTruncated?: boolean
  subtreeWarning?: string
  areas: ArgosMatrixSubtreeAreaV11[]
}

export type ArgosAlternativeMatrixCandidateV11 = {
  matrixNodeId: string
  nodeType?: 'TASK' | 'SECTOR' | 'ACTIVITY'
  kind?: 'MATRIX_SUBTREE' | 'MATRIX_ACTIVITY'
  activity: string
  sector?: string
  step?: string
  plannedMinutes?: number
  confidence: number
  matchReason: string
  teamName?: string
  collaboratorName?: string
  matrixSubtree?: ArgosMatrixSubtreeV11
}

export type ArgosMatchingPlanItemV11 = {
  extractedServiceDescription: string
  suggestedAction: ArgosSuggestedMatchAction
  confidence?: number
  matchReason?: string
  matchedMatrixNodeId?: string
  matchedMatrixNodeType?: 'TASK' | 'SECTOR' | 'ACTIVITY'
  matchedConveyorNodeId?: string
  alternativeCandidates?: ArgosAlternativeMatrixCandidateV11[]
  reusedStructure?: {
    kind?: 'MATRIX_SUBTREE' | 'MATRIX_ACTIVITY'
    option?: string
    area?: string
    step?: string
    sector?: string
    activity?: string
    plannedMinutes?: number
    teamId?: string
    teamName?: string
    collaboratorId?: string
    collaboratorName?: string
    isPrimary?: boolean
  }
  subtreeSummary?: {
    rootNodeType: 'TASK' | 'SECTOR' | 'ACTIVITY'
    totalAreas: number
    totalActivities: number
    totalPlannedMinutes: number
    previewActivities?: string[]
  }
  matrixSubtree?: ArgosMatrixSubtreeV11
  [key: string]: unknown
}

export type ConveyorDraftV11 = {
  schemaVersion: ConveyorDraftSchemaVersionV11
  suggestedDados: ConveyorDraftV1SuggestedDados
  options: ConveyorDraftV1Option[]
  warnings: {
    category: string
    code: string
    message?: string
    fieldPath?: string
    confidence?: number
    [key: string]: unknown
  }[]
  humanReviewRequired: true
  extensions?: Record<string, unknown>
}

export type ConveyorDraft = ConveyorDraftV1 | ConveyorDraftV11
