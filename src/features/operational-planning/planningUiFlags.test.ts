import { describe, expect, it } from 'vitest'
import {
  SHOW_PLANNING_PRINCIPAL_DEVIATIONS,
  SHOW_PLANNING_SECONDARY_TABS,
} from './planningUiFlags'

describe('planningUiFlags', () => {
  it('mantém abas secundárias ocultas (reativar com true)', () => {
    expect(SHOW_PLANNING_SECONDARY_TABS).toBe(false)
  })

  it('mantém Principais desvios oculto (reativar com true)', () => {
    expect(SHOW_PLANNING_PRINCIPAL_DEVIATIONS).toBe(false)
  })
})
