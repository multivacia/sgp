import { describe, expect, it } from 'vitest'
import {
  buildPlanningFilterOptions,
  DEFAULT_PLANNING_BOARD_FILTERS,
  filterPlanningDraftItems,
  matchesPlanningTextSearch,
  PLANNING_COLLABORATOR_UNASSIGNED,
  type PlanningFilterableItem,
} from './planningBoardFilters'

function item(
  partial: Partial<PlanningFilterableItem> & Pick<PlanningFilterableItem, 'plannedDate'>,
): PlanningFilterableItem {
  return {
    conveyorId: 'cv1',
    conveyorTitle: 'Esteira A',
    activityTitle: 'Atividade 1',
    taskTitle: 'Tarefa X',
    sectorTitle: 'Setor Y',
    assignedCollaboratorId: 'c1',
    assignedCollaboratorName: 'João',
    plannedMinutes: 60,
    ...partial,
  }
}

describe('buildPlanningFilterOptions', () => {
  it('gera colaboradores e esteiras únicos ordenados', () => {
    const options = buildPlanningFilterOptions([
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: 'c2', assignedCollaboratorName: 'Maria' }),
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: 'c1', assignedCollaboratorName: 'João' }),
      item({
        plannedDate: '2026-05-18',
        conveyorId: 'cv2',
        conveyorTitle: 'Esteira B',
        assignedCollaboratorId: 'c1',
      }),
    ])
    expect(options.collaborators.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(options.collaborators.map((c) => c.label)).toEqual(['João', 'Maria'])
    expect(options.conveyors.map((c) => c.id)).toEqual(['cv1', 'cv2'])
    expect(options.conveyors.map((c) => c.label)).toEqual(['Esteira A', 'Esteira B'])
  })

  it('inclui hasUnassigned quando houver item sem responsável', () => {
    const options = buildPlanningFilterOptions([
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: '', assignedCollaboratorName: null }),
    ])
    expect(options.hasUnassigned).toBe(true)
  })

  it('não duplica opções', () => {
    const options = buildPlanningFilterOptions([
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: 'c1', assignedCollaboratorName: 'João' }),
      item({ plannedDate: '2026-05-19', assignedCollaboratorId: 'c1', assignedCollaboratorName: 'João' }),
    ])
    expect(options.collaborators).toHaveLength(1)
    expect(options.conveyors).toHaveLength(1)
  })

  it('inclui estado over_capacity quando solicitado', () => {
    const options = buildPlanningFilterOptions([item({ plannedDate: '2026-05-18' })], {
      includeOverCapacityState: true,
    })
    expect(options.states).toContain('over_capacity')
  })
})

