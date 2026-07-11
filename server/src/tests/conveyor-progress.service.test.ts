import { beforeEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { serviceConveyorProgress } from '../modules/conveyor-progress/conveyor-progress.service.js'
import type {
  ConveyorProgressAssigneeRow,
  ConveyorProgressConveyorRow,
  ConveyorProgressStepRow,
  ConveyorProgressTimeEntryRow,
} from '../modules/conveyor-progress/conveyor-progress.repository.js'
import type { ConveyorProgressQuery } from '../modules/conveyor-progress/conveyor-progress.schemas.js'

const repoMocks = vi.hoisted(() => ({
  listConveyorsForProgress: vi.fn(),
  listConveyorIdsForCollaboratorFilter: vi.fn(),
  listStepHierarchyForConveyors: vi.fn(),
  listTimeEntriesForConveyors: vi.fn(),
  listPrimaryAssigneesForConveyors: vi.fn(),
}))

vi.mock('../modules/conveyor-progress/conveyor-progress.repository.js', () => ({
  listConveyorsForProgress: repoMocks.listConveyorsForProgress,
  listConveyorIdsForCollaboratorFilter: repoMocks.listConveyorIdsForCollaboratorFilter,
  listStepHierarchyForConveyors: repoMocks.listStepHierarchyForConveyors,
  listTimeEntriesForConveyors: repoMocks.listTimeEntriesForConveyors,
  listPrimaryAssigneesForConveyors: repoMocks.listPrimaryAssigneesForConveyors,
}))

const pool = {} as pg.Pool

function stepRow(
  overrides: Partial<ConveyorProgressStepRow> & Pick<ConveyorProgressStepRow, 'step_id'>,
): ConveyorProgressStepRow {
  return {
    conveyor_id: overrides.conveyor_id ?? 'conv-a',
    step_id: overrides.step_id,
    step_name: overrides.step_name ?? overrides.step_id,
    step_order: overrides.step_order ?? 1,
    planned_minutes: overrides.planned_minutes === undefined ? 0 : overrides.planned_minutes,
    operational_status: overrides.operational_status ?? 'PENDING',
    area_id: overrides.area_id ?? 'sector-1',
    area_name: overrides.area_name ?? 'Setor 1',
    area_order: overrides.area_order ?? 1,
    option_id: overrides.option_id ?? 'task-1',
    option_name: overrides.option_name ?? 'Tarefa 1',
    option_order: overrides.option_order ?? 1,
  }
}

function timeEntryRow(
  overrides: Partial<ConveyorProgressTimeEntryRow> &
    Pick<ConveyorProgressTimeEntryRow, 'id' | 'conveyor_id' | 'conveyor_node_id' | 'minutes'>,
): ConveyorProgressTimeEntryRow {
  return {
    id: overrides.id,
    conveyor_id: overrides.conveyor_id,
    conveyor_node_id: overrides.conveyor_node_id,
    entry_at: overrides.entry_at ?? new Date('2026-07-09T12:00:00.000Z'),
    minutes: overrides.minutes,
    executed_quantity: overrides.executed_quantity ?? null,
    notes: overrides.notes ?? null,
    entry_mode: overrides.entry_mode ?? 'manual',
    collaborator_name: overrides.collaborator_name ?? 'Maria',
    session_completion_pct: overrides.session_completion_pct ?? null,
  }
}

describe('serviceConveyorProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repoMocks.listConveyorIdsForCollaboratorFilter.mockResolvedValue(new Set())
    repoMocks.listPrimaryAssigneesForConveyors.mockResolvedValue([] satisfies ConveyorProgressAssigneeRow[])
  })

  it('faz consolidados ponderados por setor, tarefa, esteira e summary excluindo itens fora da base', async () => {
    const conveyors: ConveyorProgressConveyorRow[] = [
      {
        id: 'conv-a',
        code: 'EST-001',
        name: 'Esteira A',
        operational_status: 'EM_ANDAMENTO',
      },
      {
        id: 'conv-b',
        code: 'EST-002',
        name: 'Esteira B',
        operational_status: 'EM_ANDAMENTO',
      },
    ]

    const steps: ConveyorProgressStepRow[] = [
      stepRow({
        step_id: 'a-1',
        step_name: 'Atividade rápida parcial',
        step_order: 1,
        planned_minutes: 10,
        operational_status: 'IN_PROGRESS',
      }),
      stepRow({
        step_id: 'a-2',
        step_name: 'Atividade crítica concluída',
        step_order: 2,
        planned_minutes: 90,
        operational_status: 'COMPLETED',
      }),
      stepRow({
        step_id: 'a-3',
        step_name: 'Atividade não iniciada',
        step_order: 3,
        planned_minutes: 40,
        operational_status: 'PENDING',
      }),
      stepRow({
        step_id: 'a-4',
        step_name: 'Atividade sem tempo previsto',
        step_order: 4,
        planned_minutes: null,
        operational_status: 'IN_PROGRESS',
      }),
      stepRow({
        step_id: 'a-5',
        step_name: 'Atividade concluída sem apontamento',
        step_order: 5,
        planned_minutes: 20,
        operational_status: 'COMPLETED',
      }),
      stepRow({
        step_id: 'a-6',
        step_name: 'Atividade dentro do previsto',
        step_order: 6,
        planned_minutes: 20,
        operational_status: 'COMPLETED',
        area_id: 'sector-2',
        area_name: 'Setor 2',
        option_id: 'task-2',
        option_name: 'Tarefa 2',
        option_order: 2,
      }),
      stepRow({
        conveyor_id: 'conv-b',
        step_id: 'b-1',
        step_name: 'Atividade rápida concluída',
        step_order: 1,
        planned_minutes: 80,
        operational_status: 'COMPLETED',
        area_id: 'sector-3',
        area_name: 'Setor 3',
        option_id: 'task-3',
        option_name: 'Tarefa 3',
        option_order: 1,
      }),
    ]

    const timeEntries: ConveyorProgressTimeEntryRow[] = [
      timeEntryRow({
        id: 'te-a1',
        conveyor_id: 'conv-a',
        conveyor_node_id: 'a-1',
        minutes: 5,
      }),
      timeEntryRow({
        id: 'te-a2',
        conveyor_id: 'conv-a',
        conveyor_node_id: 'a-2',
        minutes: 180,
      }),
      timeEntryRow({
        id: 'te-a4',
        conveyor_id: 'conv-a',
        conveyor_node_id: 'a-4',
        minutes: 15,
      }),
      timeEntryRow({
        id: 'te-a6',
        conveyor_id: 'conv-a',
        conveyor_node_id: 'a-6',
        minutes: 20,
      }),
      timeEntryRow({
        id: 'te-b1',
        conveyor_id: 'conv-b',
        conveyor_node_id: 'b-1',
        minutes: 40,
      }),
    ]

    repoMocks.listConveyorsForProgress.mockResolvedValue(conveyors)
    repoMocks.listStepHierarchyForConveyors.mockResolvedValue(steps)
    repoMocks.listTimeEntriesForConveyors.mockResolvedValue(timeEntries)

    const query: ConveyorProgressQuery = {}

    const result = await serviceConveyorProgress(pool, query)

    expect(repoMocks.listConveyorsForProgress).toHaveBeenCalledWith(pool, {
      search: undefined,
      operationalStatus: undefined,
      timeEntryFrom: undefined,
      timeEntryTo: undefined,
      collaboratorId: undefined,
    })

    expect(result.items).toHaveLength(2)

    const conveyorA = result.items.find((item) => item.conveyorId === 'conv-a')
    const conveyorB = result.items.find((item) => item.conveyorId === 'conv-b')

    expect(conveyorA).toBeDefined()
    expect(conveyorB).toBeDefined()

    const task1 = conveyorA!.tasks.find((task) => task.taskId === 'task-1')
    const task2 = conveyorA!.tasks.find((task) => task.taskId === 'task-2')

    expect(task1).toBeDefined()
    expect(task2).toBeDefined()

    const sector1 = task1!.sectors.find((sector) => sector.sectorId === 'sector-1')
    const sector2 = task2!.sectors.find((sector) => sector.sectorId === 'sector-2')

    expect(sector1).toBeDefined()
    expect(sector2).toBeDefined()

    expect(sector1!.activities).toHaveLength(5)
    expect(sector1!.activities.map((activity) => activity.timeEfficiency.status)).toEqual([
      'MAIS_RAPIDO',
      'CRITICO',
      'NAO_INICIADA',
      'SEM_TEMPO_PREVISTO',
      'CONCLUIDA_SEM_APONTAMENTO',
    ])
    expect(
      sector1!.activities.map((activity) => activity.timeEfficiency.includedInCalculation),
    ).toEqual([
      true,
      true,
      false,
      false,
      false,
    ])

    expect(sector1!.timeEfficiency).toMatchObject({
      efficiencyPct: 54.1,
      status: 'CRITICO',
      deviationMinutes: 85,
      deviationPct: 85,
      partialCount: 1,
      includedInCalculationCount: 2,
      notStartedCount: 1,
      withoutPlannedTimeCount: 1,
      completedWithoutTimeCount: 1,
    })

    expect(task1!.timeEfficiency).toMatchObject({
      efficiencyPct: 54.1,
      status: 'CRITICO',
      deviationMinutes: 85,
      deviationPct: 85,
      partialCount: 1,
      includedInCalculationCount: 2,
      notStartedCount: 1,
      withoutPlannedTimeCount: 1,
      completedWithoutTimeCount: 1,
    })

    expect(sector2!.timeEfficiency).toMatchObject({
      efficiencyPct: 100,
      status: 'DENTRO_DO_PREVISTO',
      deviationMinutes: 0,
      deviationPct: 0,
      partialCount: 0,
      includedInCalculationCount: 1,
      notStartedCount: 0,
      withoutPlannedTimeCount: 0,
      completedWithoutTimeCount: 0,
    })

    expect(task2!.timeEfficiency).toMatchObject({
      efficiencyPct: 100,
      status: 'DENTRO_DO_PREVISTO',
      deviationMinutes: 0,
      deviationPct: 0,
      includedInCalculationCount: 1,
    })

    expect(conveyorA!.timeEfficiency).toMatchObject({
      efficiencyPct: 58.5,
      status: 'CRITICO',
      deviationMinutes: 85,
      deviationPct: 70.8,
      partialCount: 1,
      includedInCalculationCount: 3,
      notStartedCount: 1,
      withoutPlannedTimeCount: 1,
      completedWithoutTimeCount: 1,
    })

    expect(conveyorB!.timeEfficiency).toMatchObject({
      efficiencyPct: 200,
      status: 'MAIS_RAPIDO',
      deviationMinutes: -40,
      deviationPct: -50,
      partialCount: 0,
      includedInCalculationCount: 1,
      notStartedCount: 0,
      withoutPlannedTimeCount: 0,
      completedWithoutTimeCount: 0,
    })

    expect(result.summary.timeEfficiency).toMatchObject({
      efficiencyPct: 81.6,
      status: 'ATENCAO',
      deviationMinutes: 45,
      deviationPct: 22.5,
      partialCount: 1,
      includedInCalculationCount: 4,
      notStartedCount: 1,
      withoutPlannedTimeCount: 1,
      completedWithoutTimeCount: 1,
    })
  })

  it('separa evolução operacional do consumo temporal no cenário real', async () => {
    const conveyors: ConveyorProgressConveyorRow[] = [
      {
        id: 'conv-a',
        code: 'EST-001',
        name: 'Esteira A',
        operational_status: 'EM_ANDAMENTO',
      },
    ]

    const steps: ConveyorProgressStepRow[] = [
      stepRow({
        step_id: 'a-1',
        step_name: 'Atividade parcial',
        planned_minutes: 205,
        operational_status: 'IN_PROGRESS',
      }),
    ]

    const timeEntries: ConveyorProgressTimeEntryRow[] = [
      timeEntryRow({
        id: 'te-a1',
        conveyor_id: 'conv-a',
        conveyor_node_id: 'a-1',
        minutes: 185,
        session_completion_pct: 50,
      }),
    ]

    repoMocks.listConveyorsForProgress.mockResolvedValue(conveyors)
    repoMocks.listStepHierarchyForConveyors.mockResolvedValue(steps)
    repoMocks.listTimeEntriesForConveyors.mockResolvedValue(timeEntries)

    const result = await serviceConveyorProgress(pool, {})

    const activity = result.items[0]?.tasks[0]?.sectors[0]?.activities[0]
    expect(activity).toMatchObject({
      plannedMinutes: 205,
      realizedMinutes: 185,
      remainingMinutes: 20,
      exceededMinutes: 0,
      operationalProgressPct: 50,
      timeConsumptionPct: 90.2,
    })

    expect(result.items[0]?.operationalProgressPct).toBe(50)
    expect(result.items[0]?.timeConsumptionPct).toBe(90.2)
    expect(result.items[0]?.tasks[0]?.operationalProgressPct).toBe(50)
    expect(result.items[0]?.tasks[0]?.sectors[0]?.operationalProgressPct).toBe(50)
  })
})
