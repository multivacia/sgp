import { describe, expect, it } from 'vitest'
import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'
import { buildDocumentDraftReviewModel } from './documentDraftReview'
import {
  buildAcceptanceSummary,
  buildFinalDecisionCounts,
  buildReviewItemKey,
  canCreateOfficialConveyor,
  getPendingAcceptanceItems,
  requiresExplicitAcceptance,
  type ReviewAcceptanceState,
} from './documentReviewAcceptance'

function buildResult(
  schemaVersion: '1.0.0' | '1.1.0' = '1.1.0',
): ArgosDocumentIngestResult {
  return {
    requestId: 'r1',
    correlationId: 'c1',
    status: 'partial',
    specialist: 'spec',
    strategy: 'strat',
    document: {},
    extractedFacts: [],
    warnings: [],
    confidence: { overall: 0.7 },
    draft:
      schemaVersion === '1.1.0'
        ? {
            schemaVersion: '1.1.0',
            suggestedDados: {},
            options: [],
            warnings: [],
            humanReviewRequired: true,
          }
        : {
            schemaVersion: '1.0.0',
            suggestedDados: {},
            options: [],
          },
    matchingPlan: [
      {
        extractedServiceDescription: 'Revestimento banco',
        suggestedAction: 'REUSE_EXISTING',
      },
      {
        extractedServiceDescription: 'Higienização interna',
        suggestedAction: 'REVIEW_SIMILAR',
      },
      {
        extractedServiceDescription: 'Reparo volante',
        suggestedAction: 'CREATE_NEW',
      },
      {
        extractedServiceDescription: 'Item fora de escopo',
        suggestedAction: 'IGNORE',
      },
    ],
  }
}

