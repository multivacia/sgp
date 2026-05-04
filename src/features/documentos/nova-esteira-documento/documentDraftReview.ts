import type {
  ArgosMatchingPlanItemV11,
  ArgosRedactionCategoryV11,
} from '../../../domain/argos/draft-v1.types'
import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'

export type DraftReviewTone = 'success' | 'warning' | 'neutral' | 'danger'

export type MatchingPlanEntry = {
  item: ArgosMatchingPlanItemV11
  /** Índice na ordem original de `ingest.matchingPlan` (alinha 1:1 com etapas do draft editável). */
  globalIndex: number
  itemKey: string
}

export type DocumentDraftReviewModel = {
  sourceSummary: {
    provider?: string
    documentType?: string
    documentNumber?: string
    status: ArgosDocumentIngestResult['status']
    confidencePercent?: string
  }
  vehicleSummary: {
    model?: string
    year?: number
    color?: string
    maskedPlate?: string
  }
  redactionSummary: {
    personalDataRemoved: boolean
    financialDataRemoved: boolean
    removedCategories: Array<{ code: ArgosRedactionCategoryV11; label: string }>
  } | null
  serviceItems: NonNullable<ArgosDocumentIngestResult['extractedItems']>['serviceItems']
  /** TD7: sempre vazio na UI — peças não fazem parte do fluxo operacional do SGP. */
  partItems: NonNullable<ArgosDocumentIngestResult['extractedItems']>['partItems']
  /** Contagem vinda do servidor (itens suprimidos); apenas para mensagem de governação, sem listagem. */
  partsExcludedFromOperationalUiCount: number
  operationalNotes: string[]
  /** Ordem estável do plano de matching (uma entrada por item). */
  matchingPlanEntries: MatchingPlanEntry[]
  matchingGroups: {
    reuseExisting: ArgosMatchingPlanItemV11[]
    reviewSimilar: ArgosMatchingPlanItemV11[]
    createNew: ArgosMatchingPlanItemV11[]
    ignored: ArgosMatchingPlanItemV11[]
  }
  counters: {
    totalServices: number
    totalParts: number
    totalReuseExisting: number
    totalReviewSimilar: number
    totalCreateNew: number
    totalIgnored: number
    hasReviewRequiredItems: boolean
  }
}

/** CREATE_NEW não tem sugestão principal da Matriz — ocultar “Aceitar sugestão” na revisão (R6 S9.1). */
export function shouldShowAcceptSuggestedButton(item: ArgosMatchingPlanItemV11): boolean {
  return item.suggestedAction !== 'CREATE_NEW'
}

export function buildReviewItemKey(
  item: ArgosMatchingPlanItemV11,
  globalIndex: number,
): string {
  return [
    item.suggestedAction,
    item.extractedServiceDescription.trim().toLowerCase(),
    item.matchedMatrixNodeId ?? 'no-matrix',
    item.matchedConveyorNodeId ?? 'no-conveyor',
    `i:${globalIndex}`,
  ].join('|')
}

const REDACTION_LABELS: Record<ArgosRedactionCategoryV11, string> = {
  cpf_cnpj: 'CPF/CNPJ',
  rg_ie: 'RG/I.E.',
  address: 'Endereço',
  phone: 'Telefone',
  email: 'E-mail',
  customer_name: 'Nome do cliente',
  pricing: 'Preços/valores',
  payment_terms: 'Pagamento',
  discount: 'Descontos',
  totals: 'Totais',
}

export function isDraftV11Result(result: ArgosDocumentIngestResult): boolean {
  return result.draft?.schemaVersion === '1.1.0'
}

