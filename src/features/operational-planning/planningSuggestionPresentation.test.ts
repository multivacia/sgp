import { describe, expect, it } from 'vitest'
import type { PlanningCollaboratorSuggestionResult } from '../../domain/operational-planning/planningCollaboratorSuggestion'
import {
  buildPlanningSuggestionCardViews,
  planningSuggestionCapacityMessage,
} from './planningSuggestionPresentation'

const week = ['2026-06-29', '2026-06-30']
const labels = ['Seg', 'Ter']

function result(
  partial: Partial<PlanningCollaboratorSuggestionResult>,
): PlanningCollaboratorSuggestionResult {
  return {
    neededMinutes: 240,
    originalResponsible: { id: 'joao', code: 'J1', fullName: 'João' },
    effectiveTeamId: 'team-1',
    multipleTeamsAssigned: false,
    primary: null,
    alternatives: [],
    noAutomaticFit: false,
    responsibleCapacityUnknown: false,
    responsibleAvailableMinutes: 150,
    hasContext: true,
    ...partial,
  }
}

describe('planningSuggestionPresentation', () => {
  it('builds accessible card copy and selected state without relying only on color', () => {
    const cards = buildPlanningSuggestionCardViews({
      result: result({
        alternatives: [
          {
            kind: 'keep_responsible_next_day',
            reasonCode: 'KEEP_RESPONSIBLE_NEXT_DAY',
            collaboratorId: 'joao',
            collaboratorCode: 'J1',
            collaboratorFullName: 'João',
            day: week[1],
            neededMinutes: 240,
            availableMinutes: 300,
            sequenceLevel: 0,
            isPrimaryMember: true,
          },
          {
            kind: 'next_sequence_same_day',
            reasonCode: 'NEXT_SEQUENCE_SAME_DAY',
            collaboratorId: 'maria',
            collaboratorCode: 'M1',
            collaboratorFullName: 'Maria',
            day: week[0],
            neededMinutes: 240,
            availableMinutes: 270,
            sequenceLevel: 1,
            isPrimaryMember: false,
          },
        ],
      }),
      weekdayDates: week,
      weekdayLabels: labels,
      selectedCollaboratorId: 'maria',
      selectedDay: week[0],
    })
    expect(cards).toHaveLength(2)
    expect(cards[0]?.title).toBe('Manter o responsável')
    expect(cards[1]?.title).toBe('Manter o dia')
    expect(cards[1]?.selected).toBe(true)
    expect(cards[0]?.selected).toBe(false)
  })

  it('explains missing fit using needed vs available minutes', () => {
    const message = planningSuggestionCapacityMessage(
      result({ noAutomaticFit: false, responsibleAvailableMinutes: 150, neededMinutes: 240 }),
    )
    expect(message).toContain('4h')
    expect(message).toContain('2h30')
  })

  it('explains unknown capacity without inventing a fit', () => {
    const message = planningSuggestionCapacityMessage(
      result({ responsibleCapacityUnknown: true, responsibleAvailableMinutes: null }),
    )
    expect(message).toMatch(/indisponível/i)
  })
})