describe('documentReviewAcceptance', () => {
  it('REVIEW_SIMILAR exige aceite', () => {
    expect(
      requiresExplicitAcceptance({
        extractedServiceDescription: 'x',
        suggestedAction: 'REVIEW_SIMILAR',
      }),
    ).toBe(true)
  })

  it('CREATE_NEW exige aceite', () => {
    expect(
      requiresExplicitAcceptance({
        extractedServiceDescription: 'x',
        suggestedAction: 'CREATE_NEW',
      }),
    ).toBe(true)
  })

  it('REUSE_EXISTING não bloqueia por padrão', () => {
    expect(
      requiresExplicitAcceptance({
        extractedServiceDescription: 'x',
        suggestedAction: 'REUSE_EXISTING',
      }),
    ).toBe(false)
  })

  it('IGNORE não bloqueia por padrão', () => {
    expect(
      requiresExplicitAcceptance({
        extractedServiceDescription: 'x',
        suggestedAction: 'IGNORE',
      }),
    ).toBe(false)
  })

  it('canCreateOfficialConveyor retorna false quando REVIEW_SIMILAR está pendente', () => {
    const ingest = buildResult('1.1.0')
    const model = buildDocumentDraftReviewModel(ingest)
    const state: ReviewAcceptanceState = {}
    expect(canCreateOfficialConveyor(ingest, model, state)).toBe(false)
  })

  it('canCreateOfficialConveyor retorna false quando CREATE_NEW está pendente', () => {
    const ingest = buildResult('1.1.0')
    const model = buildDocumentDraftReviewModel(ingest)
    const required = getPendingAcceptanceItems(model, {})
    const acceptedOnlyFirst = {
      [required[0]!.itemKey]: {
        itemKey: required[0]!.itemKey,
        currentDecision: 'ACCEPT_SUGGESTED' as const,
        updatedAt: new Date().toISOString(),
      },
    }
    expect(canCreateOfficialConveyor(ingest, model, acceptedOnlyFirst)).toBe(false)
  })

  it('canCreateOfficialConveyor retorna true quando todos obrigatórios aceitos', () => {
    const ingest = buildResult('1.1.0')
    const model = buildDocumentDraftReviewModel(ingest)
    const required = getPendingAcceptanceItems(model, {})
    const state: ReviewAcceptanceState = Object.fromEntries(
      required.map((r) => [
        r.itemKey,
        {
          itemKey: r.itemKey,
          currentDecision:
            r.item.suggestedAction === 'REVIEW_SIMILAR'
              ? 'ACCEPT_SUGGESTED'
              : 'CONFIRM_CREATE_NEW',
          updatedAt: new Date().toISOString(),
        },
      ]),
    )
    expect(canCreateOfficialConveyor(ingest, model, state)).toBe(true)
  })

  it('matchingPlan vazio não bloqueia criação', () => {
    const ingest = buildResult('1.1.0')
    ingest.matchingPlan = []
    const model = buildDocumentDraftReviewModel(ingest)
    expect(canCreateOfficialConveyor(ingest, model, {})).toBe(true)
  })

  it('draft 1.0.0 não é bloqueado por aceite 1.1.0', () => {
    const ingest = buildResult('1.0.0')
    const model = buildDocumentDraftReviewModel(ingest)
    expect(canCreateOfficialConveyor(ingest, model, {})).toBe(true)
  })

  it('buildReviewItemKey gera chave estável para ação+descrição+match', () => {
    const item = {
      extractedServiceDescription: 'Revestimento banco',
      suggestedAction: 'REVIEW_SIMILAR' as const,
      matchedMatrixNodeId: 'abc',
    }
    const keyA = buildReviewItemKey(item, 2)
    const keyB = buildReviewItemKey(item, 2)
    expect(keyA).toBe(keyB)
    expect(keyA.toLowerCase().includes('review_similar')).toBe(true)
  })

  it('buildAcceptanceSummary informa pendências por tipo', () => {
    const ingest = buildResult('1.1.0')
    const model = buildDocumentDraftReviewModel(ingest)
    const summary = buildAcceptanceSummary(model, {})
    expect(summary.requiredTotal).toBe(2)
    expect(summary.pendingReviewSimilar).toBe(1)
    expect(summary.pendingCreateNew).toBe(1)
    expect(summary.mandatoryReviewComplete).toBe(false)
  })

  it('buildFinalDecisionCounts agrega reutilização e alternativas', () => {
    const ingest = buildResult('1.1.0')
    const model = buildDocumentDraftReviewModel(ingest)
    const e1 = model.matchingPlanEntries[1]!
    const e2 = model.matchingPlanEntries[2]!
    const state: ReviewAcceptanceState = {
      [e1.itemKey]: {
        itemKey: e1.itemKey,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
      [e2.itemKey]: {
        itemKey: e2.itemKey,
        currentDecision: 'SELECT_ALTERNATIVE',
        selectedAlternativeMatrixNodeId: 'alt-1',
        updatedAt: new Date().toISOString(),
      },
    }
    const c = buildFinalDecisionCounts(model, state)
    expect(c.reuseOrMatrix).toBeGreaterThanOrEqual(2)
    expect(c.alternativePicked).toBe(1)
  })

  it('buildFinalDecisionCounts soma novos confirmados e ignorados', () => {
    const ingest = buildResult('1.1.0')
    const model = buildDocumentDraftReviewModel(ingest)
    const e1 = model.matchingPlanEntries[1]!
    const e2 = model.matchingPlanEntries[2]!
    const state: ReviewAcceptanceState = {
      [e1.itemKey]: {
        itemKey: e1.itemKey,
        currentDecision: 'IGNORE_ITEM',
        updatedAt: new Date().toISOString(),
      },
      [e2.itemKey]: {
        itemKey: e2.itemKey,
        currentDecision: 'CONFIRM_CREATE_NEW',
        updatedAt: new Date().toISOString(),
      },
    }
    const c = buildFinalDecisionCounts(model, state)
    expect(c.userIgnored).toBe(1)
    expect(c.confirmedNew).toBe(1)
  })

  it('SELECT_ALTERNATIVE com alternativa TASK (matrixSubtree) resolve pendência', () => {
    const ingest = buildResult('1.1.0')
    ingest.matchingPlan = [
      {
        extractedServiceDescription: 'Serviço com revisão',
        suggestedAction: 'REVIEW_SIMILAR',
        alternativeCandidates: [
          {
            matrixNodeId: 'alt-task',
            nodeType: 'TASK',
            activity: 'Alternativa',
            confidence: 0.71,
            matchReason: 'alt',
            matrixSubtree: {
              rootNodeId: 'alt-task',
              rootNodeType: 'TASK',
              rootTitle: 'Alt root',
              totalAreas: 1,
              totalActivities: 1,
              totalPlannedMinutes: 10,
              areas: [
                {
                  matrixNodeId: 's',
                  title: 'S',
                  orderIndex: 1,
                  activities: [
                    { matrixNodeId: 'a', title: 'A', orderIndex: 1, plannedMinutes: 10 },
                  ],
                },
              ],
            },
          },
        ],
      },
    ]
    const model = buildDocumentDraftReviewModel(ingest)
    const entry = model.matchingPlanEntries[0]!
    const state: ReviewAcceptanceState = {
      [entry.itemKey]: {
        itemKey: entry.itemKey,
        currentDecision: 'SELECT_ALTERNATIVE',
        selectedAlternativeMatrixNodeId: 'alt-task',
        updatedAt: new Date().toISOString(),
      },
    }
    expect(getPendingAcceptanceItems(model, state)).toHaveLength(0)
    expect(canCreateOfficialConveyor(ingest, model, state)).toBe(true)
  })
})
