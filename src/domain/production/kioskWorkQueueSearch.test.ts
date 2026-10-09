import { describe, expect, it } from 'vitest'
import type { ProductionWorkQueueItem } from './production.types'
import {
  filterKioskWorkQueueBySearch,
  parseKioskConveyorActivitySearch,
} from './kioskWorkQueueSearch'

function item(
  overrides: Partial<ProductionWorkQueueItem> & Pick<ProductionWorkQueueItem, 'workPlanItemId'>,
): ProductionWorkQueueItem {
  return {
    conveyorId: 'cv-1',
    conveyorTitle: 'Esteira',
    activityNodeId: overrides.workPlanItemId,
    activityTitle: overrides.workPlanItemId,
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    plannedDate: '2026-05-04',
    plannedMinutes: 60,
    realizedMinutes: 0,
    pendingMinutes: 60,
    activityOperationalStatus: 'PENDING',
    isActivityCompleted: false,
    isOverdue: false,
    isOutOfSequence: false,
    isNextRecommended: false,
    hasPreviousPendingStep: false,
    previousOpenCount: 0,
    previousOpenActivities: [],
    allPreviousOpenActivities: [],
    awaitingPreviousActivities: [],
    hasPreviousOpenActivitiesFromOtherCollaborators: false,
    previousOpenActivitiesFromOtherCollaborators: [],
    previousOpenActivitiesWarningMessage: null,
    group: 'today',
    canTrackTime: true,
    canCompleteStep: true,
    requiresOutOfSequenceJustification: false,
    ...overrides,
  }
}

/**
 * Mesmo cenário de `server/src/tests/time-entry-candidates-http.integration.test.ts`
 * ("pesquisa Esteira & atividade"): a esteira alvo (OS 7070) tem 5 atividades na tarefa
 * "Bancos dianteiros" / setor "Tapeçaria"; outra esteira (OS 9090) tem atividade "XPTO".
 */
function target(activityTitle: string): ProductionWorkQueueItem {
  return item({
    workPlanItemId: `t-${activityTitle}`,
    conveyorId: 'cv-target',
    conveyorTitle: 'Esteira 7070',
    conveyorCode: '7070',
    clientName: 'Cliente Alfa',
    vehicleDescription: 'Gol GTI',
    licensePlate: 'ABC1D23',
    activityTitle,
    taskTitle: 'Bancos dianteiros',
    sectorTitle: 'Tapeçaria',
  })
}

const items = [
  target('corte do tecido XPTO'),
  target('Costura do tecido XPTO'),
  target('Revestir banco com tecido XPTO'),
  target('Revestir banco do couro'),
  target('Lixar estrutura'),
  item({
    workPlanItemId: 'other',
    conveyorId: 'cv-other',
    conveyorTitle: 'Outra',
    conveyorCode: '9090',
    activityTitle: 'Costura do tecido XPTO',
  }),
]

function search(q: string): string[] {
  return filterKioskWorkQueueBySearch(items, q)
    .map((i) => `${i.conveyorCode}:${i.activityTitle}`)
    .sort()
}

describe('parseKioskConveyorActivitySearch (espelha parseConveyorActivitySearch)', () => {
  it('sem & → null', () => {
    expect(parseKioskConveyorActivitySearch('7070 XPTO')).toBeNull()
    expect(parseKioskConveyorActivitySearch('')).toBeNull()
  })

  it('separa no primeiro &, dobra acentos/caixa/espaços e ignora lados vazios', () => {
    expect(parseKioskConveyorActivitySearch('  7070   &   Xptó  ')).toEqual({
      conveyorTerm: '7070',
      activityTerm: 'xpto',
    })
    expect(parseKioskConveyorActivitySearch('7070 &')).toEqual({
      conveyorTerm: '7070',
      activityTerm: null,
    })
    expect(parseKioskConveyorActivitySearch('& banco')).toEqual({
      conveyorTerm: null,
      activityTerm: 'banco',
    })
    expect(parseKioskConveyorActivitySearch('a & b & c')).toEqual({
      conveyorTerm: 'a',
      activityTerm: 'b c',
    })
  })
})

