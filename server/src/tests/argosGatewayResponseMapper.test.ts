import { describe, expect, it } from 'vitest'
import {
  mapArgosGatewayDocumentIngestToSgp,
  parseArgosRemoteDocumentIngestPayload,
} from '../modules/argos-integration/argosGatewayResponseMapper.js'

describe('argosGatewayResponseMapper', () => {
  it('mapeia resposta mínima do gateway ARGOS para ArgosDocumentIngestResult', () => {
    const raw = {
      requestId: '11111111-1111-1111-1111-111111111111',
      correlationId: '22222222-2222-2222-2222-222222222222',
      status: 'SUCCESS',
      policyApplied: 'balanced',
      understanding: {
        intent: 'document_ingestion',
        summary: 'ok',
        details: {
          documentId: '33333333-3333-3333-3333-333333333333',
          artifact: {
            fileName: 'os.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1200,
            storage: { backend: 'local', key: 'k' },
            ingestionStatus: 'STORED',
          },
          extraction: {},
          interpretation: {},
          draft: {
            draftId: '44444444-4444-4444-4444-444444444444',
            status: 'SUCCESS',
            phase: 'draft',
            result: {
              consolidated: {
                fields: [
                  {
                    id: 'f1',
                    label: 'Cliente',
                    valuePreview: 'ACME',
                    confidence: 0.9,
                  },
                ],
                blocks: [],
              },
            },
            warnings: [],
            trace: {
              durationMs: 1,
              builderKey: 'b',
              strategyUsed: 's',
            },
          },
          novaEsteiraPorDocumento: {
            phase: 'nova_esteira_por_documento',
            sourceDraftId: '44444444-4444-4444-4444-444444444444',
            result: {
              format: 'argos_nova_esteira_por_documento_v3',
              purpose: 'structural_esteira_draft_from_document',
              pipelineStatus: 'SUCCESS',
              sourceDraftPipelineStatus: 'SUCCESS',
              businessView: {
                summary: 'Caso de teste',
                conveyorHypotheses: [],
                candidateWorkItems: [
                  {
                    id: 'w1',
                    label: 'Revisão geral',
                    detailPreview: 'd',
                    confidence: 'high',
                  },
                ],
                risksAndGaps: [],
              },
              structuralEsteiraDraft: {
                schema: 'argos_esteira_structural_draft_v2',
                boundaries: {
                  isStructuralDraftOnly: true,
                  notPersistedInConsumidor: true,
                  notSgpSchemaBinding: true,
                },
                documentPrincipal: {
                  titleHint: 'OS 123',
                  identifierCandidates: [],
                  summaryLine: 'Resumo',
                },
                structuralBlocks: [],
                mappedFields: [],
                suggestions: [],
                missingFields: [],
                businessObservations: [],
                explicitAmbiguities: [],
                structuredWarnings: [],
                reviewLayer: {
                  overallConfidence: 'high',
                  reviewReadiness: 'actionable',
                  summaryForReviewer: 'ok',
                  counts: {
                    confirmedFields: 0,
                    suggestedFields: 0,
                    pendingFields: 0,
                    explicitAmbiguities: 0,
                    explicitGaps: 0,
                    structuredWarnings: 0,
                  },
                },
                reviewMetadata: {
                  generatedAtIso: new Date().toISOString(),
                  upstreamDraftPipelineStatus: 'SUCCESS',
                  upstreamCompletenessLevel: 'high',
                  evidenceCodes: [],
                  ambiguityCount: 0,
                  gapCount: 0,
                  warningCount: 0,
                  structuralSchemaSprint: '3.3',
                },
              },
              trace: {
                specialistKey: 'nova_spec',
                strategyUsed: 'nova_strat',
                inputDraftFormat: 'argos_document_draft_v1',
                releaseBusinessCaseOpened: 3,
                release3ContractStable: true,
              },
            },
            trace: {
              durationMs: 2,
              specialistKey: 'nova_trace_spec',
              strategyUsed: 'nova_trace_strat',
            },
          },
        },
      },
      quality: {
        confidence: 'high',
        ambiguity: 'low',
        warnings: [],
      },
      trace: {
        durationMs: 10,
        fallbackUsed: false,
        specialistKey: 'document_gateway',
        strategyUsed: 'pdf_ingest_v1',
      },
    }

    const mapped = mapArgosGatewayDocumentIngestToSgp(raw)
    expect(mapped.requestId).toBe(raw.requestId)
    expect(mapped.correlationId).toBe(raw.correlationId)
    expect(mapped.status).toBe('completed')
    expect(mapped.specialist).toBe('nova_trace_spec')
    expect(mapped.strategy).toBe('nova_trace_strat')
    expect(mapped.draft?.schemaVersion).toBe('1.0.0')
    expect(mapped.draft?.suggestedDados.title).toBe('OS 123')
    expect(mapped.draft?.options.length).toBe(1)
    expect(mapped.extractedFacts[0]?.key).toBe('Cliente')
  })

  it('parseArgosRemoteDocumentIngestPayload aceita envelope { success, data }', () => {
    const inner = {
      requestId: '11111111-1111-1111-1111-111111111111',
      correlationId: '22222222-2222-2222-2222-222222222222',
      status: 'SUCCESS_WITH_WARNINGS',
      policyApplied: 'balanced',
      understanding: {
        intent: 'document_ingestion',
        summary: 's',
        details: {
          documentId: 'd',
          artifact: { fileName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 1 },
          extraction: {},
          interpretation: {},
          draft: {
            draftId: 'dr',
            status: 'DEGRADED',
            phase: 'draft',
            result: { consolidated: { fields: [], blocks: [] } },
            warnings: [],
            trace: { durationMs: 1, builderKey: 'b', strategyUsed: 's' },
          },
          novaEsteiraPorDocumento: {
            phase: 'nova_esteira_por_documento',
            sourceDraftId: 'dr',
            result: {
              format: 'argos_nova_esteira_por_documento_v3',
              purpose: 'structural_esteira_draft_from_document',
              pipelineStatus: 'DEGRADED',
              sourceDraftPipelineStatus: 'DEGRADED',
              businessView: {
                summary: 'x',
                conveyorHypotheses: [],
                candidateWorkItems: [],
                risksAndGaps: [],
              },
            },
            trace: {
              durationMs: 1,
              specialistKey: 'sp',
              strategyUsed: 'st',
            },
          },
        },
      },
      quality: {
        confidence: 'medium',
        ambiguity: 'medium',
        warnings: [{ code: 'W1', message: 'aviso' }],
      },
      trace: {
        durationMs: 1,
        fallbackUsed: false,
        specialistKey: 'document_gateway',
        strategyUsed: 'pdf_ingest_v1',
      },
    }
    const wrapped = { success: true, data: inner }
    const out = parseArgosRemoteDocumentIngestPayload(wrapped)
    expect(out.status).toBe('partial')
    expect(out.warnings.some((w) => w.code === 'W1')).toBe(true)
  })
})
