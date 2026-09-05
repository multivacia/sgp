import { describe, expect, it } from 'vitest'
import {
  applyPlanningSuggestionToFields,
  initialFieldsFromSuggestion,
  knownRemainingCapacityMinutes,
  resolvePlanningCollaboratorSuggestion,
  type PlanningCapacityLookupRow,
} from './planningCollaboratorSuggestion'
import type { OperationalPlanningSuggestionContext } from './operational-planning.types'

const week = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03']

function member(
  partial: Partial<OperationalPlanningSuggestionContext['members'][number]> & { id: string },
): OperationalPlanningSuggestionContext['members'][number] {
  return {
    code: partial.code ?? null,
    fullName: partial.fullName ?? partial.id,
    isPrimary: Boolean(partial.isPrimary),
    suggestionOrder: partial.suggestionOrder ?? 1,
    ...partial,
  }
}

function context(
  partial: Partial<OperationalPlanningSuggestionContext> = {},
): OperationalPlanningSuggestionContext {
  const members = partial.members ?? [
    member({ id: 'joao', code: 'J1', fullName: 'João', isPrimary: true, suggestionOrder: 9 }),
    member({ id: 'maria', code: 'M1', fullName: 'Maria', suggestionOrder: 1 }),
  ]
  return {
    responsibleCollaboratorId: 'joao',
    responsibleCollaboratorCode: 'J1',
    responsibleCollaboratorFullName: 'João',
    effectiveTeamId: 'team-1',
    effectiveTeamName: 'Tapeçaria',
    multipleTeamsAssigned: false,
    ...partial,
    members,
  }
}

function cap(
  collaboratorId: string,
  date: string,
  capacityMinutes: number,
): PlanningCapacityLookupRow {
  return { collaboratorId, date, capacityMinutes }
}

function capsFor(
  ids: string[],
  minutes: number,
  dates: string[] = week,
): PlanningCapacityLookupRow[] {
  return ids.flatMap((id) => dates.map((date) => cap(id, date, minutes)))
}

describe('knownRemainingCapacityMinutes', () => {
  it('treats missing row as unknown and does not fall back to 480', () => {
    expect(
      knownRemainingCapacityMinutes({
        collaboratorId: 'joao',
        date: week[0],
        capacityRows: [],
        draftItems: [],
      }),
    ).toEqual({ known: false, remaining: null })
  })

  it('subtracts unsaved draft minutes', () => {
    const remaining = knownRemainingCapacityMinutes({
      collaboratorId: 'joao',
      date: week[0],
      capacityRows: [cap('joao', week[0], 300)],
      draftItems: [
        {
          assignedCollaboratorId: 'joao',
          plannedDate: week[0],
          plannedMinutes: 90,
        },
      ],
    })
    expect(remaining).toEqual({ known: true, remaining: 210 })
  })
})

