import { describe, expect, it } from 'vitest'
import type { ConveyorDetail } from '../../domain/conveyors/conveyor.types'
import type { ConveyorNodeWorkload } from '../../domain/conveyors/conveyorNodeWorkload.types'
import {
  collectConveyorActivityTicketSources,
  filterConveyorActivityTicketSources,
  resolveStepAssigneeFields,
} from './activityTicketConveyorSource'
import {
  buildConveyorActivityTicketPrintModels,
  buildConveyorGroupedTicketPrintItems,
} from './buildConveyorActivityTicketPrintModels'

function step(
  id: string,
  name: string,
  orderIndex: number,
  status: 'PENDING' | 'COMPLETED' | 'IN_PROGRESS' | 'ABORTED' = 'PENDING',
  assignees?: ConveyorDetail['structure']['options'][0]['areas'][0]['steps'][0]['assignees'],
) {
  return {
    id,
    name,
    orderIndex,
    plannedMinutes: 60,
    operationalStatus: status,
    isCompleted: status === 'COMPLETED',
    completedAt: null,
    completedByName: null,
    completionEventId: null,
    assignees,
  }
}

function buildDetail(overrides?: Partial<ConveyorDetail>): ConveyorDetail {
  return {
    id: 'conv-1',
    code: 'OS-7452',
    name: 'Gol 1994',
    clientName: 'Cliente Secreto',
    vehicle: 'Gol 1994',
    modelVersion: null,
    plate: 'ABC-1234',
    initialNotes: 'Endereço Rua X — valor R$ 500',
    responsible: 'Gestor',
    priority: 'media',
    originRegister: 'MANUAL',
    operationalStatus: 'EM_ANDAMENTO',
    createdAt: '2026-05-01T10:00:00.000Z',
    completedAt: null,
    estimatedDeadline: null,
    totalOptions: 1,
    totalAreas: 1,
    totalSteps: 2,
    totalPlannedMinutes: 120,
    structure: {
      options: [
        {
          id: 'opt-1',
          name: 'Bancos dianteiros',
          orderIndex: 0,
          areas: [
            {
              id: 'area-1',
              name: 'Costura',
              orderIndex: 0,
              steps: [
                step('step-open', 'Costurar lateral', 0, 'IN_PROGRESS', [
                  {
                    type: 'COLLABORATOR',
                    collaboratorId: 'c1',
                    collaboratorName: 'Marcio',
                    teamId: null,
                    teamName: null,
                    isPrimary: true,
                    orderIndex: 0,
                  },
                ]),
                step('step-done', 'Acabamento', 1, 'COMPLETED'),
              ],
            },
          ],
        },
      ],
    },
    ...overrides,
  }
}

const workload: ConveyorNodeWorkload = {
  semanticsVersion: '1.5',
  conveyorId: 'conv-1',
  conveyor: { operationalBucket: 'em_execucao', isOverdueContext: false },
  steps: [
    {
      optionId: 'opt-1',
      optionName: 'Bancos dianteiros',
      areaId: 'area-1',
      areaName: 'Costura',
      stepId: 'step-open',
      stepName: 'Costurar lateral',
      operationalStatus: 'IN_PROGRESS',
      isOperationallyCompleted: false,
      plannedMinutes: 60,
      realizedMinutes: 20,
      pendingMinutes: 40,
    },
  ],
  areas: [],
  notes: '',
}

