import { describe, expect, it } from 'vitest'
import {
  formatStandardJustificationText,
  resolveTimeEntryJustificationLines,
} from './timeEntryJustificationDisplay'

describe('resolveTimeEntryJustificationLines', () => {
  it('sem justificativas → lista vazia', () => {
    expect(resolveTimeEntryJustificationLines({})).toEqual([])
    expect(
      resolveTimeEntryJustificationLines({
        exceptionJustification: '  ',
        standardJustificationLabel: '',
      }),
    ).toEqual([])
  })

  it('exceção e fora de sequência aparecem como texto visível', () => {
    const lines = resolveTimeEntryJustificationLines({
      entryOrigin: 'UNASSIGNED_EXCEPTION',
      exceptionJustification: 'Substituição por ausência',
      isOutOfSequence: true,
      outOfSequenceJustification: 'Sequência liberada pelo gestor — ok',
      standardJustificationLabel: 'Substituição por ausência',
    })
    expect(lines.map((l) => l.kind)).toEqual(['exception', 'out_of_sequence'])
    expect(lines[0]!.text).toBe('Substituição por ausência')
    expect(lines[1]!.text).toBe('Sequência liberada pelo gestor — ok')
  })

  it('justificativa voluntária (catálogo) aparece quando não há contextual', () => {
    const lines = resolveTimeEntryJustificationLines({
      entryOrigin: 'ASSIGNED',
      standardJustificationLabel: 'Retrabalho autorizado',
      standardJustificationComplement: 'Cliente pediu ajuste',
    })
    expect(lines).toEqual([
      {
        kind: 'standard',
        label: 'Justificativa',
        text: 'Retrabalho autorizado — Cliente pediu ajuste',
      },
    ])
  })

  it('formatStandardJustificationText sem complemento usa só o rótulo', () => {
    expect(formatStandardJustificationText('Retrabalho', null)).toBe('Retrabalho')
    expect(formatStandardJustificationText(null, 'x')).toBeNull()
  })
})