describe('filterPlanningDraftItems', () => {
  it('sem filtros retorna todos os itens ativos', () => {
    const items = [
      item({ plannedDate: '2026-05-18' }),
      item({ plannedDate: '2026-05-19', removed: true }),
    ]
    const out = filterPlanningDraftItems(items, DEFAULT_PLANNING_BOARD_FILTERS)
    expect(out).toHaveLength(1)
  })

  it('filtra por colaborador', () => {
    const items = [
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: 'c1' }),
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: 'c2', assignedCollaboratorName: 'Maria' }),
    ]
    const out = filterPlanningDraftItems(items, {
      ...DEFAULT_PLANNING_BOARD_FILTERS,
      collaboratorId: 'c2',
    })
    expect(out).toHaveLength(1)
    expect(out[0]?.assignedCollaboratorId).toBe('c2')
  })

  it('filtra por sem responsável', () => {
    const items = [
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: '' }),
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: 'c1' }),
    ]
    const out = filterPlanningDraftItems(items, {
      ...DEFAULT_PLANNING_BOARD_FILTERS,
      collaboratorId: PLANNING_COLLABORATOR_UNASSIGNED,
    })
    expect(out).toHaveLength(1)
    expect(out[0]?.assignedCollaboratorId).toBe('')
  })

  it('filtra por esteira', () => {
    const items = [
      item({ plannedDate: '2026-05-18', conveyorId: 'cv1' }),
      item({ plannedDate: '2026-05-18', conveyorId: 'cv2', conveyorTitle: 'B' }),
    ]
    const out = filterPlanningDraftItems(items, {
      ...DEFAULT_PLANNING_BOARD_FILTERS,
      conveyorId: 'cv2',
    })
    expect(out).toHaveLength(1)
    expect(out[0]?.conveyorId).toBe('cv2')
  })

  it('combina colaborador e esteira', () => {
    const items = [
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: 'c1', conveyorId: 'cv1' }),
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: 'c1', conveyorId: 'cv2' }),
      item({ plannedDate: '2026-05-18', assignedCollaboratorId: 'c2', conveyorId: 'cv1' }),
    ]
    const out = filterPlanningDraftItems(items, {
      ...DEFAULT_PLANNING_BOARD_FILTERS,
      collaboratorId: 'c1',
      conveyorId: 'cv1',
    })
    expect(out).toHaveLength(1)
  })

  it('busca textual por atividade', () => {
    const items = [
      item({ plannedDate: '2026-05-18', activityTitle: 'Pintura' }),
      item({ plannedDate: '2026-05-18', activityTitle: 'Montagem' }),
    ]
    expect(
      filterPlanningDraftItems(items, { ...DEFAULT_PLANNING_BOARD_FILTERS, q: 'pint' }),
    ).toHaveLength(1)
  })

  it('busca textual por esteira', () => {
    const items = [
      item({ plannedDate: '2026-05-18', conveyorTitle: 'Esteira Alpha' }),
      item({ plannedDate: '2026-05-18', conveyorTitle: 'Esteira Beta' }),
    ]
    expect(
      filterPlanningDraftItems(items, { ...DEFAULT_PLANNING_BOARD_FILTERS, q: 'alpha' }),
    ).toHaveLength(1)
  })

  it('ignora removed/cancelled', () => {
    const items = [
      item({ plannedDate: '2026-05-18', activityTitle: 'Pintura', removed: true }),
      item({ plannedDate: '2026-05-18', activityTitle: 'Pintura', cancelled: true }),
    ]
    expect(
      filterPlanningDraftItems(items, { ...DEFAULT_PLANNING_BOARD_FILTERS, q: 'pintura' }),
    ).toHaveLength(0)
  })

  it('não muta o array original', () => {
    const items = [item({ plannedDate: '2026-05-18' })]
    const copy = [...items]
    filterPlanningDraftItems(items, DEFAULT_PLANNING_BOARD_FILTERS)
    expect(items).toEqual(copy)
  })

  it('filtra por capacidade excedida na célula', () => {
    const items = [
      item({
        plannedDate: '2026-05-18',
        assignedCollaboratorId: 'c1',
        plannedMinutes: 500,
      }),
      item({
        plannedDate: '2026-05-19',
        assignedCollaboratorId: 'c1',
        plannedMinutes: 60,
      }),
    ]
    const out = filterPlanningDraftItems(
      items,
      { ...DEFAULT_PLANNING_BOARD_FILTERS, state: 'over_capacity' },
      [{ collaboratorId: 'c1', date: '2026-05-18', capacityMinutes: 480 }],
    )
    expect(out).toHaveLength(1)
    expect(out[0]?.plannedDate).toBe('2026-05-18')
  })
})

describe('matchesPlanningTextSearch', () => {
  it('query vazia retorna true', () => {
    expect(matchesPlanningTextSearch(item({ plannedDate: '2026-05-18' }), '')).toBe(true)
    expect(matchesPlanningTextSearch(item({ plannedDate: '2026-05-18' }), '   ')).toBe(true)
  })

  it('é case insensitive', () => {
    expect(
      matchesPlanningTextSearch(
        item({ plannedDate: '2026-05-18', activityTitle: 'Pintura' }),
        'PINTURA',
      ),
    ).toBe(true)
  })

  it('ignora acentos', () => {
    expect(
      matchesPlanningTextSearch(
        item({ plannedDate: '2026-05-18', activityTitle: 'Inspeção' }),
        'inspecao',
      ),
    ).toBe(true)
  })

  it('trata campos nulos com segurança', () => {
    expect(
      matchesPlanningTextSearch(
        {
          plannedDate: '2026-05-18',
          plannedMinutes: null,
          conveyorId: 'cv1',
        },
        'x',
      ),
    ).toBe(false)
  })
})
