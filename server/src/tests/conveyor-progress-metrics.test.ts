import { describe, expect, it } from 'vitest'
import {
  computeConveyorProgressMetrics,
  computeTimeConsumptionPct,
  computeTimeEfficiencyMetrics,
  consolidateWeightedOperationalProgress,
  consolidateWeightedTimeEfficiency,
  resolveActivityOperationalProgressPct,
} from '../shared/conveyorProgressMetrics.js'

describe('computeConveyorProgressMetrics', () => {
  it('calcula faltante e consumo temporal quando realizado < previsto', () => {
    const m = computeConveyorProgressMetrics(120, 90)
    expect(m.plannedMinutes).toBe(120)
    expect(m.realizedMinutes).toBe(90)
    expect(m.remainingMinutes).toBe(30)
    expect(m.exceededMinutes).toBe(0)
    expect(m.timeConsumptionPct).toBe(75)
  })

  it('zera faltante e calcula excedente quando realizado > previsto', () => {
    const m = computeConveyorProgressMetrics(100, 180)
    expect(m.remainingMinutes).toBe(0)
    expect(m.exceededMinutes).toBe(80)
    expect(m.timeConsumptionPct).toBe(180)
  })

  it('retorna consumo null quando previsto = 0', () => {
    const m = computeConveyorProgressMetrics(0, 45)
    expect(m.timeConsumptionPct).toBeNull()
    expect(m.exceededMinutes).toBe(45)
    expect(m.remainingMinutes).toBe(0)
  })
})

describe('computeTimeConsumptionPct', () => {
  it('separa consumo temporal do progresso operacional no cenário real', () => {
    expect(computeTimeConsumptionPct(205, 185)).toBe(90.2)
  })

  it('calcula consumo acima de 100% sem confundir com evolução', () => {
    expect(computeTimeConsumptionPct(15, 185)).toBe(1233.3)
  })
})

describe('resolveActivityOperationalProgressPct', () => {
  it('retorna 0% sem apontamento operacional', () => {
    expect(
      resolveActivityOperationalProgressPct({
        isCompleted: false,
        latestSessionCompletionPct: null,
      }),
    ).toBe(0)
  })

  it('retorna 50% com último apontamento parcial', () => {
    expect(
      resolveActivityOperationalProgressPct({
        isCompleted: false,
        latestSessionCompletionPct: 50,
      }),
    ).toBe(50)
  })

  it('retorna 100% quando concluída', () => {
    expect(
      resolveActivityOperationalProgressPct({
        isCompleted: true,
        latestSessionCompletionPct: 50,
      }),
    ).toBe(100)
  })
})

describe('consolidateWeightedOperationalProgress', () => {
  it('pondera evolução operacional por tempo previsto das atividades', () => {
    const summary = consolidateWeightedOperationalProgress([
      { operationalProgressPct: 50, plannedMinutes: 205 },
      { operationalProgressPct: 100, plannedMinutes: 95 },
    ])

    expect(summary.operationalProgressPct).toBe(66)
    expect(summary.includedActivityCount).toBe(2)
    expect(summary.withoutPlannedTimeCount).toBe(0)
  })

  it('usa média simples quando nenhuma atividade tem tempo previsto', () => {
    const summary = consolidateWeightedOperationalProgress([
      { operationalProgressPct: 40, plannedMinutes: 0 },
      { operationalProgressPct: 80, plannedMinutes: 0 },
    ])

    expect(summary.operationalProgressPct).toBe(60)
    expect(summary.withoutPlannedTimeCount).toBe(2)
  })

  it('ignora atividades sem tempo previsto no denominador ponderado', () => {
    const summary = consolidateWeightedOperationalProgress([
      { operationalProgressPct: 50, plannedMinutes: 100 },
      { operationalProgressPct: 100, plannedMinutes: 0 },
    ])

    expect(summary.operationalProgressPct).toBe(50)
    expect(summary.includedActivityCount).toBe(1)
    expect(summary.withoutPlannedTimeCount).toBe(1)
  })
})

