import { beforeEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import type { StepHierarchyRow } from './conveyorNodeWorkload.repository.js'
import { findConveyorById } from './conveyors.repository.js'
import {
  listStepHierarchyForConveyor,
  sumRealizedMinutesByStepForConveyor,
} from './conveyorNodeWorkload.repository.js'
import { serviceGetConveyorNodeWorkload } from './conveyorNodeWorkload.service.js'

vi.mock('./conveyors.repository.js', () => ({
  findConveyorById: vi.fn(),
}))

vi.mock('./conveyorNodeWorkload.repository.js', () => ({
  listStepHierarchyForConveyor: vi.fn(),
  sumRealizedMinutesByStepForConveyor: vi.fn(),
}))

const pool = {} as pg.Pool
const conveyorId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function hierarchyRow(
  partial: Partial<StepHierarchyRow> &
    Pick<
      StepHierarchyRow,
      | 'step_id'
      | 'step_name'
      | 'step_order'
      | 'area_id'
      | 'area_name'
      | 'area_order'
      | 'option_id'
      | 'option_name'
      | 'option_order'
    >,
): StepHierarchyRow {
  return {
    planned_minutes: 60,
    planned_quantity: 1,
    operational_status: 'PENDING',
    ...partial,
  }
}

describe('serviceGetConveyorNodeWorkload — ordem estrutural', () => {
  beforeEach(() => {
    vi.mocked(findConveyorById).mockResolvedValue({
      id: conveyorId,
      operational_status: 'EM_ANDAMENTO',
      estimated_deadline: null,
    } as Awaited<ReturnType<typeof findConveyorById>>)
  })

  it('ordena steps e areas pela sequência estrutural, não por pendência', async () => {
    const stepLowPending = hierarchyRow({
      option_id: 'opt-1',
      option_name: 'Tarefa A',
      option_order: 1,
      area_id: 'area-1',
      area_name: 'Setor 1',
      area_order: 1,
      step_id: 'step-1',
      step_name: '1 - RETIRADA',
      step_order: 1,
      planned_minutes: 10,
    })
    const stepHighPending = hierarchyRow({
      option_id: 'opt-1',
      option_name: 'Tarefa A',
      option_order: 1,
      area_id: 'area-2',
      area_name: 'Setor 2',
      area_order: 2,
      step_id: 'step-2',
      step_name: '2 - CARPETE',
      step_order: 1,
      planned_minutes: 100,
    })
    const stepMidPending = hierarchyRow({
      option_id: 'opt-1',
      option_name: 'Tarefa A',
      option_order: 1,
      area_id: 'area-3',
      area_name: 'Setor 3',
      area_order: 3,
      step_id: 'step-3',
      step_name: '3 - TETO',
      step_order: 1,
      planned_minutes: 50,
    })

    vi.mocked(listStepHierarchyForConveyor).mockResolvedValue([
      stepHighPending,
      stepMidPending,
      stepLowPending,
    ])
    vi.mocked(sumRealizedMinutesByStepForConveyor).mockResolvedValue(
      new Map([
        ['step-1', 9],
        ['step-2', 0],
        ['step-3', 10],
      ]),
    )

    const result = await serviceGetConveyorNodeWorkload(pool, conveyorId)

    expect(result).not.toBeNull()
    expect(result!.steps.map((s) => s.stepId)).toEqual(['step-1', 'step-2', 'step-3'])
    expect(result!.steps.map((s) => s.pendingMinutes)).toEqual([1, 100, 40])
    expect(result!.areas.map((a) => a.areaId)).toEqual(['area-1', 'area-2', 'area-3'])
    expect(result!.areas.map((a) => a.pendingMinutesSum)).toEqual([1, 100, 40])
  })

  it('desempata steps pelo id quando order_index coincide', async () => {
    vi.mocked(listStepHierarchyForConveyor).mockResolvedValue([
      hierarchyRow({
        option_id: 'opt-1',
        option_name: 'Tarefa A',
        option_order: 1,
        area_id: 'area-1',
        area_name: 'Setor 1',
        area_order: 1,
        step_id: 'step-b',
        step_name: 'Atividade B',
        step_order: 1,
        planned_minutes: 30,
      }),
      hierarchyRow({
        option_id: 'opt-1',
        option_name: 'Tarefa A',
        option_order: 1,
        area_id: 'area-1',
        area_name: 'Setor 1',
        area_order: 1,
        step_id: 'step-a',
        step_name: 'Atividade A',
        step_order: 1,
        planned_minutes: 30,
      }),
    ])
    vi.mocked(sumRealizedMinutesByStepForConveyor).mockResolvedValue(new Map())

    const result = await serviceGetConveyorNodeWorkload(pool, conveyorId)

    expect(result!.steps.map((s) => s.stepId)).toEqual(['step-a', 'step-b'])
  })

  it('preserva métricas agregadas independentemente da ordem de entrada', async () => {
    vi.mocked(listStepHierarchyForConveyor).mockResolvedValue([
      hierarchyRow({
        option_id: 'opt-2',
        option_name: 'Tarefa B',
        option_order: 2,
        area_id: 'area-x',
        area_name: 'Setor X',
        area_order: 1,
        step_id: 'step-x2',
        step_name: 'Atividade X2',
        step_order: 2,
        planned_minutes: 20,
      }),
      hierarchyRow({
        option_id: 'opt-1',
        option_name: 'Tarefa A',
        option_order: 1,
        area_id: 'area-y',
        area_name: 'Setor Y',
        area_order: 1,
        step_id: 'step-y1',
        step_name: 'Atividade Y1',
        step_order: 1,
        planned_minutes: 15,
      }),
      hierarchyRow({
        option_id: 'opt-1',
        option_name: 'Tarefa A',
        option_order: 1,
        area_id: 'area-y',
        area_name: 'Setor Y',
        area_order: 1,
        step_id: 'step-y2',
        step_name: 'Atividade Y2',
        step_order: 2,
        planned_minutes: 25,
      }),
    ])
    vi.mocked(sumRealizedMinutesByStepForConveyor).mockResolvedValue(
      new Map([
        ['step-y1', 5],
        ['step-y2', 10],
      ]),
    )

    const result = await serviceGetConveyorNodeWorkload(pool, conveyorId)

    expect(result!.steps.map((s) => s.stepId)).toEqual(['step-y1', 'step-y2', 'step-x2'])
    expect(result!.areas).toHaveLength(2)
    expect(result!.areas[0]).toMatchObject({
      areaId: 'area-y',
      plannedMinutesSum: 40,
      realizedMinutesSum: 15,
      pendingMinutesSum: 25,
    })
    expect(result!.areas[1]).toMatchObject({
      areaId: 'area-x',
      plannedMinutesSum: 20,
      realizedMinutesSum: 0,
      pendingMinutesSum: 20,
    })
  })
})
