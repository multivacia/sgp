import type { ArgosMatchingPlanItemV11 } from '../../../domain/argos/draft-v1.types'
import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'
import type { DocumentDraftReviewModel } from './documentDraftReview'
import { isDraftV11Result } from './documentDraftReview'

export { buildReviewItemKey } from './documentDraftReview'

/** Legado (S4) — mapeado para {@link ReviewItemCurrentDecision} na leitura. */
export type ReviewDecision =
  | 'ACCEPT_REUSE'
  | 'CONFIRM_SIMILAR'
  | 'CONFIRM_CREATE_NEW'
  | 'CONFIRM_IGNORE'

export type ReviewItemCurrentDecision =
  | 'PENDING'
  | 'ACCEPT_SUGGESTED'
  | 'SELECT_ALTERNATIVE'
  | 'CONFIRM_CREATE_NEW'
  | 'IGNORE_ITEM'

export type ReviewItemAcceptance = {
  itemKey: string
  /** Opcional para migrar entradas legadas (`accepted`/`decision`). */
  currentDecision?: ReviewItemCurrentDecision
  selectedAlternativeMatrixNodeId?: string
  updatedAt: string
  /** @deprecated migrar para currentDecision */
  accepted?: boolean
  decision?: ReviewDecision
}

export type ReviewAcceptanceState = Record<string, ReviewItemAcceptance>

export function requiresExplicitAcceptance(item: ArgosMatchingPlanItemV11): boolean {
  return (
    item.suggestedAction === 'REVIEW_SIMILAR' ||
    item.suggestedAction === 'CREATE_NEW'
  )
}

/**
 * Decisão efetiva para UI e para bloqueio de criação.
 * REVIEW_SIMILAR / CREATE_NEW sem entrada explícita ficam PENDING.
 */
export function getReviewItemDecision(
  _item: ArgosMatchingPlanItemV11,
  entry: ReviewItemAcceptance | undefined,
): ReviewItemCurrentDecision {
  if (entry?.currentDecision != null && entry.currentDecision !== 'PENDING') {
    if (
      entry.currentDecision === 'SELECT_ALTERNATIVE' &&
      !entry.selectedAlternativeMatrixNodeId?.trim()
    ) {
      return 'PENDING'
    }
    return entry.currentDecision
  }
  if (entry?.accepted && entry.decision) {
    if (entry.decision === 'CONFIRM_SIMILAR') return 'ACCEPT_SUGGESTED'
    if (entry.decision === 'CONFIRM_CREATE_NEW') return 'CONFIRM_CREATE_NEW'
    if (entry.decision === 'ACCEPT_REUSE') return 'ACCEPT_SUGGESTED'
    if (entry.decision === 'CONFIRM_IGNORE') return 'IGNORE_ITEM'
  }
  return 'PENDING'
}

/**
 * Decisão ao montar o draft para POST: `REUSE_EXISTING` sem registo local
 * equivale a aceitar o candidato principal.
 */
export function getPayloadApplyDecision(
  item: ArgosMatchingPlanItemV11,
  entry: ReviewItemAcceptance | undefined,
): ReviewItemCurrentDecision {
  const d = getReviewItemDecision(item, entry)
  if (d !== 'PENDING') return d
  if (item.suggestedAction === 'REUSE_EXISTING') return 'ACCEPT_SUGGESTED'
  return 'PENDING'
}

export function isReviewItemExplicitlyResolved(
  item: ArgosMatchingPlanItemV11,
  entry: ReviewItemAcceptance | undefined,
): boolean {
  if (!requiresExplicitAcceptance(item)) return true
  return getReviewItemDecision(item, entry) !== 'PENDING'
}

export function getRequiredAcceptanceItems(
  reviewModel: DocumentDraftReviewModel,
): Array<{ item: ArgosMatchingPlanItemV11; globalIndex: number; itemKey: string }> {
  return reviewModel.matchingPlanEntries
    .filter((e) => requiresExplicitAcceptance(e.item))
    .map((e) => ({
      item: e.item,
      globalIndex: e.globalIndex,
      itemKey: e.itemKey,
    }))
}

