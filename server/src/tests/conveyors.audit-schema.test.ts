import { describe, expect, it } from 'vitest'
import { postConveyorBodySchema } from '../modules/conveyors/conveyors.schemas.js'

function baseBody() {
  return {
    dados: {
      nome: 'Esteira audit test',
      cliente: '',
      veiculo: 'Veiculo',
      modeloVersao: '',
      placa: '',
      observacoes: '',
      responsavel: '',
      prazoEstimado: '',
      prioridade: 'media',
      colaboradorId: null,
    },
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    matrixRootItemId: null,
    options: [
      {
        titulo: 'Opcao',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Area',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Etapa',
                orderIndex: 1,
                plannedMinutes: 10,
                sourceOrigin: 'manual',
                required: true,
                assignees: [],
              },
            ],
          },
        ],
      },
    ],
  }
}

describe('conveyors post schema - documentReviewAudit', () => {
  it('aceita metadata.documentReviewAudit válido', () => {
    const body = {
      ...baseBody(),
      metadata: {
        documentReviewAudit: {
          schemaVersion: 'r6_document_review_audit_v1',
          source: {
            provider: 'BRAVO',
            documentType: 'OS_OR_BUDGET',
            documentNumber: '7452',
            requestId: 'req-1',
            correlationId: 'corr-1',
          },
          summary: {
            totalServiceItems: 1,
            reusedCount: 1,
            acceptedSimilarCount: 0,
            selectedAlternativeCount: 0,
            createNewConfirmedCount: 0,
            ignoredCount: 0,
          },
          decisions: [
            {
              index: 0,
              extractedServiceDescription: 'Revestimento banco',
              finalDecision: 'ACCEPT_SUGGESTED',
              finalSourceOrigin: 'reaproveitada',
              matchedMatrixNodeId: '11111111-1111-4111-8111-111111111111',
              selectedAlternativeMatrixNodeId: null,
              plannedMinutes: 120,
              confidence: 0.91,
            },
          ],
        },
      },
    }
    const parsed = postConveyorBodySchema.parse(body)
    expect(parsed.metadata?.documentReviewAudit?.schemaVersion).toBe(
      'r6_document_review_audit_v1',
    )
  })

  it('rejeita metadata livre fora da allowlist', () => {
    const body = {
      ...baseBody(),
      metadata: {
        documentReviewAudit: {
          schemaVersion: 'r6_document_review_audit_v1',
          source: {
            provider: 'BRAVO',
            documentType: 'OS_OR_BUDGET',
            requestId: 'req-1',
            correlationId: 'corr-1',
          },
          summary: {
            totalServiceItems: 1,
            reusedCount: 1,
            acceptedSimilarCount: 0,
            selectedAlternativeCount: 0,
            createNewConfirmedCount: 0,
            ignoredCount: 0,
          },
          decisions: [],
          unexpected: true,
        },
      },
    }
    const result = postConveyorBodySchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejeita auditoria com conteúdo proibido', () => {
    const body = {
      ...baseBody(),
      metadata: {
        documentReviewAudit: {
          schemaVersion: 'r6_document_review_audit_v1',
          source: {
            provider: 'BRAVO',
            documentType: 'OS_OR_BUDGET',
            requestId: 'req-1',
            correlationId: 'corr-1',
          },
          summary: {
            totalServiceItems: 1,
            reusedCount: 0,
            acceptedSimilarCount: 0,
            selectedAlternativeCount: 0,
            createNewConfirmedCount: 1,
            ignoredCount: 0,
          },
          decisions: [
            {
              index: 0,
              extractedServiceDescription: 'Pagamento em dinheiro',
              finalDecision: 'CONFIRM_CREATE_NEW',
              finalSourceOrigin: 'manual',
              plannedMinutes: 0,
            },
          ],
        },
      },
    }
    const result = postConveyorBodySchema.safeParse(body)
    expect(result.success).toBe(false)
  })
})