describe('filterKioskWorkQueueBySearch — "Esteira/OS & atividade"', () => {
  it('OS & atividade restringe à esteira e ao nome da atividade', () => {
    expect(search('7070 & XPTO')).toEqual(
      [
        '7070:Costura do tecido XPTO',
        '7070:Revestir banco com tecido XPTO',
        '7070:corte do tecido XPTO',
      ].sort(),
    )
    expect(search('7070 & banco')).toEqual(
      ['7070:Revestir banco com tecido XPTO', '7070:Revestir banco do couro'].sort(),
    )
  })

  it('sem diferenciar maiúsculas/acentos e com espaços extras ao redor do &', () => {
    expect(search('  7070   &   xptó  ')).toHaveLength(3)
    expect(search('7070&BANCO')).toHaveLength(2)
  })

  it('termo direito casa só o nome da atividade (não tarefa nem setor)', () => {
    expect(search('7070 & dianteiros')).toEqual([])
    expect(search('7070 & tapecaria')).toEqual([])
  })

  it('termo esquerdo sozinho → todas as atividades da esteira', () => {
    expect(search('7070 &')).toHaveLength(5)
  })

  it('termo esquerdo casa nome, código, cliente, veículo e placa da esteira', () => {
    expect(search('esteira 7070 & lixar')).toEqual(['7070:Lixar estrutura'])
    expect(search('alfa & lixar')).toEqual(['7070:Lixar estrutura'])
    expect(search('gol gti & lixar')).toEqual(['7070:Lixar estrutura'])
    expect(search('abc1d23 & lixar')).toEqual(['7070:Lixar estrutura'])
  })

  it('termo direito sozinho → atividade em qualquer esteira', () => {
    expect(search('& costura')).toEqual(
      ['7070:Costura do tecido XPTO', '9090:Costura do tecido XPTO'].sort(),
    )
  })

  it('apenas & → sem filtro', () => {
    expect(search('&')).toHaveLength(6)
  })
})

describe('filterKioskWorkQueueBySearch — pesquisa livre (sem &)', () => {
  it('vazio → todos os itens', () => {
    expect(filterKioskWorkQueueBySearch(items, '   ')).toBe(items)
  })

  it('atividade, setor e tarefa continuam encontrando os mesmos itens de antes', () => {
    expect(search('costura')).toEqual(
      ['7070:Costura do tecido XPTO', '9090:Costura do tecido XPTO'].sort(),
    )
    expect(search('  LIXAR ')).toEqual(['7070:Lixar estrutura'])
    expect(search('Tapeçaria')).toHaveLength(5)
    expect(search('bancos dianteiros')).toHaveLength(5)
  })

  it('OS encontra as atividades da esteira (código, nome, cliente, veículo, placa)', () => {
    expect(search('7070')).toHaveLength(5)
    expect(search('9090')).toEqual(['9090:Costura do tecido XPTO'])
    expect(search('cliente alfa')).toHaveLength(5)
    expect(search('gol')).toHaveLength(5)
    expect(search('abc1d23')).toHaveLength(5)
  })

  it('sem &, mantém a sensibilidade a acentos de antes (como o ILIKE da referência)', () => {
    expect(search('tapecaria')).toEqual([])
  })

  it('itens sem os dados novos da esteira (API antiga) continuam filtrando', () => {
    const legacy = [item({ workPlanItemId: 'Lixar', conveyorTitle: 'OS-1' })]
    expect(filterKioskWorkQueueBySearch(legacy, 'lixar')).toHaveLength(1)
    expect(filterKioskWorkQueueBySearch(legacy, 'os-1 & lixar')).toHaveLength(1)
  })
})
