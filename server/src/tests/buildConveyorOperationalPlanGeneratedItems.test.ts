import { describe, expect, it } from 'vitest'
import {
  buildConveyorOperationalPlanGeneratedItems,
  DEFAULT_DAILY_CAPACITY_MINUTES,
  nextBusinessDayAfter,
  nextBusinessDayOnOrAfter,
  type ConveyorPlanGenerationStepInput,
} from '../modules/conveyor-operational-plan/buildConveyorOperationalPlanGeneratedItems.js'

const STEP_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const STEP_B = 'bbbbbbbb-0000-0000-0000-000000000002'
const STEP_C = 'cccccccc-0000-0000-0000-000000000003'
const COLLAB = 'dddddddd-0000-0000-0000-000000000004'
const TEAM_ONE = 'eeeeeeee-0000-0000-0000-000000000005'
const TEAM_TWO = 'ffffffff-0000-0000-0000-000000000006'

function step(
  partial: Partial<ConveyorPlanGenerationStepInput> & Pick<ConveyorPlanGenerationStepInput, 'activityNodeId'>,
): ConveyorPlanGenerationStepInput {
  return {
    taskName: 'Tarefa',
    areaName: 'Setor',
    activityName: 'Atividade',
    optionOrderIndex: 0,
    areaOrderIndex: 0,
    stepOrderIndex: 0,
    plannedMinutes: 60,
    defaultResponsibleId: null,
    collaboratorAssigneeIds: [],
    teamAssigneeIds: [],
    ...partial,
  }
}

