import { describe, expect, it } from 'vitest'
import type {
  ArgosMatchingPlanItemV11,
  ArgosMatrixSubtreeV11,
  ConveyorDraft,
} from '../../../domain/argos/draft-v1.types'
import { buildReviewItemKey } from './documentDraftReview'
import {
  applyReviewDecisionsToDraftV11,
  buildCreateConveyorInputForDocumentImport,
  buildDocumentReviewAuditPayload,
  buildValidStepAssigneesFromMatrixActivity,
  buildValidStepAssigneesFromMatrixRow,
  draftV1ToCreateConveyorInput,
  sanitizeCreateConveyorStepAssigneesList,
  validateDocumentReviewAuditIsSafe,
  validateDraftForCreate,
  type DraftToCreateConveyorOptions,
} from './draftToCreateConveyorInput'
import { postConveyorBodySchema } from '../../../../server/src/modules/conveyors/conveyors.schemas.js'
import type { ReviewAcceptanceState } from './documentReviewAcceptance'
import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'
import {
  detectSyntheticSubtreeRollupInCreatePayload,
  detectSyntheticSubtreeRollupInEditableDraft,
  detectSyntheticSubtreeRollupSteps,
  stripOfficialSyntheticRollupFromCreateInputOptions,
  summarizeCreateConveyorInput,
} from './documentImportCreatePayloadDiagnostics'

describe('draftV1ToCreateConveyorInput', () => {
  it('usa origem MANUAL e estrutura mínima quando não há opções no draft', () => {
    const d: ConveyorDraft = {
      schemaVersion: '1.0.0',
      suggestedDados: { title: 'OS teste', clientName: 'Cliente X' },
      options: [],
    }
    const out = draftV1ToCreateConveyorInput(d)
    expect(out.originType).toBe('MANUAL')
    expect(out.matrixRootItemId).toBeNull()
    expect(out.options).toHaveLength(1)
    expect(out.options[0].areas[0].steps).toHaveLength(1)
    expect(out.dados.nome).toBe('OS teste')
    expect(out.dados.cliente).toBe('Cliente X')
  })

  it('validateDraftForCreate exige nome', () => {
    const d: ConveyorDraft = {
      schemaVersion: '1.0.0',
      suggestedDados: { title: '   ' },
      options: [],
    }
    expect(validateDraftForCreate(d)).toMatch(/nome/i)
  })

  it('TD10.5: import Bravo não envia cliente/placa/prazo para POST oficial', () => {
    const d: ConveyorDraft = {
      schemaVersion: '1.1.0',
      suggestedDados: {
        title: '7452',
        clientName: 'Cliente só UI',
        licensePlate: 'AWW2C00',
        estimatedDeadline: '01/01/2099',
        vehicleDescription: 'GOL',
      },
      options: [],
      warnings: [],
      humanReviewRequired: true,
    }
    const opts: DraftToCreateConveyorOptions = { bravoOsDocumentImport: true }
    const out = draftV1ToCreateConveyorInput(d, opts)
    expect(out.dados.cliente).toBe('')
    expect(out.dados.placa).toBe('')
    expect(out.dados.prazoEstimado).toBe('')
    expect(out.dados.veiculo).toMatch(/GOL/)
  })

  it('aceita draft 1.1.0 sem quebrar materialização oficial', () => {
    const d: ConveyorDraft = {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'OS Bravo 101', clientName: 'Cliente X' },
      options: [],
      warnings: [],
      humanReviewRequired: true,
    }
    const out = draftV1ToCreateConveyorInput(d)
    expect(out.originType).toBe('MANUAL')
    expect(out.dados.nome).toBe('OS Bravo 101')
  })

  it('validateDraftForCreate bloqueia observações comerciais Bravo nas notas do ingest', () => {
    const d: ConveyorDraft = {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'Esteira OK' },
      options: [],
      warnings: [],
      humanReviewRequired: true,
    }
    expect(
      validateDraftForCreate(d, ['Esse orçamento possui validade de 30 dias']),
    ).toContain('financeiro')
  })

  it('validateDraftForCreate bloqueia conteúdo financeiro no draft editável', () => {
    const d: ConveyorDraft = {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'Esteira OK' },
      options: [
        {
          orderIndex: 1,
          title: 'Opção',
          areas: [
            {
              orderIndex: 1,
              title: 'Área',
              steps: [{ orderIndex: 1, title: '16816,36', plannedMinutes: 0 }],
            },
          ],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    }
    expect(validateDraftForCreate(d)).toContain('financeiro')
  })

  it('remove etapas só com valor monetário ao materializar POST', () => {
    const d: ConveyorDraft = {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'Esteira' },
      options: [
        {
          orderIndex: 1,
          title: 'Opção',
          areas: [
            {
              orderIndex: 1,
              title: 'Área',
              steps: [
                { orderIndex: 1, title: '16816,36', plannedMinutes: 0 },
                { orderIndex: 2, title: 'Serviço real', plannedMinutes: 0 },
              ],
            },
          ],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    }
    const out = draftV1ToCreateConveyorInput(d)
    expect(out.options[0]?.areas[0]?.steps.map((s) => s.titulo)).toEqual(['Serviço real'])
    expect(JSON.stringify(out)).not.toContain('16816')
  })
})

function twoStepDraft(): ConveyorDraft {
  return {
    schemaVersion: '1.1.0',
    suggestedDados: { title: 'Esteira teste' },
    options: [
      {
        orderIndex: 1,
        title: 'Opção',
        areas: [
          {
            orderIndex: 1,
            title: 'Área',
            steps: [
              { orderIndex: 1, title: 'Primeiro', plannedMinutes: 5 },
              { orderIndex: 2, title: 'Segundo', plannedMinutes: 7 },
            ],
          },
        ],
      },
    ],
    warnings: [],
    humanReviewRequired: true,
  }
}

