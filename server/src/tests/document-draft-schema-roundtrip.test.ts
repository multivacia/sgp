import { describe, expect, it } from 'vitest'
import { contractValidationIssuesFromZodError } from '../modules/argos-integration/contractValidationDebug.js'
import { deepStripNullToUndefined } from '../modules/argos-integration/dtoNilNormalize.js'
import { argosDocumentIngestResultSchema } from '../modules/argos-integration/document-draft.schemas.js'

/**
 * TD10.2 — garantir que o schema Zod do endpoint não remove campos estruturados.
 */
describe('argosDocumentIngestResultSchema — campos Bravo / operationalContext', () => {
  it('preserva vehicle, maskedIdentifiers, suggestedDados e sourceDocument ao validar', () => {
    const sample = {
      requestId: 'req-1',
      correlationId: 'corr-1',
      status: 'completed' as const,
      specialist: 'sgp_argos_local_heuristic_v1',
      strategy: 'local_heuristic_pipeline_v1',
      document: {
        fileName: 'x.pdf',
        mimeType: 'application/pdf',
        pageCount: 2,
        contentSha256: 'a'.repeat(64),
      },
      sourceDocument: {
        provider: 'BRAVO',
        documentType: 'OS_OR_BUDGET',
        documentNumber: '7452',
        issuedAt: '2026-01-15',
        receivedAt: '2026-01-26',
        entryDate: '2026-01-26',
      },
      operationalContext: {
        vehicle: {
          model: 'GOL GTI 2000',
          year: 1993,
          color: 'PRETA',
        },
        maskedIdentifiers: {
          licensePlateMasked: 'AWW****',
        },
      },
      extractedFacts: [{ key: 'os.number', value: '7452', confidence: 0.9 }],
      extractedItems: {
        serviceItems: [{ id: 'svc-1', description: 'Serviço teste', confidence: 0.9 }],
        partItems: [],
        operationalNotes: [],
      },
      redaction: {
        personalDataRemoved: true,
        financialDataRemoved: true,
        removedCategories: ['cpf_cnpj'] as const,
      },
      matchingPlan: [],
      draft: {
        schemaVersion: '1.1.0' as const,
        suggestedDados: {
          title: '7452',
          clientName: 'Cliente Teste',
          vehicleDescription: 'GOL GTI 2000',
          modelVersion: '',
          licensePlate: 'AWW2C00',
          notes: '',
          estimatedDeadline: undefined,
          osNumber: '7452',
        },
        options: [
          {
            orderIndex: 1,
            title: 'Opção',
            areas: [
              {
                orderIndex: 1,
                title: 'Área',
                steps: [{ orderIndex: 1, title: 'Passo', confidence: 0.9 }],
              },
            ],
          },
        ],
        warnings: [],
        humanReviewRequired: true as const,
        extensions: {
          pipeline: { x: 1 },
          debugBasicFieldsFlags: {
            basicFields: { foundDocumentNumber: true },
            propagation: { estimatedDeadlineSource: 'entryAt' },
          },
        },
      },
      warnings: [],
      confidence: { overall: 0.9 },
    }

    const parsed = argosDocumentIngestResultSchema.safeParse(sample)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    const d = parsed.data
    expect(d.sourceDocument?.documentNumber).toBe('7452')
    expect(d.sourceDocument?.issuedAt).toBe('2026-01-15')
    expect((d.sourceDocument as { entryDate?: string }).entryDate).toBe('2026-01-26')
    expect(d.operationalContext?.vehicle?.model).toBe('GOL GTI 2000')
    expect(d.operationalContext?.vehicle?.year).toBe(1993)
    expect(d.operationalContext?.maskedIdentifiers?.licensePlateMasked).toBe('AWW****')
    expect(d.draft?.schemaVersion).toBe('1.1.0')
    if (d.draft?.schemaVersion === '1.1.0') {
      expect(d.draft.suggestedDados.clientName).toBe('Cliente Teste')
      expect(d.draft.suggestedDados.vehicleDescription).toBe('GOL GTI 2000')
      expect(d.draft.suggestedDados.licensePlate).toBe('AWW2C00')
      expect(
        (d.draft.extensions as Record<string, unknown>)?.debugBasicFieldsFlags,
      ).toBeTruthy()
    }
  })

  it('R6 S9.2 — matchingPlan com TASK, subtreeSummary, matrixSubtree e alternativeCandidates (números)', () => {
    const sample = {
      requestId: 'req-s92',
      correlationId: 'corr-s92',
      status: 'partial' as const,
      specialist: 'sgp_argos_local_heuristic_v1',
      strategy: 'local_heuristic_pipeline_v1',
      document: {
        fileName: 'x.pdf',
        mimeType: 'application/pdf',
      },
      extractedFacts: [],
      extractedItems: {
        serviceItems: [{ description: 'Serviço OS' }],
        partItems: [],
        operationalNotes: [],
      },
      matchingPlan: [
        {
          extractedServiceDescription: 'LATERAL TRASEIRA - TROCAR TECIDO',
          suggestedAction: 'REVIEW_SIMILAR' as const,
          confidence: 0.62,
          matchReason: 'Tarefa macro da Matriz (0.62): lateral, traseira.',
          matchedMatrixNodeId: '90000010-0000-4000-8000-000000000010',
          matchedMatrixNodeType: 'TASK' as const,
          reusedStructure: {
            kind: 'MATRIX_SUBTREE' as const,
            activity: '10 - LATERAIS TRASEIRAS',
            step: '10 - LATERAIS TRASEIRAS',
            plannedMinutes: 305,
            isPrimary: true,
          },
          subtreeSummary: {
            rootNodeType: 'TASK' as const,
            totalAreas: 4,
            totalActivities: 8,
            totalPlannedMinutes: 305,
            previewActivities: ['Etapa A', 'Etapa B'],
          },
          matrixSubtree: {
            rootNodeId: '90000010-0000-4000-8000-000000000010',
            rootNodeType: 'TASK' as const,
            rootTitle: '10 - LATERAIS TRASEIRAS',
            totalAreas: 4,
            totalActivities: 8,
            totalPlannedMinutes: 305,
            areas: [
              {
                matrixNodeId: 'sec-1',
                title: 'Laterais',
                orderIndex: 1,
                plannedMinutes: 150,
                activities: [
                  {
                    matrixNodeId: 'act-1',
                    title: 'Troca tecido',
                    orderIndex: 1,
                    plannedMinutes: 75,
                  },
                ],
              },
            ],
          },
          alternativeCandidates: [
            {
              matrixNodeId: 'alt-1',
              nodeType: 'ACTIVITY' as const,
              kind: 'MATRIX_ACTIVITY' as const,
              activity: 'Outra etapa',
              confidence: 0.48,
              matchReason: 'Alternativa (0.48): Outra etapa',
              plannedMinutes: 90,
            },
          ],
        },
      ],
      draft: null,
      warnings: [],
      confidence: { overall: 0.7 },
    }

    const parsed = argosDocumentIngestResultSchema.safeParse(sample)
    expect(parsed.success).toBe(true)
  })

  it('R6 S9.2.2 — subtreeSummary.previewActivities: máximo 5 no schema', () => {
    const envelope = {
      requestId: 'req-s922',
      correlationId: 'corr-s922',
      status: 'partial' as const,
      specialist: 'sgp_argos_local_heuristic_v1',
      strategy: 'local_heuristic_pipeline_v1',
      document: { fileName: 'x.pdf', mimeType: 'application/pdf' },
      extractedFacts: [],
      extractedItems: {
        serviceItems: [{ description: 'Serviço OS' }],
        partItems: [],
        operationalNotes: [],
      },
      draft: null,
      warnings: [],
      confidence: { overall: 0.7 },
      matchingPlan: [
        {
          extractedServiceDescription: 'LATERAL',
          suggestedAction: 'REVIEW_SIMILAR' as const,
          confidence: 0.61,
          matchedMatrixNodeType: 'TASK' as const,
          subtreeSummary: {
            rootNodeType: 'TASK' as const,
            totalAreas: 3,
            totalActivities: 12,
            totalPlannedMinutes: 400,
            previewActivities: ['e1', 'e2', 'e3', 'e4', 'e5'],
          },
        },
      ],
    }
    expect(argosDocumentIngestResultSchema.safeParse(envelope).success).toBe(true)

    const tooMany = {
      ...envelope,
      matchingPlan: [
        {
          ...envelope.matchingPlan[0]!,
          subtreeSummary: {
            ...envelope.matchingPlan[0]!.subtreeSummary!,
            previewActivities: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'],
          },
        },
      ],
    }
    expect(argosDocumentIngestResultSchema.safeParse(tooMany).success).toBe(false)
  })
})

