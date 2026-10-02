import { describe, expect, it } from 'vitest'
import { computeCoberturaTempo } from '../shared/coberturaTempo.js'
import {
  buildJourneyPendenciaItems,
  countJourneyAssignmentsByBucket,
  sortJourneyAssignments,
  sumJourneyRealizedMinutes,
  sumJourneyStructuralPlannedMinutes,
} from '../modules/operational-journey/operational-journey.service.js'
import {
  MAX_JOURNEY_COLLABORATORS,
  operationalJourneyCollaboratorIdsSchema,
} from '../modules/operational-journey/operational-journey.schemas.js'
import type { OperationalJourneyAssignmentApi } from '../modules/operational-journey/operational-journey.dto.js'

const COLAB_A = '11111111-1111-1111-1111-111111111111'
const COLAB_B = '22222222-2222-2222-2222-222222222222'

function assignment(
  over: Partial<OperationalJourneyAssignmentApi> & {
    collaboratorId: string
    stepNodeId: string
  },
): OperationalJourneyAssignmentApi {
  return {
    assigneeId: `as-${over.collaboratorId}-${over.stepNodeId}`,
    collaboratorName: over.collaboratorId === COLAB_A ? 'Maria' : 'João',
    conveyorId: 'conv-1',
    conveyorCode: 'OS-1',
    conveyorName: 'Esteira 1',
    conveyorStatus: 'EM_ANDAMENTO',
    estimatedDeadline: null,
    operationalBucket: 'em_execucao',
    stepName: 'Costurar banco',
    optionName: 'Opção',
    areaName: 'Tapeçaria',
    roleInStep: 'primary',
    plannedMinutes: 60,
    plannedQuantity: 1,
    plannedTotalMinutes: 60,
    realizedMinutes: 0,
    ...over,
  } as OperationalJourneyAssignmentApi
}

describe('jornada consolidada — previsto estrutural por alocação colaborador × STEP', () => {
  it('STEP compartilhado por dois colaboradores participa uma vez por alocação', () => {
    const assignments = [
      assignment({ collaboratorId: COLAB_A, stepNodeId: 'step-1', plannedTotalMinutes: 60 }),
      assignment({ collaboratorId: COLAB_B, stepNodeId: 'step-1', plannedTotalMinutes: 60 }),
    ]
    expect(assignments).toHaveLength(2)
    expect(sumJourneyStructuralPlannedMinutes(assignments)).toBe(120)
  })

  it('STEPs distintos somam normalmente', () => {
    const assignments = [
      assignment({ collaboratorId: COLAB_A, stepNodeId: 'step-1', plannedTotalMinutes: 100 }),
      assignment({ collaboratorId: COLAB_B, stepNodeId: 'step-2', plannedTotalMinutes: 40 }),
    ]
    expect(sumJourneyStructuralPlannedMinutes(assignments)).toBe(140)
  })

  it('com 1 colaborador o previsto é a soma das suas alocações (comportamento atual)', () => {
    const assignments = [
      assignment({ collaboratorId: COLAB_A, stepNodeId: 'step-1', plannedTotalMinutes: 100 }),
      assignment({ collaboratorId: COLAB_A, stepNodeId: 'step-2', plannedTotalMinutes: 35 }),
    ]
    expect(sumJourneyStructuralPlannedMinutes(assignments)).toBe(135)
  })
})

describe('jornada consolidada — minutos apontados e cobertura de tempo', () => {
  it('STEP compartilhado: 2 × 60 previstos e 2 × 60 apontados → cobertura 100% (nunca 200%)', () => {
    const assignments = [
      assignment({
        collaboratorId: COLAB_A,
        stepNodeId: 'step-1',
        plannedTotalMinutes: 60,
        realizedMinutes: 60,
      }),
      assignment({
        collaboratorId: COLAB_B,
        stepNodeId: 'step-1',
        plannedTotalMinutes: 60,
        realizedMinutes: 60,
      }),
    ]
    const previsto = sumJourneyStructuralPlannedMinutes(assignments)
    const realizado = sumJourneyRealizedMinutes(assignments)
    const cobertura = computeCoberturaTempo(realizado, previsto)
    expect(assignments).toHaveLength(2)
    expect(previsto).toBe(120)
    expect(realizado).toBe(120)
    expect(cobertura.ratio).toBe(1)
    // deduplicar o denominador por STEP (60) resultaria em 200%
    expect(realizado / 60).toBe(2)
  })

  it('soma o realizado de cada colaborador sem duplicar apontamentos', () => {
    const assignments = [
      assignment({
        collaboratorId: COLAB_A,
        stepNodeId: 'step-1',
        plannedTotalMinutes: 100,
        realizedMinutes: 30,
      }),
      assignment({
        collaboratorId: COLAB_B,
        stepNodeId: 'step-1',
        plannedTotalMinutes: 100,
        realizedMinutes: 50,
      }),
    ]
    expect(sumJourneyRealizedMinutes(assignments)).toBe(80)
  })

  it('cobertura vem dos totais consolidados, não da média dos percentuais individuais', () => {
    // Maria: 90/100 = 90% · João: 10/200 = 5% → média simples seria 47,5%.
    const assignments = [
      assignment({
        collaboratorId: COLAB_A,
        stepNodeId: 'step-1',
        plannedTotalMinutes: 100,
        realizedMinutes: 90,
      }),
      assignment({
        collaboratorId: COLAB_B,
        stepNodeId: 'step-2',
        plannedTotalMinutes: 200,
        realizedMinutes: 10,
      }),
    ]
    const previsto = sumJourneyStructuralPlannedMinutes(assignments)
    const realizado = sumJourneyRealizedMinutes(assignments)
    const cobertura = computeCoberturaTempo(realizado, previsto)
    expect(previsto).toBe(300)
    expect(realizado).toBe(100)
    expect(cobertura.ratio).toBeCloseTo(100 / 300, 10)
    expect(cobertura.ratio).not.toBeCloseTo(0.475, 3)
  })

  it('previsto ≤ 0 no escopo → cobertura não aplicável (null), nunca 0%', () => {
    const assignments = [
      assignment({
        collaboratorId: COLAB_A,
        stepNodeId: 'step-1',
        plannedMinutes: null,
        plannedTotalMinutes: 0,
        realizedMinutes: 25,
      }),
    ]
    const cobertura = computeCoberturaTempo(
      sumJourneyRealizedMinutes(assignments),
      sumJourneyStructuralPlannedMinutes(assignments),
    )
    expect(cobertura.ratio).toBeNull()
  })
})

