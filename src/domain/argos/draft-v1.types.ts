/**
 * Rascunho de esteira — versão 1 (ARGOS → SGP+).
 * Estruturado para entendimento e revisão no SGP+; não é payload de UI nem POST /conveyors.
 */

/** Versão fixa do schema do draft v1. */
export const CONVEYOR_DRAFT_SCHEMA_VERSION_V1 = '1.0.0' as const

export type ConveyorDraftSchemaVersionV1 = typeof CONVEYOR_DRAFT_SCHEMA_VERSION_V1

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