describe('resolvePlanningCollaboratorSuggestion', () => {
  it('keeps responsible and day when they fit, including equality', () => {
    const result = resolvePlanningCollaboratorSuggestion({
      context: context(),
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 120,
      capacityRows: [cap('joao', week[0], 120)],
      draftItems: [],
    })
    expect(result.primary?.kind).toBe('keep_responsible_and_day')
    expect(result.primary?.collaboratorId).toBe('joao')
    expect(result.primary?.day).toBe(week[0])
    expect(result.primary?.availableMinutes).toBe(120)
    expect(result.alternatives).toHaveLength(0)
  })

  it('offers same responsible on the next displayed day and does not wrap the week', () => {
    const result = resolvePlanningCollaboratorSuggestion({
      context: context(),
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 200,
      capacityRows: [
        cap('joao', week[0], 100),
        cap('joao', week[1], 100),
        cap('joao', week[2], 200),
        cap('maria', week[0], 480),
      ],
      draftItems: [],
    })
    expect(result.primary).toBeNull()
    const nextDay = result.alternatives.find((a) => a.kind === 'keep_responsible_next_day')
    expect(nextDay?.collaboratorId).toBe('joao')
    expect(nextDay?.day).toBe(week[2])
    expect(nextDay?.day).not.toBe(week[0])
  })

  it('does not suggest a day outside weekdayDates', () => {
    const result = resolvePlanningCollaboratorSuggestion({
      context: context(),
      selectedDay: week[4],
      weekdayDates: week,
      neededMinutes: 200,
      capacityRows: [cap('joao', week[4], 50), cap('joao', '2026-07-06', 480)],
      draftItems: [],
    })
    expect(result.alternatives.some((a) => a.kind === 'keep_responsible_next_day')).toBe(false)
  })

  it('suggests the next sequence member on the same day, skipping one without capacity', () => {
    const ctx = context({
      members: [
        member({ id: 'joao', code: 'J1', fullName: 'João', isPrimary: true, suggestionOrder: 9 }),
        member({ id: 'ana', code: 'A9', fullName: 'Ana', suggestionOrder: 1 }),
        member({ id: 'maria', code: 'M1', fullName: 'Maria', suggestionOrder: 2 }),
      ],
    })
    const result = resolvePlanningCollaboratorSuggestion({
      context: ctx,
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 180,
      capacityRows: [
        cap('joao', week[0], 60),
        cap('ana', week[0], 50),
        cap('maria', week[0], 200),
      ],
      draftItems: [],
    })
    const next = result.alternatives.find((a) => a.kind === 'next_sequence_same_day')
    expect(next?.collaboratorId).toBe('maria')
  })

  it('for a common responsible, tries same level before later levels', () => {
    const ctx = context({
      responsibleCollaboratorId: 'ana',
      responsibleCollaboratorCode: 'A1',
      responsibleCollaboratorFullName: 'Ana',
      members: [
        member({ id: 'joao', code: 'J1', fullName: 'João', isPrimary: true, suggestionOrder: 1 }),
        member({ id: 'ana', code: 'A1', fullName: 'Ana', suggestionOrder: 2 }),
        member({ id: 'bia', code: 'B1', fullName: 'Bia', suggestionOrder: 2 }),
        member({ id: 'carla', code: 'C1', fullName: 'Carla', suggestionOrder: 3 }),
      ],
    })
    const result = resolvePlanningCollaboratorSuggestion({
      context: ctx,
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 100,
      capacityRows: [
        cap('ana', week[0], 40),
        cap('bia', week[0], 100),
        cap('carla', week[0], 480),
        cap('joao', week[0], 480),
      ],
      draftItems: [],
    })
    const next = result.alternatives.find((a) => a.kind === 'next_sequence_same_day')
    expect(next?.collaboratorId).toBe('bia')
  })

  it('breaks same-level ties by remaining capacity, then code, then id — never name', () => {
    const ctx = context({
      responsibleCollaboratorId: 'ana',
      responsibleCollaboratorCode: 'Z9',
      responsibleCollaboratorFullName: 'Ana',
      members: [
        member({ id: 'ana', code: 'Z9', fullName: 'Ana', isPrimary: true, suggestionOrder: 1 }),
        member({ id: 'id-b', code: 'B1', fullName: 'Ana', suggestionOrder: 2 }),
        member({ id: 'id-a', code: 'A1', fullName: 'Bruno', suggestionOrder: 2 }),
      ],
    })
    const equalCaps = resolvePlanningCollaboratorSuggestion({
      context: ctx,
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 60,
      capacityRows: [
        cap('ana', week[0], 10),
        cap('id-b', week[0], 200),
        cap('id-a', week[0], 200),
      ],
      draftItems: [],
    })
    expect(
      equalCaps.alternatives.find((a) => a.kind === 'next_sequence_same_day')?.collaboratorId,
    ).toBe('id-a')

    const byCapacity = resolvePlanningCollaboratorSuggestion({
      context: ctx,
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 60,
      capacityRows: [
        cap('ana', week[0], 10),
        cap('id-b', week[0], 300),
        cap('id-a', week[0], 200),
      ],
      draftItems: [],
    })
    expect(
      byCapacity.alternatives.find((a) => a.kind === 'next_sequence_same_day')?.collaboratorId,
    ).toBe('id-b')
  })

  it('ignores inactive, ineligible members and does not invent a circular fallback', () => {
    const ctx = context({
      members: [
        member({ id: 'joao', code: 'J1', fullName: 'João', isPrimary: true, suggestionOrder: 1 }),
      ],
    })
    const result = resolvePlanningCollaboratorSuggestion({
      context: ctx,
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 400,
      capacityRows: [cap('joao', week[0], 50), cap('joao', week[1], 50)],
      draftItems: [],
    })
    expect(result.noAutomaticFit).toBe(true)
    expect(result.alternatives).toHaveLength(0)
  })

  it('when responsible is absent from the team, starts at the active primary', () => {
    const ctx = context({
      responsibleCollaboratorId: 'externo',
      responsibleCollaboratorCode: 'X1',
      responsibleCollaboratorFullName: 'Externo',
      members: [
        member({ id: 'joao', code: 'J1', fullName: 'João', isPrimary: true, suggestionOrder: 8 }),
        member({ id: 'maria', code: 'M1', fullName: 'Maria', suggestionOrder: 1 }),
      ],
    })
    const result = resolvePlanningCollaboratorSuggestion({
      context: ctx,
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 100,
      capacityRows: [cap('externo', week[0], 10), cap('joao', week[0], 100), cap('maria', week[0], 480)],
      draftItems: [],
    })
    expect(
      result.alternatives.find((a) => a.kind === 'next_sequence_same_day')?.collaboratorId,
    ).toBe('joao')
  })

  it('when responsible is absent and there is no primary, starts at the lowest level', () => {
    const ctx = context({
      responsibleCollaboratorId: 'externo',
      responsibleCollaboratorCode: 'X1',
      responsibleCollaboratorFullName: 'Externo',
      members: [
        member({ id: 'carla', code: 'C2', fullName: 'Carla', suggestionOrder: 2 }),
        member({ id: 'maria', code: 'M1', fullName: 'Maria', suggestionOrder: 1 }),
      ],
    })
    const result = resolvePlanningCollaboratorSuggestion({
      context: ctx,
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 80,
      capacityRows: [
        cap('externo', week[0], 10),
        cap('carla', week[0], 480),
        cap('maria', week[0], 80),
      ],
      draftItems: [],
    })
    expect(
      result.alternatives.find((a) => a.kind === 'next_sequence_same_day')?.collaboratorId,
    ).toBe('maria')
  })

  it('does not classify unknown capacity as a valid fit', () => {
    const result = resolvePlanningCollaboratorSuggestion({
      context: context(),
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 60,
      capacityRows: [cap('maria', week[0], 480)],
      draftItems: [],
    })
    expect(result.responsibleCapacityUnknown).toBe(true)
    expect(result.primary).toBeNull()
    expect(result.alternatives.some((a) => a.collaboratorId === 'joao' && a.day === week[0])).toBe(
      false,
    )
  })

  it('recalculates when modal minutes change and when unsaved draft consumes capacity', () => {
    const ctx = context()
    const rows = capsFor(['joao', 'maria'], 180)
    const withDraft = resolvePlanningCollaboratorSuggestion({
      context: ctx,
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 60,
      capacityRows: rows,
      draftItems: [
        { assignedCollaboratorId: 'joao', plannedDate: week[0], plannedMinutes: 150 },
      ],
    })
    expect(withDraft.primary).toBeNull()
    const moreMinutes = resolvePlanningCollaboratorSuggestion({
      context: ctx,
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 200,
      capacityRows: [cap('joao', week[0], 180), cap('maria', week[0], 480)],
      draftItems: [],
    })
    expect(moreMinutes.primary).toBeNull()
    expect(
      moreMinutes.alternatives.find((a) => a.kind === 'next_sequence_same_day')?.collaboratorId,
    ).toBe('maria')
  })

  it('without a team, alternative B is empty', () => {
    const result = resolvePlanningCollaboratorSuggestion({
      context: context({
        effectiveTeamId: null,
        members: [],
      }),
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 200,
      capacityRows: [cap('joao', week[0], 50), cap('joao', week[1], 200)],
      draftItems: [],
    })
    expect(result.alternatives.some((a) => a.kind === 'next_sequence_same_day')).toBe(false)
    expect(result.alternatives.find((a) => a.kind === 'keep_responsible_next_day')?.day).toBe(
      week[1],
    )
  })

  it('applyPlanningSuggestionToFields only returns collaborator and day', () => {
    const next = applyPlanningSuggestionToFields(
      { collaboratorId: 'joao', day: week[0] },
      { collaboratorId: 'maria', day: week[2] },
    )
    expect(next).toEqual({ collaboratorId: 'maria', day: week[2] })
    expect(Object.keys(next)).toEqual(['collaboratorId', 'day'])
  })

  it('does not auto-apply alternatives as the initial seed', () => {
    const result = resolvePlanningCollaboratorSuggestion({
      context: context(),
      selectedDay: week[0],
      weekdayDates: week,
      neededMinutes: 200,
      capacityRows: [cap('joao', week[0], 50), cap('joao', week[1], 200), cap('maria', week[0], 200)],
      draftItems: [],
    })
    const fields = initialFieldsFromSuggestion({
      result,
      fallbackCollaboratorId: 'fallback',
      fallbackDay: week[0],
    })
    expect(fields).toEqual({ collaboratorId: 'joao', day: week[0] })
  })
})