describe('jornada consolidada — contagens e identificação', () => {
  it('conta uma alocação por colaborador × STEP, sem duplicar registros', () => {
    const byBucket = countJourneyAssignmentsByBucket([
      assignment({ collaboratorId: COLAB_A, stepNodeId: 'step-1' }),
      assignment({ collaboratorId: COLAB_B, stepNodeId: 'step-1' }),
      assignment({
        collaboratorId: COLAB_B,
        stepNodeId: 'step-2',
        operationalBucket: 'em_atraso',
      }),
    ])
    expect(byBucket.em_execucao).toBe(2)
    expect(byBucket.em_atraso).toBe(1)
    expect(byBucket.finalizadas).toBe(0)
  })

  it('pendência de tempo preserva o colaborador de cada alocação e ordena por maior gap', () => {
    const items = buildJourneyPendenciaItems([
      assignment({
        collaboratorId: COLAB_A,
        stepNodeId: 'step-1',
        plannedTotalMinutes: 100,
        realizedMinutes: 80,
      }),
      assignment({
        collaboratorId: COLAB_B,
        stepNodeId: 'step-1',
        plannedTotalMinutes: 100,
        realizedMinutes: 10,
      }),
      assignment({
        collaboratorId: COLAB_B,
        stepNodeId: 'step-2',
        plannedTotalMinutes: 30,
        realizedMinutes: 30,
      }),
    ])
    expect(items).toHaveLength(2)
    expect(items[0]!.collaboratorId).toBe(COLAB_B)
    expect(items[0]!.gapMinutes).toBe(90)
    expect(items[0]!.collaboratorName).toBe('João')
    expect(items[1]!.collaboratorId).toBe(COLAB_A)
    expect(items[1]!.gapMinutes).toBe(20)
  })

  it('ordenação consolidada: bucket → prazo → esteira, mantendo ordem recebida nos empates', () => {
    const sorted = sortJourneyAssignments([
      assignment({
        collaboratorId: COLAB_A,
        stepNodeId: 'step-1',
        conveyorName: 'Esteira Z',
        operationalBucket: 'em_execucao',
      }),
      assignment({
        collaboratorId: COLAB_B,
        stepNodeId: 'step-2',
        conveyorName: 'Esteira A',
        operationalBucket: 'em_atraso',
      }),
      assignment({
        collaboratorId: COLAB_A,
        stepNodeId: 'step-3',
        conveyorName: 'Esteira Z',
        operationalBucket: 'em_execucao',
      }),
    ])
    expect(sorted.map((a) => a.stepNodeId)).toEqual(['step-2', 'step-1', 'step-3'])
  })
})

describe('operationalJourneyCollaboratorIdsSchema', () => {
  it('aceita 1 colaborador', () => {
    expect(operationalJourneyCollaboratorIdsSchema.parse(COLAB_A)).toEqual([COLAB_A])
  })

  it('aceita vários e remove duplicados preservando a ordem', () => {
    expect(
      operationalJourneyCollaboratorIdsSchema.parse(` ${COLAB_B}, ${COLAB_A} ,${COLAB_B}`),
    ).toEqual([COLAB_B, COLAB_A])
  })

  it('rejeita seleção vazia', () => {
    expect(operationalJourneyCollaboratorIdsSchema.safeParse('').success).toBe(false)
    expect(operationalJourneyCollaboratorIdsSchema.safeParse(' , ').success).toBe(false)
  })

  it('rejeita identificador inválido', () => {
    expect(
      operationalJourneyCollaboratorIdsSchema.safeParse(`${COLAB_A},nao-e-uuid`).success,
    ).toBe(false)
  })

  it(`rejeita acima de ${MAX_JOURNEY_COLLABORATORS} colaboradores`, () => {
    const ids = Array.from(
      { length: MAX_JOURNEY_COLLABORATORS + 1 },
      (_, i) => `${String(i + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
    ).join(',')
    expect(operationalJourneyCollaboratorIdsSchema.safeParse(ids).success).toBe(false)
  })
})
