import { describe, expect, it } from 'vitest'
import { formatPlanningOutOfSequenceTooltip } from './planningOutOfSequence'

describe('formatPlanningOutOfSequenceTooltip', () => {
  it('uses singular copy for one predecessor', () => {
    expect(formatPlanningOutOfSequenceTooltip(1)).toBe(
      '1 atividade anterior não concluída nesta esteira.',
    )
  })

  it('uses plural copy for multiple predecessors', () => {
    expect(formatPlanningOutOfSequenceTooltip(2)).toBe(
      '2 atividades anteriores não concluídas nesta esteira.',
    )
  })

  it('falls back when count is zero', () => {
    expect(formatPlanningOutOfSequenceTooltip(0)).toContain('fora da sequência')
  })
})