describe('applyReviewDecisionsToDraftV11', () => {
  it('ACCEPT_SUGGESTED aplica plannedMinutes de reusedStructure principal', () => {
    const d = twoStepDraft()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'S1',
        suggestedAction: 'REVIEW_SIMILAR',
        reusedStructure: { plannedMinutes: 42 },
      },
      {
        extractedServiceDescription: 'S2',
        suggestedAction: 'CREATE_NEW',
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const k1 = buildReviewItemKey(plan[1]!, 1)
    const acc: ReviewAcceptanceState = {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
      [k1]: {
        itemKey: k1,
        currentDecision: 'CONFIRM_CREATE_NEW',
        updatedAt: new Date().toISOString(),
      },
    }
    const out = applyReviewDecisionsToDraftV11(d, plan, acc)
    expect(out.options[0]!.areas[0]!.steps[0]!.plannedMinutes).toBe(42)
    expect(out.options[0]!.areas[0]!.steps[1]!.plannedMinutes).toBe(7)
  })

  it('SELECT_ALTERNATIVE usa plannedMinutes do candidato alternativo', () => {
    const d = twoStepDraft()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'S1',
        suggestedAction: 'REVIEW_SIMILAR',
        reusedStructure: { plannedMinutes: 10 },
        alternativeCandidates: [
          {
            matrixNodeId: 'alt-a',
            activity: 'Atividade matriz B',
            plannedMinutes: 88,
            confidence: 0.77,
            matchReason: 'like',
          },
        ],
      },
      {
        extractedServiceDescription: 'S2',
        suggestedAction: 'CREATE_NEW',
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const k1 = buildReviewItemKey(plan[1]!, 1)
    const acc: ReviewAcceptanceState = {
      [k0]: {
        itemKey: k0,
        currentDecision: 'SELECT_ALTERNATIVE',
        selectedAlternativeMatrixNodeId: 'alt-a',
        updatedAt: new Date().toISOString(),
      },
      [k1]: {
        itemKey: k1,
        currentDecision: 'CONFIRM_CREATE_NEW',
        updatedAt: new Date().toISOString(),
      },
    }
    const out = applyReviewDecisionsToDraftV11(d, plan, acc)
    expect(out.options[0]!.areas[0]!.steps[0]!.plannedMinutes).toBe(88)
    expect(out.options[0]!.areas[0]!.steps[0]!.title).toBe('Atividade matriz B')
    const payload = draftV1ToCreateConveyorInput(out)
    expect(payload.options[0]!.areas[0]!.steps[0]!.sourceOrigin).toBe('reaproveitada')
  })

  it('IGNORE_ITEM remove etapa alinhada ao índice', () => {
    const d = twoStepDraft()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'S1',
        suggestedAction: 'REVIEW_SIMILAR',
      },
      {
        extractedServiceDescription: 'S2',
        suggestedAction: 'CREATE_NEW',
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const k1 = buildReviewItemKey(plan[1]!, 1)
    const acc: ReviewAcceptanceState = {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
      [k1]: {
        itemKey: k1,
        currentDecision: 'IGNORE_ITEM',
        updatedAt: new Date().toISOString(),
      },
    }
    const out = applyReviewDecisionsToDraftV11(d, plan, acc)
    expect(out.options[0]!.areas[0]!.steps).toHaveLength(1)
    expect(out.options[0]!.areas[0]!.steps[0]!.title).toBe('Primeiro')
    expect(out.options[0]!.areas[0]!.steps[0]!.orderIndex).toBe(1)
  })

  it('plano com suggestedAction IGNORE remove etapa sem decisão do revisor', () => {
    const d = twoStepDraft()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'S1',
        suggestedAction: 'REUSE_EXISTING',
        reusedStructure: { plannedMinutes: 3 },
      },
      {
        extractedServiceDescription: 'ignorar',
        suggestedAction: 'IGNORE',
      },
    ]
    const out = applyReviewDecisionsToDraftV11(d, plan, {})
    expect(out.options[0]!.areas[0]!.steps).toHaveLength(1)
  })

  it('ACCEPT_SUGGESTED reaproveita título da atividade da Matriz', () => {
    const d = twoStepDraft()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'S1',
        suggestedAction: 'REVIEW_SIMILAR',
        matchedMatrixNodeId: '11111111-1111-4111-8111-111111111111',
        reusedStructure: { plannedMinutes: 25, activity: 'Atividade Matriz Principal' },
      },
      {
        extractedServiceDescription: 'S2',
        suggestedAction: 'CREATE_NEW',
      },
    ]
    const key = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [key]: {
        itemKey: key,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
      [buildReviewItemKey(plan[1]!, 1)]: {
        itemKey: buildReviewItemKey(plan[1]!, 1),
        currentDecision: 'CONFIRM_CREATE_NEW',
        updatedAt: new Date().toISOString(),
      },
    })
    expect(out.options[0]!.areas[0]!.steps[0]!.title).toBe('Atividade Matriz Principal')
    const payload = draftV1ToCreateConveyorInput(out)
    expect(payload.options[0]!.areas[0]!.steps[0]!.sourceOrigin).toBe('reaproveitada')
    expect(payload.matrixRootItemId).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('validateDraftForCreate bloqueia pendências de revisão obrigatória', () => {
    const d = twoStepDraft()
    expect(
      validateDraftForCreate(d, undefined, { hasPendingRequiredReviewDecisions: true }),
    ).toContain('Revise e confirme')
  })

  it('validateDraftForCreate bloqueia payload com candidateLines/debug', () => {
    const d = twoStepDraft() as ConveyorDraft & {
      extensions: Record<string, unknown>
    }
    d.extensions = { candidateLines: ['foo'], debugLines: ['bar'] }
    expect(validateDraftForCreate(d)).toContain('debug')
  })

  it('validateDraftForCreate bloqueia payload com partItems acidentais', () => {
    const d = twoStepDraft() as ConveyorDraft & {
      extensions: Record<string, unknown>
    }
    d.extensions = { partItems: [{ description: 'peca' }] }
    expect(validateDraftForCreate(d)).toContain('partItems')
  })

  const sampleTaskSubtree = (): ArgosMatrixSubtreeV11 => ({
    rootNodeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    rootNodeType: 'TASK',
    rootTitle: '10 - LATERAIS TRASEIRAS',
    totalAreas: 1,
    totalActivities: 2,
    totalPlannedMinutes: 75,
    areas: [
      {
        matrixNodeId: 'sec-1',
        title: 'Laterais',
        orderIndex: 1,
        plannedMinutes: 75,
        activities: [
          {
            matrixNodeId: 'a1111111-1111-4111-8111-111111111111',
            title: 'Etapa matriz 1',
            orderIndex: 1,
            plannedMinutes: 40,
            teamId: 'e1111111-1111-4111-8111-111111111111',
            teamName: 'Equipe teste',
          },
          {
            matrixNodeId: 'a2222222-2222-4222-8222-222222222222',
            title: 'Etapa matriz 2',
            orderIndex: 2,
            plannedMinutes: 35,
          },
        ],
      },
    ],
  })

  function oneStepDraft(): ConveyorDraft {
    return {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'Esteira' },
      options: [
        {
          orderIndex: 1,
          title: 'Itens inferidos',
          areas: [
            {
              orderIndex: 1,
              title: 'Serviço',
              steps: [{ orderIndex: 1, title: 'LINHA OS', plannedMinutes: 0 }],
            },
          ],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    }
  }

  it('S9: ACCEPT_SUGGESTED TASK MATRIX_SUBTREE expande nova opção com etapas e minutos', () => {
    const d = oneStepDraft()
    const st = sampleTaskSubtree()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'LATERAL TRASEIRA',
        suggestedAction: 'REVIEW_SIMILAR',
        matchedMatrixNodeId: st.rootNodeId,
        matchedMatrixNodeType: 'TASK',
        reusedStructure: {
          kind: 'MATRIX_SUBTREE',
          activity: st.rootTitle,
          plannedMinutes: st.totalPlannedMinutes,
        },
        matrixSubtree: st,
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
    })
    expect(out.options).toHaveLength(1)
    expect(out.options[0]!.title).toBe(st.rootTitle)
    expect(out.options[0]!.areas[0]!.steps).toHaveLength(2)
    expect(out.options[0]!.areas[0]!.steps[0]!.plannedMinutes).toBe(40)
    expect(out.options[0]!.areas[0]!.steps[0]!.title).toBe('Etapa matriz 1')
    const payload = draftV1ToCreateConveyorInput(out)
    expect(payload.options[0]!.areas[0]!.steps[0]!.sourceOrigin).toBe('reaproveitada')
    expect(payload.options[0]!.areas[0]!.steps[0]!.plannedMinutes).toBe(40)
    expect(payload.options[0]!.areas[0]!.steps[0]!.assignees?.length).toBeGreaterThan(0)
  })

  it('S9: SELECT_ALTERNATIVE usa matrixSubtree da alternativa (TASK)', () => {
    const d = oneStepDraft()
    const altSubtree: ArgosMatrixSubtreeV11 = {
      ...sampleTaskSubtree(),
      rootNodeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      rootTitle: 'Alternativa TASK',
      areas: [
        {
          matrixNodeId: 'sec-alt',
          title: 'Área alt',
          orderIndex: 1,
          activities: [
            {
              matrixNodeId: 'alt-act',
              title: 'Só alternativa',
              orderIndex: 1,
              plannedMinutes: 99,
            },
          ],
        },
      ],
      totalActivities: 1,
      totalPlannedMinutes: 99,
    }
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'SERVICO',
        suggestedAction: 'REVIEW_SIMILAR',
        matchedMatrixNodeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        matchedMatrixNodeType: 'TASK',
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: 'Principal' },
        matrixSubtree: sampleTaskSubtree(),
        alternativeCandidates: [
          {
            matrixNodeId: altSubtree.rootNodeId,
            nodeType: 'TASK',
            kind: 'MATRIX_SUBTREE',
            activity: altSubtree.rootTitle,
            plannedMinutes: altSubtree.totalPlannedMinutes,
            confidence: 0.72,
            matchReason: 'alt',
            matrixSubtree: altSubtree,
          },
        ],
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: {
        itemKey: k0,
        currentDecision: 'SELECT_ALTERNATIVE',
        selectedAlternativeMatrixNodeId: altSubtree.rootNodeId,
        updatedAt: new Date().toISOString(),
      },
    })
    expect(out.options[0]!.title).toBe('Alternativa TASK')
    expect(out.options[0]!.areas[0]!.steps[0]!.plannedMinutes).toBe(99)
  })

  it('S9: duas linhas OS mesma TASK — materializa subárvore uma vez', () => {
    const d = twoStepDraft()
    const st = sampleTaskSubtree()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'A',
        suggestedAction: 'REVIEW_SIMILAR',
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: st.rootTitle },
        matrixSubtree: st,
      },
      {
        extractedServiceDescription: 'B',
        suggestedAction: 'REVIEW_SIMILAR',
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: st.rootTitle },
        matrixSubtree: st,
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const k1 = buildReviewItemKey(plan[1]!, 1)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
      [k1]: {
        itemKey: k1,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
    })
    expect(out.options.filter((o) => o.title === st.rootTitle)).toHaveLength(1)
    expect(out.options[0]!.title).toBe(st.rootTitle)
    expect(out.options[0]!.areas[0]!.steps).toHaveLength(2)
  })

  it('S9: SECTOR MATRIX_SUBTREE acrescenta áreas na opção base', () => {
    const d = oneStepDraft()
    const sectorSub: ArgosMatrixSubtreeV11 = {
      rootNodeId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      rootNodeType: 'SECTOR',
      rootTitle: 'Setor tapeçaria',
      totalAreas: 1,
      totalActivities: 1,
      totalPlannedMinutes: 50,
      areas: [
        {
          matrixNodeId: 'sec-z',
          title: 'Área setor',
          orderIndex: 1,
          activities: [
            {
              matrixNodeId: 'act-z',
              title: 'Passo único',
              orderIndex: 1,
              plannedMinutes: 50,
            },
          ],
        },
      ],
    }
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'X',
        suggestedAction: 'REVIEW_SIMILAR',
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: 'macro' },
        matrixSubtree: sectorSub,
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
    })
    expect(out.options).toHaveLength(1)
    expect(out.options[0]!.areas).toHaveLength(1)
    expect(out.options[0]!.areas[0]!.title).toBe('Área setor')
    expect(out.options[0]!.areas[0]!.steps[0]!.plannedMinutes).toBe(50)
  })

  it('S9.4: MATRIX_SUBTREE sem áreas não injeta etapa-sumo da TASK no Serviço', () => {
    const d = oneStepDraft()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'VOLANTE',
        suggestedAction: 'REVIEW_SIMILAR',
        matchedMatrixNodeType: 'TASK',
        reusedStructure: {
          kind: 'MATRIX_SUBTREE',
          activity: '16 - VOLANTE',
          plannedMinutes: 250,
        },
        matrixSubtree: {
          rootNodeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          rootNodeType: 'TASK',
          rootTitle: '16 - VOLANTE',
          totalAreas: 0,
          totalActivities: 0,
          totalPlannedMinutes: 250,
          areas: [],
        },
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
    })
    const step0 = out.options[0]!.areas[0]!.steps[0]!
    expect(step0.title).toBe('LINHA OS')
    expect(step0.plannedMinutes).toBe(0)
  })

  it('S9.4.1: TASK — remove opção Serviço vazia; só áreas PREPARAÇÃO/CORTE e folhas', () => {
    const d = oneStepDraft()
    const rootTitle = '16 - VOLANTE'
    const st: ArgosMatrixSubtreeV11 = {
      rootNodeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      rootNodeType: 'TASK',
      rootTitle,
      totalAreas: 2,
      totalActivities: 3,
      totalPlannedMinutes: 250,
      areas: [
        {
          matrixNodeId: 'sec-prep',
          title: 'PREPARAÇÃO',
          orderIndex: 1,
          activities: [
            {
              matrixNodeId: 'a1111111-1111-4111-8111-111111111111',
              title: 'Remover revestimento',
              orderIndex: 1,
              plannedMinutes: 60,
            },
          ],
        },
        {
          matrixNodeId: 'sec-corte',
          title: 'CORTE',
          orderIndex: 2,
          activities: [
            {
              matrixNodeId: 'a2222222-2222-4222-8222-222222222222',
              title: 'Corte couro',
              orderIndex: 1,
              plannedMinutes: 45,
            },
            {
              matrixNodeId: 'a3333333-3333-4333-8333-333333333333',
              title: 'Limpar',
              orderIndex: 2,
              plannedMinutes: 30,
            },
          ],
        },
      ],
    }
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'VOLANTE',
        suggestedAction: 'REVIEW_SIMILAR',
        matchedMatrixNodeType: 'TASK',
        matrixSubtree: st,
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: rootTitle, plannedMinutes: 250 },
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
    })
    expect(out.options).toHaveLength(1)
    expect(out.options[0]!.title).toBe(rootTitle)
    expect(out.options[0]!.areas[0]!.title).toBe('PREPARAÇÃO')
    const payload = draftV1ToCreateConveyorInput(out)
    expect(payload.options[0]!.areas.map((a) => a.titulo)).toEqual(['PREPARAÇÃO', 'CORTE'])
    const stepsFlat = payload.options[0]!.areas.flatMap((a) => a.steps)
    expect(stepsFlat.some((s) => s.titulo === rootTitle)).toBe(false)
    expect(stepsFlat.some((s) => s.plannedMinutes === 250)).toBe(false)
    expect(stepsFlat.map((s) => s.titulo)).toEqual([
      'Remover revestimento',
      'Corte couro',
      'Limpar',
    ])
  })

  it('S9.4.1: LATERAIS TRASEIRAS — nenhum step com título da TASK raiz', () => {
    const d = oneStepDraft()
    const st = sampleTaskSubtree()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'LAT',
        suggestedAction: 'REVIEW_SIMILAR',
        matrixSubtree: st,
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: st.rootTitle },
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
    })
    const payload = draftV1ToCreateConveyorInput(out)
    const titles = payload.options[0]!.areas.flatMap((a) => a.steps.map((s) => s.titulo))
    expect(titles.some((t) => t === st.rootTitle)).toBe(false)
  })
})