describe('R6 S9.2.1 — debug de contrato + null → undefined', () => {
  it('contractValidationIssuesFromZodError expõe path/code sem valor de negócio', () => {
    const checked = argosDocumentIngestResultSchema.safeParse({
      requestId: 'r',
      correlationId: 'c',
      status: 'partial',
      specialist: 'spec',
      strategy: 'str',
      document: {},
      extractedFacts: [],
      warnings: [],
      confidence: null,
      draft: null,
      matchingPlan: [
        {
          extractedServiceDescription: 'x',
          suggestedAction: 'CREATE_NEW',
          confidence: 'troca-string-invalida',
        },
      ],
    })
    expect(checked.success).toBe(false)
    if (checked.success) return
    const issues = contractValidationIssuesFromZodError(checked.error)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.some((i) => i.path.includes('matchingPlan'))).toBe(true)
    expect(issues.every((i) => typeof i.code === 'string' && i.message.length > 0)).toBe(true)
  })

  it('matchingPlan com null em opcionais falha; deepStripNullToUndefined alinha ao Zod', () => {
    const raw = {
      requestId: 'r-null',
      correlationId: 'c-null',
      status: 'partial' as const,
      specialist: 'spec',
      strategy: 'str',
      document: {},
      extractedFacts: [],
      extractedItems: {
        serviceItems: [{ description: 'Serviço' }],
        partItems: [],
        operationalNotes: [],
      },
      warnings: [],
      confidence: { overall: 0.5 },
      draft: null,
      matchingPlan: [
        {
          extractedServiceDescription: 'LINHA',
          suggestedAction: 'REVIEW_SIMILAR' as const,
          confidence: 0.55,
          reusedStructure: {
            activity: 'Macro',
            teamId: null,
            collaboratorId: null,
            plannedMinutes: null,
          },
          subtreeSummary: {
            rootNodeType: 'TASK' as const,
            totalAreas: 2,
            totalActivities: 4,
            totalPlannedMinutes: 100,
            previewActivities: null,
          },
        },
      ],
    }
    expect(argosDocumentIngestResultSchema.safeParse(raw).success).toBe(false)

    const normalized = {
      ...raw,
      matchingPlan: deepStripNullToUndefined(raw.matchingPlan),
    }
    expect(argosDocumentIngestResultSchema.safeParse(normalized).success).toBe(true)
  })

  it('payload realista TASK + matrixSubtree sem campos omitidos obrigatórios passa', () => {
    const sample = {
      requestId: 'req-real',
      correlationId: 'corr-real',
      status: 'partial' as const,
      specialist: 'sgp_argos_local_heuristic_v1',
      strategy: 'local_heuristic_pipeline_v1',
      document: { fileName: 'os.txt', mimeType: 'text/plain' },
      extractedFacts: [],
      extractedItems: {
        serviceItems: [{ description: 'Serviço' }],
        partItems: [],
        operationalNotes: [],
      },
      matchingPlan: [
        {
          extractedServiceDescription: 'LATERAL',
          suggestedAction: 'REVIEW_SIMILAR' as const,
          confidence: 0.61,
          matchedMatrixNodeId: 'tid',
          matchedMatrixNodeType: 'TASK' as const,
          reusedStructure: {
            kind: 'MATRIX_SUBTREE' as const,
            activity: '10 - TASK',
            plannedMinutes: 200,
          },
          subtreeSummary: {
            rootNodeType: 'TASK' as const,
            totalAreas: 3,
            totalActivities: 5,
            totalPlannedMinutes: 200,
          },
          matrixSubtree: {
            rootNodeId: 'tid',
            rootNodeType: 'TASK' as const,
            rootTitle: '10 - TASK',
            totalAreas: 3,
            totalActivities: 5,
            totalPlannedMinutes: 200,
            areas: [],
          },
          alternativeCandidates: [
            {
              matrixNodeId: 'alt-t',
              nodeType: 'TASK' as const,
              kind: 'MATRIX_SUBTREE' as const,
              activity: 'Alt macro',
              confidence: 0.46,
              matchReason: 'Alternativa',
              matrixSubtree: {
                rootNodeId: 'alt-t',
                rootNodeType: 'TASK' as const,
                rootTitle: 'Alt',
                totalAreas: 1,
                totalActivities: 2,
                totalPlannedMinutes: 40,
                areas: [],
              },
            },
          ],
        },
      ],
      draft: null,
      warnings: [],
      confidence: { overall: 0.7 },
    }
    expect(argosDocumentIngestResultSchema.safeParse(sample).success).toBe(true)
  })
})
