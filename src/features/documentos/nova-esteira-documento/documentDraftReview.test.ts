import { describe, expect, it } from 'vitest'
import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'
import {
  buildDocumentDraftReviewModel,
  buildReviewItemKey,
  formatConfidencePercent,
  groupMatchingPlanByAction,
  isDraftV11Result,
  shouldShowAcceptSuggestedButton,
} from './documentDraftReview'

function baseResult(): ArgosDocumentIngestResult {
  return {
    requestId: 'r1',
    correlationId: 'c1',
    status: 'partial',
    specialist: 'spec',
    strategy: 'strat',
    document: {},
    extractedFacts: [],
    draft: {
      schemaVersion: '1.1.0',
      suggestedDados: {},
      options: [],
      warnings: [],
      humanReviewRequired: true,
    },
    warnings: [],
    confidence: { overall: 0.74 },
    sourceDocument: {
      provider: 'BRAVO',
      documentType: 'OS_OR_BUDGET',
      documentNumber: 'OS-100',
    },
    operationalContext: {
      vehicle: { model: 'Onix', year: 2020, color: 'Prata' },
      maskedIdentifiers: { licensePlateMasked: 'ABC****' },
    },
    extractedItems: {
      serviceItems: [{ description: 'Revestimento banco' }],
      partItems: [{ description: 'Courvin preto', quantity: 2 }],
      operationalNotes: ['Priorizar entrega'],
    },
    redaction: {
      personalDataRemoved: true,
      financialDataRemoved: true,
      removedCategories: ['cpf_cnpj', 'totals', 'pricing'],
    },
    matchingPlan: [
      {
        extractedServiceDescription: 'Revestimento banco',
        suggestedAction: 'REUSE_EXISTING',
        confidence: 0.91,
      },
      {
        extractedServiceDescription: 'Higienização interna',
        suggestedAction: 'REVIEW_SIMILAR',
        confidence: 0.7,
      },
      {
        extractedServiceDescription: 'Reparo volante',
        suggestedAction: 'CREATE_NEW',
        confidence: 0.41,
      },
      {
        extractedServiceDescription: 'Item não operacional',
        suggestedAction: 'IGNORE',
      },
    ],
  }
}

describe('documentDraftReview', () => {
  it('identifica draft 1.1.0 e mantém fallback 1.0.0', () => {
    const v11 = baseResult()
    const v10: ArgosDocumentIngestResult = {
      ...baseResult(),
      draft: { schemaVersion: '1.0.0', suggestedDados: {}, options: [] },
    }
    expect(isDraftV11Result(v11)).toBe(true)
    expect(isDraftV11Result(v10)).toBe(false)
  })

  it('agrupa matchingPlan por ação', () => {
    const grouped = groupMatchingPlanByAction(baseResult().matchingPlan)
    expect(grouped.reuseExisting).toHaveLength(1)
    expect(grouped.reviewSimilar).toHaveLength(1)
    expect(grouped.createNew).toHaveLength(1)
    expect(grouped.ignored).toHaveLength(1)
  })

  it('calcula contadores e não mistura peças com matching', () => {
    const model = buildDocumentDraftReviewModel(baseResult())
    expect(model.counters.totalServices).toBe(1)
    expect(model.counters.totalParts).toBe(0)
    expect(model.counters.totalReuseExisting).toBe(1)
    expect(model.counters.totalReviewSimilar).toBe(1)
    expect(model.counters.totalCreateNew).toBe(1)
    expect(model.counters.totalIgnored).toBe(1)
  })

  it('não expõe partItems na UI e lê contagem suprimida das extensões do draft', () => {
    const r = baseResult()
    r.draft = {
      ...r.draft!,
      extensions: { documentPartsExcludedFromOperationalUi: 4 },
    }
    const model = buildDocumentDraftReviewModel(r)
    expect(model.partItems).toHaveLength(0)
    expect(model.partsExcludedFromOperationalUiCount).toBe(4)
  })

  it('formata confiança corretamente', () => {
    expect(formatConfidencePercent(0.739)).toBe('74%')
  })

  it('CREATE_NEW não deve exibir botão Aceitar sugestão (regra UX R6 S9.1)', () => {
    expect(
      shouldShowAcceptSuggestedButton({
        extractedServiceDescription: 'x',
        suggestedAction: 'CREATE_NEW',
      }),
    ).toBe(false)
  })

  it('REVIEW_SIMILAR e REUSE_EXISTING mantêm Aceitar sugestão', () => {
    expect(
      shouldShowAcceptSuggestedButton({
        extractedServiceDescription: 'x',
        suggestedAction: 'REVIEW_SIMILAR',
      }),
    ).toBe(true)
    expect(
      shouldShowAcceptSuggestedButton({
        extractedServiceDescription: 'x',
        suggestedAction: 'REUSE_EXISTING',
      }),
    ).toBe(true)
  })

  it('render model não expõe conteúdo financeiro/sensível removido', () => {
    const model = buildDocumentDraftReviewModel(baseResult())
    const serialized = JSON.stringify(model).toLowerCase()
    expect(serialized.includes('cpf:')).toBe(false)
    expect(serialized.includes('r$')).toBe(false)
    expect(serialized.includes('pagamento:')).toBe(false)
  })

  it('resultado 1.1.0 com matching vazio mantém estado estável', () => {
    const res = baseResult()
    res.matchingPlan = []
    const model = buildDocumentDraftReviewModel(res)
    expect(model.matchingGroups.reuseExisting).toHaveLength(0)
    expect(model.matchingGroups.reviewSimilar).toHaveLength(0)
    expect(model.matchingGroups.createNew).toHaveLength(0)
    expect(model.matchingGroups.ignored).toHaveLength(0)
  })

  it('matchingPlanEntries preserva índice global e chave estável', () => {
    const res = baseResult()
    const model = buildDocumentDraftReviewModel(res)
    expect(model.matchingPlanEntries).toHaveLength(4)
    expect(model.matchingPlanEntries[2]!.globalIndex).toBe(2)
    expect(model.matchingPlanEntries[2]!.itemKey).toBe(
      buildReviewItemKey(model.matchingPlanEntries[2]!.item, 2),
    )
  })

  it('matchingPlanEntries inclui matrixSubtree e subtreeSummary quando presentes no ingest', () => {
    const res = baseResult()
    res.matchingPlan = [
      {
        extractedServiceDescription: 'Lateral',
        suggestedAction: 'REUSE_EXISTING',
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: 'T', step: '10 - TASK' },
        subtreeSummary: {
          rootNodeType: 'TASK',
          totalAreas: 2,
          totalActivities: 4,
          totalPlannedMinutes: 100,
        },
        matrixSubtree: {
          rootNodeId: 't1',
          rootNodeType: 'TASK',
          rootTitle: '10 - LATERAIS',
          totalAreas: 1,
          totalActivities: 1,
          totalPlannedMinutes: 10,
          areas: [
            {
              matrixNodeId: 's1',
              title: 'Área 1',
              orderIndex: 1,
              activities: [
                { matrixNodeId: 'a1', title: 'E1', orderIndex: 1, plannedMinutes: 10 },
              ],
            },
          ],
        },
      },
    ]
    const model = buildDocumentDraftReviewModel(res)
    expect(model.matchingPlanEntries[0]!.item.matrixSubtree?.rootTitle).toBe('10 - LATERAIS')
    expect(model.matchingPlanEntries[0]!.item.subtreeSummary?.totalActivities).toBe(4)
  })
})