describe('S9.4 — múltiplos times e materialização de folhas', () => {
  const uuidC = 'c3333333-3333-4333-8333-333333333333'
  const t1 = 'a1111111-1111-4111-8111-111111111111'
  const t2 = 'a2222222-2222-4222-8222-222222222222'
  const t3 = 'a3333333-3333-4333-8333-333333333333'
  const t4 = 'a4444444-4444-4444-8444-444444444444'
  const t5 = 'a5555555-5555-4555-8555-555555555555'

  it('buildValidStepAssigneesFromMatrixActivity: colaborador + dois times', () => {
    const a = buildValidStepAssigneesFromMatrixActivity({
      collaboratorId: uuidC,
      teamAssignments: [{ teamId: t1 }, { teamId: t2 }],
    })
    expect(a).toHaveLength(3)
    expect(a[0]!.type).toBe('COLLABORATOR')
    expect(a.filter((x) => x.type === 'TEAM')).toHaveLength(2)
  })

  it('buildValidStepAssigneesFromMatrixActivity: cinco times válidos', () => {
    const a = buildValidStepAssigneesFromMatrixActivity({
      teamAssignments: [
        { teamId: t1 },
        { teamId: t2 },
        { teamId: t3 },
        { teamId: t4 },
        { teamId: t5 },
      ],
    })
    expect(a.filter((x) => x.type === 'TEAM')).toHaveLength(5)
  })

  it('buildValidStepAssigneesFromMatrixActivity: ignora teamId inválido na lista', () => {
    const a = buildValidStepAssigneesFromMatrixActivity({
      teamAssignments: [{ teamId: null }, { teamId: '' }, { teamId: t1 }],
    })
    expect(a).toHaveLength(1)
    expect(a[0]!.teamId).toBe(t1)
  })

  it('MATRIX_SUBTREE: folhas com teamAssignments no POST', () => {
    const d = {
      schemaVersion: '1.1.0' as const,
      suggestedDados: { title: 'E' },
      options: [
        {
          orderIndex: 1,
          title: 'Opção',
          areas: [{ orderIndex: 1, title: 'Serviço', steps: [{ orderIndex: 1, title: 'X', plannedMinutes: 0 }] }],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    } satisfies ConveyorDraft
    const st: ArgosMatrixSubtreeV11 = {
      rootNodeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      rootNodeType: 'TASK',
      rootTitle: 'Macro',
      totalAreas: 1,
      totalActivities: 1,
      totalPlannedMinutes: 999,
      areas: [
        {
          matrixNodeId: 'sec-x',
          title: 'Área',
          orderIndex: 1,
          activities: [
            {
              matrixNodeId: 'f1111111-1111-4111-8111-111111111111',
              title: 'Folha',
              orderIndex: 1,
              plannedMinutes: 30,
              defaultResponsibleId: uuidC,
              teamAssignments: [{ teamId: t1 }, { teamId: t2 }],
            },
          ],
        },
      ],
    }
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'S',
        suggestedAction: 'REVIEW_SIMILAR',
        matrixSubtree: st,
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: st.rootTitle },
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: { itemKey: k0, currentDecision: 'ACCEPT_SUGGESTED', updatedAt: new Date().toISOString() },
    })
    const payload = draftV1ToCreateConveyorInput(out)
    const json = JSON.stringify(payload)
    expect(json.includes('"teamId":null')).toBe(false)
    const step = payload.options[0]!.areas[0]!.steps[0]!
    const teams = step.assignees?.filter((x) => x.type === 'TEAM') ?? []
    expect(teams).toHaveLength(2)
    expect(step.assignees?.some((x) => x.type === 'COLLABORATOR')).toBe(true)
    expect(payload.options[0]!.areas[0]!.steps[0]!.titulo).toBe('Folha')
    expect(step.plannedMinutes).toBe(30)
    expect(step.plannedMinutes).not.toBe(st.totalPlannedMinutes)
  })
})

