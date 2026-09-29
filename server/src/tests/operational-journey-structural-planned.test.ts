import { describe, expect, it } from 'vitest'
import { sumJourneyStructuralPlannedMinutes } from '../modules/operational-journey/operational-journey.service.js'

describe('sumJourneyStructuralPlannedMinutes', () => {
  it('usa plannedTotalMinutes quando existe, mesmo com plannedMinutes unitário', () => {
    const sum = sumJourneyStructuralPlannedMinutes([
      {
        plannedMinutes: 30,
        plannedQuantity: 1,
        plannedTotalMinutes: 120,
      },
    ])
    expect(sum).toBe(120)
  })

  it('sem plannedTotalMinutes, soma unitário × quantidade', () => {
    const sum = sumJourneyStructuralPlannedMinutes([
      { plannedMinutes: 30, plannedQuantity: 4, plannedTotalMinutes: null },
    ])
    expect(sum).toBe(120)
  })
})
