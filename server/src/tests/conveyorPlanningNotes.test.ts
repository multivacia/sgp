import { describe, expect, it } from 'vitest'
import { stripConveyorPlanningTempoFromNotes } from '../shared/conveyorPlanningNotes.js'

describe('stripConveyorPlanningTempoFromNotes', () => {
  it('remove linha legada de tempo manual', () => {
    const raw = 'Pedido urgente\n\n[Planeamento] Tempo total previsto: 999 min'
    expect(stripConveyorPlanningTempoFromNotes(raw)).toBe('Pedido urgente')
  })

  it('retorna vazio quando só havia linha de planeamento', () => {
    expect(
      stripConveyorPlanningTempoFromNotes('[Planeamento] Tempo total previsto: 120 min'),
    ).toBe('')
  })
})