describe('S9.2.4 — assignees sem null no POST /conveyors', () => {
  /** Variantes RFC válidas para `optionalUuid` (grupo 4 ∈ 8/9/a/b). */
  const uuidT = 'e1111111-1111-4111-8111-111111111111'
  const uuidC = 'f2222222-2222-4222-8222-222222222222'

  it('buildValidStepAssigneesFromMatrixRow: time válido — sem collaboratorId', () => {
    const a = buildValidStepAssigneesFromMatrixRow({
      teamId: uuidT,
      collaboratorId: null,
      assignmentOrigin: 'reaproveitada',
    })
    expect(a).toHaveLength(1)
    expect(a[0]!.type).toBe('TEAM')
    expect(a[0]!.teamId).toBe(uuidT)
    expect('collaboratorId' in a[0]! && (a[0] as { collaboratorId?: unknown }).collaboratorId).toBe(
      false,
    )
    expect(a[0]!.isPrimary).toBe(false)
  })

  it('buildValidStepAssigneesFromMatrixRow: colaborador válido — sem teamId', () => {
    const a = buildValidStepAssigneesFromMatrixRow({
      teamId: null,
      collaboratorId: uuidC,
      assignmentOrigin: 'reaproveitada',
    })
    expect(a[0]!.type).toBe('COLLABORATOR')
    expect(a[0]!.collaboratorId).toBe(uuidC)
    expect('teamId' in a[0]! && (a[0] as { teamId?: unknown }).teamId).toBe(false)
    expect(a[0]!.isPrimary).toBe(true)
  })

  it('buildValidStepAssigneesFromMatrixRow: colaborador + time (ambos materializados)', () => {
    const a = buildValidStepAssigneesFromMatrixRow({
      teamId: uuidT,
      collaboratorId: uuidC,
    })
    expect(a).toHaveLength(2)
    expect(a[0]!.type).toBe('COLLABORATOR')
    expect(a[0]!.isPrimary).toBe(true)
    expect(a[1]!.type).toBe('TEAM')
    expect(a[1]!.isPrimary).toBe(false)
  })

  it('sanitizeCreateConveyorStepAssigneesList remove TEAM com teamId null', () => {
    const s = sanitizeCreateConveyorStepAssigneesList([
      {
        type: 'TEAM',
        teamId: null as unknown as string,
        collaboratorId: null as unknown as string,
        isPrimary: false,
      },
    ])
    expect(s).toEqual([])
  })

  it('sanitizeCreateConveyorStepAssigneesList remove objetos inválidos', () => {
    expect(sanitizeCreateConveyorStepAssigneesList([])).toEqual([])
  })

  it('MATRIX_SUBTREE: payload completo passa postConveyorBodySchema e JSON sem null em ids', () => {
    const d = {
      schemaVersion: '1.1.0' as const,
      suggestedDados: { title: 'Esteira S924' },
      options: [
        {
          orderIndex: 1,
          title: 'Opção',
          areas: [
            {
              orderIndex: 1,
              title: 'Serviço',
              steps: [{ orderIndex: 1, title: 'LINHA OS', plannedMinutes: 0 }],
            },
          ],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    } satisfies ConveyorDraft
    const st: ArgosMatrixSubtreeV11 = {
      rootNodeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      rootNodeType: 'TASK',
      rootTitle: 'TASK',
      totalAreas: 1,
      totalActivities: 2,
      totalPlannedMinutes: 75,
      areas: [
        {
          matrixNodeId: 'sec-1',
          title: 'A',
          orderIndex: 1,
          activities: [
            {
              matrixNodeId: 'a1111111-1111-4111-8111-111111111111',
              title: 'Com time',
              orderIndex: 1,
              plannedMinutes: 40,
              teamId: uuidT,
            },
            {
              matrixNodeId: 'a2222222-2222-4222-8222-222222222222',
              title: 'Sem responsável',
              orderIndex: 2,
              plannedMinutes: 35,
            },
          ],
        },
      ],
    }
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'X',
        suggestedAction: 'REVIEW_SIMILAR',
        matchedMatrixNodeType: 'TASK',
        matrixSubtree: st,
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: st.rootTitle },
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
    })
    const payload = draftV1ToCreateConveyorInput(out)
    const json = JSON.stringify(payload)
    expect(json.includes('"teamId":null')).toBe(false)
    expect(json.includes('"collaboratorId":null')).toBe(false)
    expect(json.includes('"assignees":[{}]')).toBe(false)
    const parsed = postConveyorBodySchema.safeParse(payload)
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.format())).toBe(true)
    const subtreeSteps = payload.options[0]!.areas[0]!.steps
    expect(subtreeSteps[0]!.assignees?.length).toBeGreaterThan(0)
    expect(
      subtreeSteps[0]!.assignees?.every((as) => as.type !== 'TEAM' || as.isPrimary === false),
    ).toBe(true)
    expect(subtreeSteps[1]!.assignees ?? []).toEqual([])
  })

  it('ACCEPT_SUGGESTED MATRIX_ACTIVITY sem responsável: assignees vazio', () => {
    const d: ConveyorDraft = {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'T' },
      options: [
        {
          orderIndex: 1,
          title: 'Opção',
          areas: [
            {
              orderIndex: 1,
              title: 'Área',
              steps: [{ orderIndex: 1, title: 'Etapa', plannedMinutes: 30 }],
            },
          ],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    }
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'S',
        suggestedAction: 'REUSE_EXISTING',
        matchedMatrixNodeId: '11111111-1111-4111-8111-111111111111',
        matchedMatrixNodeType: 'ACTIVITY',
        reusedStructure: {
          kind: 'MATRIX_ACTIVITY',
          activity: 'Da matriz',
          plannedMinutes: 30,
        },
      },
    ]
    const k0 = buildReviewItemKey(plan[0]!, 0)
    const out = applyReviewDecisionsToDraftV11(d, plan, {
      [k0]: {
        itemKey: k0,
        currentDecision: 'ACCEPT_SUGGESTED',
        updatedAt: new Date().toISOString(),
      },
    })
    const payload = draftV1ToCreateConveyorInput(out)
    expect(payload.options[0]!.areas[0]!.steps[0]!.assignees ?? []).toEqual([])
    expect(postConveyorBodySchema.safeParse(payload).success).toBe(true)
  })
})

