import { describe, expect, it } from 'vitest'
import {
  buildExecutionOutsidePlanSummary,
  mapExecutionOutsidePlanEntryToApi,
  type ExecutionOutsidePlanEntryRow,
} from '../modules/operational-planning/operational-planning.execution-outside-plan.js'

function sampleEntry(
  partial: Partial<ExecutionOutsidePlanEntryRow> & Pick<ExecutionOutsidePlanEntryRow, 'id'>,
): ExecutionOutsidePlanEntryRow {
  return {
    conveyor_id: partial.conveyor_id ?? 'cv-1',
    conveyor_title: partial.conveyor_title ?? 'Esteira A',
    activity_node_id: partial.activity_node_id ?? 'step-1',
    activity_title: partial.activity_title ?? 'Atividade',
    task_title: partial.task_title ?? 'Tarefa',
    sector_title: partial.sector_title ?? 'Setor',
    collaborator_id: partial.collaborator_id ?? 'col-1',
    collaborator_name: partial.collaborator_name ?? 'Colaborador',
    entry_at: partial.entry_at ?? new Date('2026-05-13T14:00:00.000Z'),
    minutes: partial.minutes ?? 30,
    entry_origin: partial.entry_origin ?? 'ASSIGNED',
    exception_justification: partial.exception_justification ?? null,
    notes: partial.notes ?? null,
    ...partial,
    id: partial.id,
  }
}

describe('buildExecutionOutsidePlanSummary', () => {
  it('returns zeros for empty rows', () => {
    expect(buildExecutionOutsidePlanSummary([])).toEqual({
      totalMinutes: 0,
      entriesCount: 0,
      activitiesCount: 0,
      conveyorsCount: 0,
    })
  })

  it('aggregates minutes and distinct activity/conveyor counts', () => {
    const summary = buildExecutionOutsidePlanSummary([
      sampleEntry({ id: 'e1', minutes: 20, activity_node_id: 'step-a', conveyor_id: 'cv-1' }),
      sampleEntry({ id: 'e2', minutes: 15, activity_node_id: 'step-a', conveyor_id: 'cv-1' }),
      sampleEntry({ id: 'e3', minutes: 10, activity_node_id: 'step-b', conveyor_id: 'cv-2' }),
    ])
    expect(summary).toEqual({
      totalMinutes: 45,
      entriesCount: 3,
      activitiesCount: 2,
      conveyorsCount: 2,
    })
  })
})

describe('mapExecutionOutsidePlanEntryToApi', () => {
  it('maps row fields to camelCase API shape', () => {
    const entryAt = new Date('2026-05-13T10:30:00.000Z')
    const api = mapExecutionOutsidePlanEntryToApi(
      sampleEntry({
        id: 'entry-1',
        entry_at: entryAt,
        entry_origin: 'UNASSIGNED_EXCEPTION',
        exception_justification: 'Apoio urgente',
      }),
    )
    expect(api).toMatchObject({
      id: 'entry-1',
      conveyorId: 'cv-1',
      activityNodeId: 'step-1',
      collaboratorName: 'Colaborador',
      minutes: 30,
      entryOrigin: 'UNASSIGNED_EXCEPTION',
      exceptionJustification: 'Apoio urgente',
    })
    expect(api.entryAt).toBe(entryAt.toISOString())
  })
})