describe('computeTimeEfficiencyMetrics', () => {
  it('30/30 -> 100% e desvio zero', () => {
    const metrics = computeTimeEfficiencyMetrics({
      plannedMinutes: 30,
      realizedMinutes: 30,
      isCompleted: true,
    })

    expect(metrics).toMatchObject({
      status: 'DENTRO_DO_PREVISTO',
      isPartial: false,
      includedInCalculation: true,
      efficiencyPct: 100,
      deviationMinutes: 0,
      deviationPct: 0,
      classification: 'DENTRO_DO_PREVISTO',
    })
  })

  it('30/45 -> 66,7% com +15 min e +50%', () => {
    const metrics = computeTimeEfficiencyMetrics({
      plannedMinutes: 30,
      realizedMinutes: 45,
      isCompleted: true,
    })

    expect(metrics.efficiencyPct).toBe(66.7)
    expect(metrics.status).toBe('CRITICO')
    expect(metrics.deviationMinutes).toBe(15)
    expect(metrics.deviationPct).toBe(50)
    expect(metrics.classification).toBe('CRITICO')
  })

  it('30/20 -> 150% com -10 min e -33,3%', () => {
    const metrics = computeTimeEfficiencyMetrics({
      plannedMinutes: 30,
      realizedMinutes: 20,
      isCompleted: true,
    })

    expect(metrics.efficiencyPct).toBe(150)
    expect(metrics.status).toBe('MAIS_RAPIDO')
    expect(metrics.deviationMinutes).toBe(-10)
    expect(metrics.deviationPct).toBe(-33.3)
    expect(metrics.classification).toBe('MAIS_RAPIDO')
  })

  it('não iniciada -> métricas null', () => {
    const metrics = computeTimeEfficiencyMetrics({
      plannedMinutes: 30,
      realizedMinutes: 0,
      isCompleted: false,
    })

    expect(metrics).toMatchObject({
      status: 'NAO_INICIADA',
      includedInCalculation: false,
      efficiencyPct: null,
      deviationMinutes: null,
      deviationPct: null,
      classification: null,
    })
  })

  it('sem tempo previsto -> métricas null', () => {
    const metrics = computeTimeEfficiencyMetrics({
      plannedMinutes: 0,
      realizedMinutes: 20,
      isCompleted: false,
    })

    expect(metrics).toMatchObject({
      status: 'SEM_TEMPO_PREVISTO',
      includedInCalculation: false,
      efficiencyPct: null,
      deviationMinutes: null,
      deviationPct: null,
      classification: null,
    })
  })

  it('concluída com zero minuto -> métricas null e status específico', () => {
    const metrics = computeTimeEfficiencyMetrics({
      plannedMinutes: 30,
      realizedMinutes: 0,
      isCompleted: true,
    })

    expect(metrics).toMatchObject({
      status: 'CONCLUIDA_SEM_APONTAMENTO',
      includedInCalculation: false,
      efficiencyPct: null,
      deviationMinutes: null,
      deviationPct: null,
      classification: null,
    })
  })

  it('em andamento -> cálculo parcial', () => {
    const metrics = computeTimeEfficiencyMetrics({
      plannedMinutes: 30,
      realizedMinutes: 15,
      isCompleted: false,
    })

    expect(metrics).toMatchObject({
      status: 'MAIS_RAPIDO',
      isPartial: true,
      includedInCalculation: true,
      efficiencyPct: 200,
      deviationMinutes: -15,
      deviationPct: -50,
      classification: 'MAIS_RAPIDO',
    })
  })
})

describe('consolidateWeightedTimeEfficiency', () => {
  it('faz consolidado ponderado com atividades pequenas e grandes', () => {
    const summary = consolidateWeightedTimeEfficiency([
      { plannedMinutes: 10, realizedMinutes: 20, isCompleted: true },
      { plannedMinutes: 90, realizedMinutes: 90, isCompleted: false },
    ])

    expect(summary.efficiencyPct).toBe(90.9)
    expect(summary.status).toBe('LEVE_DESVIO')
    expect(summary.deviationMinutes).toBe(10)
    expect(summary.deviationPct).toBe(10)
    expect(summary.classification).toBe('LEVE_DESVIO')
    expect(summary.partialCount).toBe(1)
    expect(summary.includedInCalculationCount).toBe(2)
  })

  it('ignora itens sem tempo planejado no consolidado', () => {
    const summary = consolidateWeightedTimeEfficiency([
      { plannedMinutes: null, realizedMinutes: 30, isCompleted: false },
      { plannedMinutes: 60, realizedMinutes: 90, isCompleted: true },
      { plannedMinutes: 20, realizedMinutes: 0, isCompleted: true },
    ])

    expect(summary.efficiencyPct).toBe(66.7)
    expect(summary.status).toBe('CRITICO')
    expect(summary.deviationMinutes).toBe(30)
    expect(summary.deviationPct).toBe(50)
    expect(summary.withoutPlannedTimeCount).toBe(1)
    expect(summary.completedWithoutTimeCount).toBe(1)
    expect(summary.includedInCalculationCount).toBe(1)
  })

  it('ignora itens não iniciados no consolidado', () => {
    const summary = consolidateWeightedTimeEfficiency([
      { plannedMinutes: 50, realizedMinutes: 0, isCompleted: false },
      { plannedMinutes: 100, realizedMinutes: 80, isCompleted: true },
    ])

    expect(summary.efficiencyPct).toBe(125)
    expect(summary.status).toBe('MAIS_RAPIDO')
    expect(summary.deviationMinutes).toBe(-20)
    expect(summary.deviationPct).toBe(-20)
    expect(summary.notStartedCount).toBe(1)
    expect(summary.includedInCalculationCount).toBe(1)
  })
})