export function formatConfidencePercent(confidence?: number | null): string | undefined {
  if (typeof confidence !== 'number') return undefined
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`
}

export function formatPlannedMinutes(minutes?: number): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
    return 'Não informado'
  }
  return `${Math.round(minutes)} min`
}

export function getSuggestedActionLabel(
  action: ArgosMatchingPlanItemV11['suggestedAction'],
): string {
  if (action === 'REUSE_EXISTING') return 'Reaproveitar da Matriz'
  if (action === 'REVIEW_SIMILAR') return 'Revisar similaridade'
  if (action === 'CREATE_NEW') return 'Nova atividade sugerida'
  return 'Ignorar'
}

export function getSuggestedActionTone(
  action: ArgosMatchingPlanItemV11['suggestedAction'],
): DraftReviewTone {
  if (action === 'REUSE_EXISTING') return 'success'
  if (action === 'REVIEW_SIMILAR') return 'warning'
  if (action === 'CREATE_NEW') return 'danger'
  return 'neutral'
}

export function groupMatchingPlanByAction(
  matchingPlan: ArgosDocumentIngestResult['matchingPlan'],
): DocumentDraftReviewModel['matchingGroups'] {
  const items = matchingPlan ?? []
  return {
    reuseExisting: items.filter((item) => item.suggestedAction === 'REUSE_EXISTING'),
    reviewSimilar: items.filter((item) => item.suggestedAction === 'REVIEW_SIMILAR'),
    createNew: items.filter((item) => item.suggestedAction === 'CREATE_NEW'),
    ignored: items.filter((item) => item.suggestedAction === 'IGNORE'),
  }
}

export function buildDocumentDraftReviewModel(
  result: ArgosDocumentIngestResult,
): DocumentDraftReviewModel {
  const planItems = result.matchingPlan ?? []
  const matchingPlanEntries: MatchingPlanEntry[] = planItems.map((item, globalIndex) => ({
    item,
    globalIndex,
    itemKey: buildReviewItemKey(item, globalIndex),
  }))
  const matchingGroups = groupMatchingPlanByAction(result.matchingPlan)
  const source = result.sourceDocument
  const vehicle = result.operationalContext?.vehicle
  const extractedItems = result.extractedItems ?? {
    serviceItems: [],
    partItems: [],
    operationalNotes: [],
  }

  const ext = result.draft?.extensions as
    | { documentPartsExcludedFromOperationalUi?: number }
    | undefined
  const partsExcludedFromOperationalUiCount =
    typeof ext?.documentPartsExcludedFromOperationalUi === 'number'
      ? ext.documentPartsExcludedFromOperationalUi
      : 0

  const redactionSummary = result.redaction
    ? {
        personalDataRemoved: result.redaction.personalDataRemoved,
        financialDataRemoved: result.redaction.financialDataRemoved,
        removedCategories: result.redaction.removedCategories.map((code) => ({
          code,
          label: REDACTION_LABELS[code] ?? code,
        })),
      }
    : null

  return {
    sourceSummary: {
      provider: source?.provider,
      documentType: source?.documentType,
      documentNumber: source?.documentNumber,
      status: result.status,
      confidencePercent: formatConfidencePercent(result.confidence?.overall),
    },
    vehicleSummary: {
      model: vehicle?.model,
      year: vehicle?.year,
      color: vehicle?.color,
      maskedPlate: result.operationalContext?.maskedIdentifiers?.licensePlateMasked,
    },
    redactionSummary,
    serviceItems: extractedItems.serviceItems,
    partItems: [],
    partsExcludedFromOperationalUiCount,
    operationalNotes: extractedItems.operationalNotes,
    matchingPlanEntries,
    matchingGroups,
    counters: {
      totalServices: extractedItems.serviceItems.length,
      totalParts: 0,
      totalReuseExisting: matchingGroups.reuseExisting.length,
      totalReviewSimilar: matchingGroups.reviewSimilar.length,
      totalCreateNew: matchingGroups.createNew.length,
      totalIgnored: matchingGroups.ignored.length,
      hasReviewRequiredItems:
        matchingGroups.reviewSimilar.length > 0 ||
        matchingGroups.createNew.length > 0,
    },
  }
}

