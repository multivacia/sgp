import { describe, expect, it } from 'vitest'
import {
  aggregateOperationalJourneyTotals,
  coberturaRatio,
  journeyCollaboratorIdsToParams,
  mergeOperationalJourneyDetails,
  parseJourneyCollaboratorIds,
} from './aggregateOperationalJourneys'
import type { OperationalJourneyData } from './operational-journey.types'

function journeyFixture(
  id: string,
  fullName: string,
  over: {
    planned?: number
    realizedPeriod?: number
    realizedTotal?: number
    previsto?: number
    realizado?: number
    extra?: number
    atraso?: number
    entries?: Array<{ id: string; entryAt: string; minutes: number }>
  } = {},
): OperationalJourneyData {
  const previsto = over.previsto ?? 100
  const realizado = over.realizado ?? 50
  return {
    meta: { semanticsVersion: '1.5' },
    collaborator: { id, fullName },
    period: { from: '2026-09-01T03:00:00.000Z', to: '2026-09-08T02:59:59.999Z' },
    query: { limit: 20, conveyorId: null, periodPreset: '7d' },
    load: { assignmentCount: 2, plannedMinutesOnStepsSum: over.planned ?? 100 },
    coberturaTempo: {
      ratio: previsto > 0 ? realizado / previsto : null,
      previstoMinutosEscopo: previsto,
      realizadoMinutosAcumuladoEscopo: realizado,
      formula: '',
    },
    execution: {
      realizedMinutesInPeriod: over.realizedPeriod ?? 30,
      realizedMinutesTotal: over.realizedTotal ?? 60,
    },
    extraTimeEntriesSummary: {
      totalMinutes: over.extra ?? 0,
      entriesCount: over.extra ? 1 : 0,
      topDescriptions: over.extra
        ? [{ descriptionId: 'd-1', description: 'Limpeza', totalMinutes: over.extra, entriesCount: 1 }]
        : [],
    },
    risk: {
      byBucket: {
        em_elaboracao: 0,
        aguardando_planejamento: 0,
        em_planejamento: 0,
        em_execucao: 1,
        em_atraso: over.atraso ?? 0,
        finalizadas: 0,
        canceladas: 0,
      },
      overdueCount: over.atraso ?? 0,
    },
    signals: { pressaoAtrasoAlocacoes: over.atraso ?? 0, pendenciaTempo: { count: 0, items: [] } },
    assignmentsOpen: [],
    assignmentsAtRisk: [],
    recentTimeEntries: (over.entries ?? []).map((e) => ({
      id: e.id,
      conveyorId: 'conv-1',
      conveyorName: 'OS-1',
      stepNodeId: 'step-1',
      stepName: 'Costurar',
      minutes: e.minutes,
      entryAt: e.entryAt,
      notes: null,
    })),
  }
}

describe('aggregateOperationalJourneyTotals', () => {
  it('um colaborador espelha exatamente o payload da API', () => {
    const j = journeyFixture('a', 'Ana', { extra: 15, atraso: 1 })
    const t = aggregateOperationalJourneyTotals([j])
    expect(t.collaboratorCount).toBe(1)
    expect(t.assignmentCount).toBe(j.load.assignmentCount)
    expect(t.plannedMinutesOnStepsSum).toBe(j.load.plannedMinutesOnStepsSum)
    expect(t.realizedMinutesInPeriod).toBe(j.execution.realizedMinutesInPeriod)
    expect(t.realizedMinutesTotal).toBe(j.execution.realizedMinutesTotal)
    expect(t.cobertura.ratio).toBe(j.coberturaTempo.ratio)
    expect(t.extra.topDescriptions).toEqual(j.extraTimeEntriesSummary.topDescriptions)
    expect(t.pressaoAtrasoAlocacoes).toBe(1)
  })

  it('vários colaboradores: soma totais e recalcula cobertura sobre as somas', () => {
    const t = aggregateOperationalJourneyTotals([
      journeyFixture('a', 'Ana', { realizedPeriod: 30, previsto: 100, realizado: 50, extra: 10, atraso: 1 }),
      journeyFixture('b', 'Bruno', { realizedPeriod: 45, previsto: 300, realizado: 30, extra: 20 }),
    ])
    expect(t.collaboratorCount).toBe(2)
    expect(t.assignmentCount).toBe(4)
    expect(t.realizedMinutesInPeriod).toBe(75)
    expect(t.cobertura.previstoMinutos).toBe(400)
    expect(t.cobertura.realizadoMinutos).toBe(80)
    // (50 + 30) / (100 + 300) — não é a média de 50% e 10%.
    expect(t.cobertura.ratio).toBeCloseTo(0.2)
    expect(t.extra.totalMinutes).toBe(30)
    expect(t.extra.entriesCount).toBe(2)
    expect(t.extra.topDescriptions).toEqual([])
    expect(t.byBucket.em_execucao).toBe(2)
    expect(t.byBucket.em_atraso).toBe(1)
  })

  it('cobertura não aplicável quando previsto somado ≤ 0', () => {
    const t = aggregateOperationalJourneyTotals([
      journeyFixture('a', 'Ana', { previsto: 0, realizado: 10 }),
      journeyFixture('b', 'Bruno', { previsto: 0, realizado: 0 }),
    ])
    expect(t.cobertura.ratio).toBeNull()
    expect(coberturaRatio(5, 0)).toBeNull()
  })

  it('sem jornadas: zera tudo', () => {
    const t = aggregateOperationalJourneyTotals([])
    expect(t.collaboratorCount).toBe(0)
    expect(t.realizedMinutesInPeriod).toBe(0)
    expect(t.cobertura.ratio).toBeNull()
  })
})

describe('mergeOperationalJourneyDetails', () => {
  it('histórico consolidado ordenado do mais recente, com colaborador de cada linha', () => {
    const merged = mergeOperationalJourneyDetails([
      journeyFixture('a', 'Ana', {
        entries: [{ id: 'e1', entryAt: '2026-09-02T15:00:00.000Z', minutes: 10 }],
      }),
      journeyFixture('b', 'Bruno', {
        entries: [{ id: 'e2', entryAt: '2026-09-03T15:00:00.000Z', minutes: 20 }],
      }),
    ])
    expect(merged.recentTimeEntries.map((r) => [r.collaboratorName, r.item.id])).toEqual([
      ['Bruno', 'e2'],
      ['Ana', 'e1'],
    ])
  })
})

describe('seleção de colaboradores na URL', () => {
  it('mantém o link legado ?colaboradorId=', () => {
    expect(parseJourneyCollaboratorIds(new URLSearchParams('colaboradorId=a'))).toEqual(['a'])
  })

  it('lê ?colaboradorIds= e remove duplicados', () => {
    expect(
      parseJourneyCollaboratorIds(new URLSearchParams('colaboradorIds=a,b,a&colaboradorId=c')),
    ).toEqual(['a', 'b', 'c'])
  })

  it('grava 1 colaborador no parâmetro legado e vários em colaboradorIds', () => {
    expect(journeyCollaboratorIdsToParams([])).toEqual({
      colaboradorId: undefined,
      colaboradorIds: undefined,
    })
    expect(journeyCollaboratorIdsToParams(['a'])).toEqual({
      colaboradorId: 'a',
      colaboradorIds: undefined,
    })
    expect(journeyCollaboratorIdsToParams(['a', 'b'])).toEqual({
      colaboradorId: undefined,
      colaboradorIds: 'a,b',
    })
  })
})