function buildIngestForAudit(plan: ArgosMatchingPlanItemV11[]): ArgosDocumentIngestResult {
  return {
    requestId: 'req-1',
    correlationId: 'corr-1',
    status: 'partial',
    specialist: 'spec',
    strategy: 'strat',
    document: {},
    extractedFacts: [],
    warnings: [],
    confidence: { overall: 0.8 },
    sourceDocument: {
      provider: 'BRAVO',
      documentType: 'OS_OR_BUDGET',
      documentNumber: '7452',
    },
    extractedItems: {
      serviceItems: plan.map((p) => ({ description: p.extractedServiceDescription })),
      partItems: [],
      operationalNotes: [],
    },
    draft: {
      schemaVersion: '1.1.0',
      suggestedDados: {},
      options: [],
      warnings: [],
      humanReviewRequired: true,
    },
    matchingPlan: plan,
  }
}

describe('documentReviewAudit payload', () => {
  function oneStepLikeDraft(): ConveyorDraft {
    return {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'E' },
      options: [
        {
          orderIndex: 1,
          title: 'O',
          areas: [
            {
              orderIndex: 1,
              title: 'Serviço',
              steps: [{ orderIndex: 1, title: 'X', plannedMinutes: 0 }],
            },
          ],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    }
  }

  it('S9: expansão de subárvore aparece no resumo e nas decisões', () => {
    const st: ArgosMatrixSubtreeV11 = {
      rootNodeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      rootNodeType: 'TASK',
      rootTitle: '10 - LATERAIS',
      totalAreas: 1,
      totalActivities: 2,
      totalPlannedMinutes: 80,
      areas: [
        {
          matrixNodeId: 's1',
          title: 'A',
          orderIndex: 1,
          activities: [
            { matrixNodeId: 'a1', title: 'E1', orderIndex: 1, plannedMinutes: 40 },
            { matrixNodeId: 'a2', title: 'E2', orderIndex: 2, plannedMinutes: 40 },
          ],
        },
      ],
    }
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'S1',
        suggestedAction: 'REUSE_EXISTING',
        matchedMatrixNodeId: st.rootNodeId,
        matchedMatrixNodeType: 'TASK',
        reusedStructure: { kind: 'MATRIX_SUBTREE', activity: st.rootTitle },
        matrixSubtree: st,
      },
    ]
    const acc: ReviewAcceptanceState = {}
    const finalDraft = applyReviewDecisionsToDraftV11(oneStepLikeDraft(), plan, acc)
    const audit = buildDocumentReviewAuditPayload({
      ingest: buildIngestForAudit(plan),
      acceptance: acc,
      finalDraft,
    })
    expect(audit?.summary.expandedSubtreeDecisionsCount).toBe(1)
    expect(audit?.summary.uniqueSubtreeRootsMaterialized).toBe(1)
    expect(audit?.decisions[0]?.expandedSubtree).toBe(true)
    expect(audit?.decisions[0]?.expandedActivitiesCount).toBe(2)
  })

  it('gera auditoria com source/request/correlation e contagens', () => {
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'Servico A',
        suggestedAction: 'REUSE_EXISTING',
        matchedMatrixNodeId: '11111111-1111-4111-8111-111111111111',
        reusedStructure: { plannedMinutes: 30, activity: 'Matriz A' },
      },
      {
        extractedServiceDescription: 'Servico B',
        suggestedAction: 'REVIEW_SIMILAR',
        alternativeCandidates: [
          {
            matrixNodeId: '22222222-2222-4222-8222-222222222222',
            activity: 'Matriz B',
            plannedMinutes: 40,
            confidence: 0.7,
            matchReason: 'like',
          },
        ],
      },
      {
        extractedServiceDescription: 'Servico C',
        suggestedAction: 'CREATE_NEW',
      },
      {
        extractedServiceDescription: 'Servico D',
        suggestedAction: 'IGNORE',
      },
    ]
    const draft = twoStepDraft()
    draft.options[0]!.areas[0]!.steps.push({
      orderIndex: 3,
      title: 'Terceiro',
      plannedMinutes: 15,
    })
    draft.options[0]!.areas[0]!.steps.push({
      orderIndex: 4,
      title: 'Quarto',
      plannedMinutes: 10,
    })
    const acceptance: ReviewAcceptanceState = {
      [buildReviewItemKey(plan[1]!, 1)]: {
        itemKey: buildReviewItemKey(plan[1]!, 1),
        currentDecision: 'SELECT_ALTERNATIVE',
        selectedAlternativeMatrixNodeId: '22222222-2222-4222-8222-222222222222',
        updatedAt: new Date().toISOString(),
      },
      [buildReviewItemKey(plan[2]!, 2)]: {
        itemKey: buildReviewItemKey(plan[2]!, 2),
        currentDecision: 'CONFIRM_CREATE_NEW',
        updatedAt: new Date().toISOString(),
      },
    }
    const finalDraft = applyReviewDecisionsToDraftV11(draft, plan, acceptance)
    const audit = buildDocumentReviewAuditPayload({
      ingest: buildIngestForAudit(plan),
      acceptance,
      finalDraft,
    })
    expect(audit).not.toBeNull()
    expect(audit!.source.provider).toBe('BRAVO')
    expect(audit!.source.documentNumber).toBe('7452')
    expect(audit!.source.requestId).toBe('req-1')
    expect(audit!.source.correlationId).toBe('corr-1')
    expect(audit!.summary.reusedCount).toBe(2)
    expect(audit!.summary.selectedAlternativeCount).toBe(1)
    expect(audit!.summary.createNewConfirmedCount).toBe(1)
    expect(audit!.summary.ignoredCount).toBe(1)
    expect(audit!.decisions[1]!.selectedAlternativeMatrixNodeId).toBe(
      '22222222-2222-4222-8222-222222222222',
    )
  })

  it('payload final anexa metadata.documentReviewAudit quando fornecido', () => {
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'Servico A',
        suggestedAction: 'REUSE_EXISTING',
        matchedMatrixNodeId: '11111111-1111-4111-8111-111111111111',
        reusedStructure: { plannedMinutes: 30, activity: 'Matriz A' },
      },
    ]
    const acceptance: ReviewAcceptanceState = {}
    const finalDraft = applyReviewDecisionsToDraftV11(twoStepDraft(), plan, acceptance)
    const audit = buildDocumentReviewAuditPayload({
      ingest: buildIngestForAudit(plan),
      acceptance,
      finalDraft,
    })
    const out = draftV1ToCreateConveyorInput(finalDraft, {
      documentReviewAudit: audit ?? undefined,
    })
    expect(out.metadata?.documentReviewAudit?.schemaVersion).toBe(
      'r6_document_review_audit_v1',
    )
    const serialized = JSON.stringify(out.metadata).toLowerCase()
    expect(serialized.includes('clientname')).toBe(false)
    expect(serialized.includes('licenseplate')).toBe(false)
    expect(serialized.includes('partitems')).toBe(false)
    expect(serialized.includes('debug')).toBe(false)
  })

  it('valida auditoria insegura e bloqueia com mensagem', () => {
    const unsafe = {
      schemaVersion: 'r6_document_review_audit_v1',
      source: {
        provider: 'BRAVO',
        documentType: 'OS_OR_BUDGET',
        requestId: 'r',
        correlationId: 'c',
      },
      summary: {
        totalServiceItems: 1,
        reusedCount: 0,
        acceptedSimilarCount: 0,
        selectedAlternativeCount: 0,
        createNewConfirmedCount: 0,
        ignoredCount: 0,
      },
      decisions: [
        {
          index: 0,
          extractedServiceDescription: 'Pagamento em dinheiro',
          finalDecision: 'CONFIRM_CREATE_NEW',
          finalSourceOrigin: 'manual',
        },
      ],
    } as unknown as NonNullable<
      DraftToCreateConveyorOptions['documentReviewAudit']
    >
    expect(validateDocumentReviewAuditIsSafe(unsafe)).toBeTruthy()
  })
})