export function getPendingAcceptanceItems(
  reviewModel: DocumentDraftReviewModel,
  acceptanceState: ReviewAcceptanceState,
): Array<{ item: ArgosMatchingPlanItemV11; globalIndex: number; itemKey: string }> {
  return getRequiredAcceptanceItems(reviewModel).filter(({ item, itemKey }) => {
    const entry = acceptanceState[itemKey]
    return !isReviewItemExplicitlyResolved(item, entry)
  })
}

export function buildAcceptanceSummary(
  reviewModel: DocumentDraftReviewModel,
  acceptanceState: ReviewAcceptanceState,
): {
  requiredTotal: number
  pendingTotal: number
  pendingReviewSimilar: number
  pendingCreateNew: number
  alternativesSelected: number
  ignoredByUser: number
  mandatoryReviewComplete: boolean
} {
  const pending = getPendingAcceptanceItems(reviewModel, acceptanceState)
  let alternativesSelected = 0
  let ignoredByUser = 0
  for (const e of reviewModel.matchingPlanEntries) {
    const entry = acceptanceState[e.itemKey]
    const d = getReviewItemDecision(e.item, entry)
    if (d === 'SELECT_ALTERNATIVE') alternativesSelected += 1
    if (d === 'IGNORE_ITEM' && requiresExplicitAcceptance(e.item)) ignoredByUser += 1
  }
  return {
    requiredTotal:
      reviewModel.matchingGroups.reviewSimilar.length +
      reviewModel.matchingGroups.createNew.length,
    pendingTotal: pending.length,
    pendingReviewSimilar: pending.filter(
      ({ item }) => item.suggestedAction === 'REVIEW_SIMILAR',
    ).length,
    pendingCreateNew: pending.filter(
      ({ item }) => item.suggestedAction === 'CREATE_NEW',
    ).length,
    alternativesSelected,
    ignoredByUser,
    mandatoryReviewComplete: pending.length === 0,
  }
}

export function buildFinalDecisionCounts(
  reviewModel: DocumentDraftReviewModel,
  acceptanceState: ReviewAcceptanceState,
): {
  /** Matriz / candidato principal ou alternativa escolhido (não “novo livre” nem ignorado pelo revisor). */
  reuseOrMatrix: number
  /** Decisão explícita de etapa nova (serviço extraído sem matriz alinhada). */
  confirmedNew: number
  /** REVIEW/CREATE com IGNORE_ITEM. */
  userIgnored: number
  alternativePicked: number
} {
  let reuseOrMatrix = 0
  let confirmedNew = 0
  let userIgnored = 0
  let alternativePicked = 0
  for (const e of reviewModel.matchingPlanEntries) {
    const d = getReviewItemDecision(e.item, acceptanceState[e.itemKey])
    if (d === 'SELECT_ALTERNATIVE') {
      alternativePicked += 1
      reuseOrMatrix += 1
      continue
    }
    if (d === 'IGNORE_ITEM' && requiresExplicitAcceptance(e.item)) {
      userIgnored += 1
      continue
    }
    if (d === 'CONFIRM_CREATE_NEW') {
      confirmedNew += 1
      continue
    }
    if (e.item.suggestedAction === 'IGNORE') {
      continue
    }
    if (e.item.suggestedAction === 'REUSE_EXISTING') {
      reuseOrMatrix += 1
      continue
    }
    if (d === 'ACCEPT_SUGGESTED') {
      reuseOrMatrix += 1
    }
  }
  return {
    reuseOrMatrix,
    confirmedNew,
    userIgnored,
    alternativePicked,
  }
}

export function canCreateOfficialConveyor(
  ingest: ArgosDocumentIngestResult | null,
  reviewModel: DocumentDraftReviewModel | null,
  acceptanceState: ReviewAcceptanceState,
): boolean {
  if (!ingest || !reviewModel) return true
  if (!isDraftV11Result(ingest)) return true
  return getPendingAcceptanceItems(reviewModel, acceptanceState).length === 0
}