describe('buildConveyorActivityTicketPrintModels', () => {
  it('monta tickets a partir da estrutura da esteira', () => {
    const models = buildConveyorActivityTicketPrintModels(buildDetail(), workload, {
      grouping: 'structure',
      includeCompleted: true,
      printedAt: '2026-05-18T16:20:00.000Z',
    })

    expect(models).toHaveLength(2)
    expect(models[0]?.activityTitle).toBe('Costurar lateral')
    expect(models[0]?.taskTitle).toBe('Bancos dianteiros')
    expect(models[0]?.sectorTitle).toBe('Costura')
    expect(models[0]?.conveyorCode).toBe('OS-7452')
    expect(models[0]?.conveyorVehicleRef).toBe('Gol 1994')
    expect(models[0]?.realizedMinutes).toBe(20)
    expect(models[0]?.pendingMinutes).toBe(40)
  })

  it('mantém somente campos permitidos', () => {
    const models = buildConveyorActivityTicketPrintModels(buildDetail(), null, {
      grouping: 'task',
      includeCompleted: true,
    })
    const serialized = JSON.stringify(models)

    expect(serialized).not.toContain('Cliente Secreto')
    expect(serialized).not.toContain('ABC-1234')
    expect(serialized).not.toContain('Endereço')
    expect(serialized).not.toContain('R$')
    expect(serialized).not.toContain('Gestor')
    expect(models[0]).not.toHaveProperty('clientName')
    expect(models[0]).not.toHaveProperty('initialNotes')
  })

  it('tolera atividade sem responsável', () => {
    const detail = buildDetail()
    detail.structure.options[0]!.areas[0]!.steps[0] = step('step-open', 'Costurar lateral', 0)
    const models = buildConveyorActivityTicketPrintModels(detail, null, {
      grouping: 'responsible',
      includeCompleted: false,
    })
    expect(models[0]?.responsibleName).toBeUndefined()
    expect(models[0]?.teamName).toBeUndefined()
  })

  it('tolera atividade sem equipe quando há responsável', () => {
    const models = buildConveyorActivityTicketPrintModels(buildDetail(), null, {
      grouping: 'responsible',
      includeCompleted: false,
    })
    expect(models[0]?.responsibleName).toBe('Marcio')
    expect(models[0]?.teamName).toBeUndefined()
  })

  it('exclui concluídas por padrão', () => {
    const models = buildConveyorActivityTicketPrintModels(buildDetail(), workload, {
      grouping: 'structure',
    })
    expect(models).toHaveLength(1)
    expect(models[0]?.activityTitle).toBe('Costurar lateral')
  })

  it('inclui concluídas quando opção for true', () => {
    const models = buildConveyorActivityTicketPrintModels(buildDetail(), workload, {
      grouping: 'structure',
      includeCompleted: true,
    })
    expect(models).toHaveLength(2)
    expect(models[1]?.activityTitle).toBe('Acabamento')
  })

  it('não propaga campos proibidos do objeto de entrada', () => {
    const pollutedDetail = buildDetail({
      clientName: 'João Silva',
      initialNotes: 'CPF 123.456.789-00',
    })
    const sources = collectConveyorActivityTicketSources(pollutedDetail, null)
    const serialized = JSON.stringify(sources)
    expect(serialized).not.toContain('123.456.789-00')
    expect(serialized).not.toContain('João Silva')
  })
})

describe('resolveStepAssigneeFields', () => {
  it('prioriza responsável sobre equipe para agrupamento', () => {
    const fields = resolveStepAssigneeFields([
      {
        type: 'COLLABORATOR',
        collaboratorId: 'c1',
        collaboratorName: 'Marcio',
        teamId: null,
        teamName: null,
        isPrimary: true,
        orderIndex: 0,
      },
      {
        type: 'TEAM',
        collaboratorId: null,
        collaboratorName: null,
        teamId: 't1',
        teamName: 'Tapeçaria',
        isPrimary: false,
        orderIndex: 1,
      },
    ])
    expect(fields.responsibleName).toBe('Marcio')
    expect(fields.teamName).toBeUndefined()
  })

  it('usa equipe quando não há responsável', () => {
    const fields = resolveStepAssigneeFields([
      {
        type: 'TEAM',
        collaboratorId: null,
        collaboratorName: null,
        teamId: 't1',
        teamName: 'Tapeçaria',
        isPrimary: true,
        orderIndex: 0,
      },
    ])
    expect(fields.teamName).toBe('Tapeçaria')
  })
})

describe('filterConveyorActivityTicketSources', () => {
  it('filtra concluídas quando includeCompleted é false', () => {
    const sources = collectConveyorActivityTicketSources(buildDetail(), null)
    const filtered = filterConveyorActivityTicketSources(sources, false)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.activityNodeId).toBe('step-open')
  })

  it('STEP ABORTED é excluído do lote padrão (e com includeCompleted)', () => {
    const detail = buildDetail({
      structure: {
        options: [
          {
            id: 'opt-1',
            name: 'Bancos dianteiros',
            orderIndex: 0,
            areas: [
              {
                id: 'area-1',
                name: 'Costura',
                orderIndex: 0,
                steps: [
                  step('step-open', 'Costurar lateral', 0, 'IN_PROGRESS'),
                  step('step-aborted', 'Atividade dispensada', 1, 'ABORTED'),
                ],
              },
            ],
          },
        ],
      },
      totalSteps: 2,
    })
    const sources = collectConveyorActivityTicketSources(detail, null)
    expect(sources).toHaveLength(2)

    const defaultBatch = filterConveyorActivityTicketSources(sources, false)
    expect(defaultBatch).toHaveLength(1)
    expect(defaultBatch[0]?.activityNodeId).toBe('step-open')

    const withCompleted = filterConveyorActivityTicketSources(sources, true)
    expect(withCompleted).toHaveLength(1)
    expect(withCompleted[0]?.activityNodeId).toBe('step-open')
  })
})

describe('buildConveyorGroupedTicketPrintItems', () => {
  it('insere cabeçalhos de agrupamento por tarefa', () => {
    const items = buildConveyorGroupedTicketPrintItems(buildDetail(), workload, {
      grouping: 'task',
      includeCompleted: false,
    })
    expect(items.some((item) => item.kind === 'header' && item.label.includes('BANCOS DIANTEIROS'))).toBe(
      true,
    )
    expect(items.filter((item) => item.kind === 'ticket')).toHaveLength(1)
  })
})