describe('S9.4.2 — diagnóstico etapa sintética TASK (15 - BANCOS DIANTEIROS)', () => {
  const rootTitle = '15 - BANCOS DIANTEIROS'

  function matrixSubtreeFixture(): ArgosMatrixSubtreeV11 {
    return {
      rootNodeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      rootNodeType: 'TASK',
      rootTitle,
      totalAreas: 2,
      totalActivities: 3,
      totalPlannedMinutes: 825,
      areas: [
        {
          matrixNodeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          title: 'PREPARAÇÃO',
          orderIndex: 1,
          activities: [
            {
              matrixNodeId: 'c1111111-1111-4111-8111-111111111111',
              title: 'Remover revestimento',
              orderIndex: 1,
              plannedMinutes: 10,
            },
            {
              matrixNodeId: 'c2222222-2222-4222-8222-222222222222',
              title: 'Limpar',
              orderIndex: 2,
              plannedMinutes: 10,
            },
          ],
        },
        {
          matrixNodeId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          title: 'CORTE',
          orderIndex: 2,
          activities: [
            {
              matrixNodeId: 'c3333333-3333-4333-8333-333333333333',
              title: 'Corte couro',
              orderIndex: 1,
              plannedMinutes: 40,
            },
          ],
        },
      ],
    }
  }

  function draftFixture(): ConveyorDraft {
    return {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'Esteira doc' },
      options: [
        {
          orderIndex: 1,
          title: 'Itens inferidos do documento',
          areas: [
            {
              orderIndex: 1,
              title: 'Serviço',
              steps: [{ orderIndex: 1, title: rootTitle, plannedMinutes: 0 }],
            },
          ],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    }
  }

  it('applyReviewDecisions → POST: sem rollup sintético; detector vazio; primeira área PREPARAÇÃO', () => {
    const ms = matrixSubtreeFixture()
    const plan: ArgosMatchingPlanItemV11[] = [
      {
        extractedServiceDescription: 'BANCOS DIANTEIROS',
        suggestedAction: 'REUSE_EXISTING',
        matchedMatrixNodeId: ms.rootNodeId,
        matchedMatrixNodeType: 'TASK',
        reusedStructure: {
          kind: 'MATRIX_SUBTREE',
          activity: rootTitle,
          plannedMinutes: 825,
        },
        matrixSubtree: ms,
      },
    ]
    const reviewed = applyReviewDecisionsToDraftV11(draftFixture(), plan, {})
    const synthAfterReview = detectSyntheticSubtreeRollupInEditableDraft(reviewed)
    expect(synthAfterReview, JSON.stringify(synthAfterReview)).toEqual([])

    const payload = draftV1ToCreateConveyorInput(reviewed)
    expect(detectSyntheticSubtreeRollupSteps(payload), JSON.stringify(payload.options)).toEqual(
      [],
    )

    expect(payload.options).toHaveLength(1)
    expect(payload.options[0]!.titulo).toBe(rootTitle)
    expect(payload.options[0]!.areas.map((a) => a.titulo)).toEqual(['PREPARAÇÃO', 'CORTE'])
    const stepTitles = payload.options[0]!.areas.flatMap((a) => a.steps.map((s) => s.titulo))
    expect(stepTitles).toEqual(['Remover revestimento', 'Limpar', 'Corte couro'])
    expect(stepTitles.some((t) => t === rootTitle)).toBe(false)
    expect(payload.options[0]!.areas.some((a) => a.titulo === 'Área')).toBe(false)
    const summary = summarizeCreateConveyorInput(payload)
    expect(summary.options[0]!.areas[0]!.titulo).toBe('PREPARAÇÃO')
    expect(summary.options[0]!.areas[0]!.steps.some((s) => s.plannedMinutes === 825)).toBe(false)
  })

  it('detector acusa rollup quando step === título da opção (simulação de bug)', () => {
    const badPayload = draftV1ToCreateConveyorInput(
      {
        schemaVersion: '1.1.0',
        suggestedDados: { title: 'X' },
        options: [
          {
            orderIndex: 1,
            title: rootTitle,
            areas: [
              {
                orderIndex: 1,
                title: 'Área',
                steps: [
                  {
                    orderIndex: 1,
                    title: rootTitle,
                    plannedMinutes: 825,
                  },
                ],
              },
            ],
          },
        ],
        warnings: [],
        humanReviewRequired: true,
      },
      {},
    )
    const findings = detectSyntheticSubtreeRollupSteps(badPayload)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings.some((f) => f.reason === 'step_title_matches_option_title')).toBe(true)
    expect(detectSyntheticSubtreeRollupInCreatePayload(badPayload)).toEqual([])
  })

  it('S9.4.5 official detector acusa quando há Área duplicada + setor real', () => {
    const t = '16 - VOLANTE'
    const dirty = {
      dados: {
        nome: 'E',
        cliente: '',
        veiculo: '',
        modeloVersao: '',
        placa: '',
        observacoes: '',
        responsavel: '',
        prazoEstimado: '',
        prioridade: 'media' as const,
        colaboradorId: null,
      },
      originType: 'MANUAL' as const,
      baseId: null,
      baseCode: null,
      baseName: null,
      baseVersion: null,
      options: [
        {
          titulo: t,
          orderIndex: 1,
          sourceOrigin: 'manual' as const,
          areas: [
            {
              titulo: 'Área',
              orderIndex: 1,
              sourceOrigin: 'manual' as const,
              steps: [
                {
                  titulo: t,
                  orderIndex: 1,
                  plannedMinutes: 250,
                  sourceOrigin: 'manual' as const,
                  required: true,
                  assignees: [],
                },
              ],
            },
            {
              titulo: 'PREPARAÇÃO',
              orderIndex: 2,
              sourceOrigin: 'manual' as const,
              steps: [
                {
                  titulo: 'x',
                  orderIndex: 1,
                  plannedMinutes: 10,
                  sourceOrigin: 'manual' as const,
                  required: true,
                  assignees: [],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(detectSyntheticSubtreeRollupInCreatePayload(dirty).length).toBe(1)
    const cleaned = stripOfficialSyntheticRollupFromCreateInputOptions(dirty.options)
    expect(detectSyntheticSubtreeRollupInCreatePayload({ ...dirty, options: cleaned })).toEqual([])
    expect(cleaned[0]!.areas.every((a) => a.titulo !== 'Área')).toBe(true)
  })

  it('S9.4.6 buildCreateConveyorInputForDocumentImport — strip remove rollup; mantém PREPARAÇÃO e cabo de aço', () => {
    const t = '15 - BANCOS DIANTEIROS'
    const draft: ConveyorDraft = {
      schemaVersion: '1.1.0',
      suggestedDados: { title: 'OS ref' },
      options: [
        {
          orderIndex: 1,
          title: t,
          areas: [
            {
              orderIndex: 1,
              title: 'Área',
              steps: [{ orderIndex: 1, title: t, plannedMinutes: 825 }],
            },
            {
              orderIndex: 2,
              title: 'PREPARAÇÃO',
              steps: [
                { orderIndex: 1, title: 'remoção das capas', plannedMinutes: 50 },
              ],
            },
          ],
        },
        {
          orderIndex: 2,
          title: 'Itens inferidos do documento',
          areas: [
            {
              orderIndex: 1,
              title: 'Serviço',
              steps: [{ orderIndex: 1, title: 'Ajuste cabo de aço', plannedMinutes: 30 }],
            },
          ],
        },
      ],
      warnings: [],
      humanReviewRequired: true,
    }
    const built = buildCreateConveyorInputForDocumentImport(draft, {})
    expect(built.officialFindingsBeforeStrip.length).toBe(1)
    expect(built.officialFindingsAfterStrip).toEqual([])
    const optBancos = built.inputAfterStrip.options.find((o) => o.titulo === t)
    expect(optBancos?.areas.map((a) => a.titulo)).toContain('PREPARAÇÃO')
    expect(optBancos?.areas.some((a) => a.titulo === 'Área')).toBe(false)
    const optInferidos = built.inputAfterStrip.options.find(
      (o) => o.titulo === 'Itens inferidos do documento',
    )
    expect(
      optInferidos?.areas.some((a) =>
        a.steps.some((s) => s.titulo.toLowerCase().includes('cabo')),
      ),
    ).toBe(true)
  })
})