describe('buildConveyorOperationalPlanGeneratedItems', () => {
  it('orders STEPs by structural order_index', () => {
    const inputSteps = [
      step({
        activityNodeId: STEP_C,
        optionOrderIndex: 0,
        areaOrderIndex: 1,
        stepOrderIndex: 0,
      }),
      step({
        activityNodeId: STEP_A,
        optionOrderIndex: 0,
        areaOrderIndex: 0,
        stepOrderIndex: 0,
      }),
      step({
        activityNodeId: STEP_B,
        optionOrderIndex: 0,
        areaOrderIndex: 0,
        stepOrderIndex: 1,
      }),
    ]
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: inputSteps,
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items.map((i) => i.activityNodeId)).toEqual([STEP_A, STEP_B, STEP_C])
    expect(items.map((i) => i.plannedOrder)).toEqual([0, 1, 2])
  })

  it('skips weekends when scheduling', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [
        step({ activityNodeId: STEP_A, plannedMinutes: 300 }),
        step({ activityNodeId: STEP_B, plannedMinutes: 300 }),
      ],
      plannedStartDate: '2026-05-15',
      dailyCapacityMinutes: 480,
    })
    expect(items[0].plannedDate).toBe('2026-05-15')
    expect(items[1].plannedDate).toBe('2026-05-18')
  })

  it('starts on next Monday when plannedStartDate is Saturday', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 60 })],
      plannedStartDate: '2026-05-16',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedDate).toBe('2026-05-18')
  })

  it('uses plannedMinutes from STEP', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 125 })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedMinutes).toBe(125)
  })

  it('marks review when plannedMinutes is 0', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 0 })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].reviewRequired).toBe(true)
    expect(items[0].status).toBe('NEEDS_REVIEW')
  })

  it('marks review when plannedMinutes is null', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: null })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedMinutes).toBe(0)
    expect(items[0].reviewRequired).toBe(true)
  })

  it('marks review when plannedMinutes exceeds daily capacity', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 600 })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].reviewRequired).toBe(true)
    expect(items[0].plannedDate).toBe('2026-05-18')
  })

  it('with dailyCapacityMinutes 540, STEP of 500 min does not mark review by capacity', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 500, collaboratorAssigneeIds: [COLLAB] })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: 540,
    })
    expect(items[0].reviewRequired).toBe(false)
  })

  it('with dailyCapacityMinutes 540, STEP of 600 min marks review', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 600 })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: 540,
    })
    expect(items[0].reviewRequired).toBe(true)
  })

  it('with dailyCapacityMinutes 300, distributes across more days', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [
        step({ activityNodeId: STEP_A, plannedMinutes: 200 }),
        step({ activityNodeId: STEP_B, plannedMinutes: 200 }),
      ],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: 300,
    })
    expect(items[0].plannedDate).toBe('2026-05-18')
    expect(items[1].plannedDate).toBe('2026-05-19')
  })

  it('does not use 480 when another dailyCapacityMinutes is provided', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, plannedMinutes: 500, collaboratorAssigneeIds: [COLLAB] })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: 540,
    })
    expect(items[0].reviewRequired).toBe(false)
    expect(items[0].warnings).toEqual([])
  })

  it('uses defaultResponsibleId when set on STEP', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [
        step({
          activityNodeId: STEP_A,
          defaultResponsibleId: COLLAB,
          collaboratorAssigneeIds: ['other-collab-id'],
        }),
      ],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedCollaboratorId).toBe(COLLAB)
    expect(items[0].plannedTeamId).toBeNull()
    expect(items[0].reviewRequired).toBe(false)
  })

  it('uses single COLLABORATOR assignee when defaultResponsibleId is absent', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, collaboratorAssigneeIds: [COLLAB] })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedCollaboratorId).toBe(COLLAB)
    expect(items[0].plannedTeamId).toBeNull()
    expect(items[0].reviewRequired).toBe(false)
  })

  it('uses team when exactly one TEAM assignee and no collaborator', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, teamAssigneeIds: [TEAM_ONE] })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedTeamId).toBe(TEAM_ONE)
    expect(items[0].plannedCollaboratorId).toBeNull()
    expect(items[0].reviewRequired).toBe(false)
  })

  it('prefers collaborator assignee over single team when both exist', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [
        step({
          activityNodeId: STEP_A,
          collaboratorAssigneeIds: [COLLAB],
          teamAssigneeIds: [TEAM_ONE],
        }),
      ],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedCollaboratorId).toBe(COLLAB)
    expect(items[0].plannedTeamId).toBeNull()
    expect(items[0].reviewRequired).toBe(false)
  })

  it('marks review with multiple collaborator assignees', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [
        step({
          activityNodeId: STEP_A,
          collaboratorAssigneeIds: [COLLAB, 'bbbbbbbb-0000-0000-0000-000000000099'],
        }),
      ],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedCollaboratorId).toBeNull()
    expect(items[0].plannedTeamId).toBeNull()
    expect(items[0].reviewRequired).toBe(true)
  })

  it('marks review with multiple teams', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A, teamAssigneeIds: [TEAM_ONE, TEAM_TWO] })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedTeamId).toBeNull()
    expect(items[0].plannedCollaboratorId).toBeNull()
    expect(items[0].reviewRequired).toBe(true)
  })

  it('marks review when no collaborator nor team assignee', () => {
    const { items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [step({ activityNodeId: STEP_A })],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(items[0].plannedCollaboratorId).toBeNull()
    expect(items[0].plannedTeamId).toBeNull()
    expect(items[0].reviewRequired).toBe(true)
  })

  it('does not mutate input steps array order', () => {
    const inputSteps = [
      step({ activityNodeId: STEP_B, areaOrderIndex: 1 }),
      step({ activityNodeId: STEP_A, areaOrderIndex: 0 }),
    ]
    const copy = inputSteps.map((s) => ({
      ...s,
      collaboratorAssigneeIds: [...s.collaboratorAssigneeIds],
      teamAssigneeIds: [...s.teamAssigneeIds],
    }))
    buildConveyorOperationalPlanGeneratedItems({
      steps: inputSteps,
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(inputSteps).toEqual(copy)
  })

  it('sets plannedEndDate to last generated date', () => {
    const { plannedEndDate, items } = buildConveyorOperationalPlanGeneratedItems({
      steps: [
        step({ activityNodeId: STEP_A, plannedMinutes: 400 }),
        step({ activityNodeId: STEP_B, plannedMinutes: 200 }),
      ],
      plannedStartDate: '2026-05-18',
      dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    })
    expect(plannedEndDate).toBe(items[items.length - 1].plannedDate)
  })
})

describe('nextBusinessDay helpers', () => {
  it('nextBusinessDayOnOrAfter skips Sunday', () => {
    const sat = new Date(Date.UTC(2026, 4, 16))
    const mon = nextBusinessDayOnOrAfter(sat)
    expect(mon.toISOString().slice(0, 10)).toBe('2026-05-18')
  })

  it('nextBusinessDayAfter from Friday lands on Monday', () => {
    const fri = new Date(Date.UTC(2026, 4, 15))
    const mon = nextBusinessDayAfter(fri)
    expect(mon.toISOString().slice(0, 10)).toBe('2026-05-18')
  })
})
