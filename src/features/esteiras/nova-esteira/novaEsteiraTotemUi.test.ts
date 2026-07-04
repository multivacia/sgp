import { describe, expect, it } from 'vitest'
import {
  formatTotalPlannedMinutesDisplay,
  sumPlannedMinutesInManualRoots,
} from './novaEsteiraTotemUi'
import type { ManualOptionDraft } from './matrixToConveyorCreateInput'

function sampleRoots(
  steps: Array<{ plannedMinutes: number; plannedQuantity?: number }>,
): ManualOptionDraft[] {
  return [
    {
      key: 'op-1',
      titulo: 'Tarefa',
      areas: [
        {
          key: 'ar-1',
          titulo: 'Setor',
          steps: steps.map((st, i) => ({
            key: `st-${i}`,
            titulo: `Atividade ${i + 1}`,
            plannedMinutes: st.plannedMinutes,
            plannedQuantity: st.plannedQuantity,
          })),
        },
      ],
    },
  ]
}

describe('novaEsteiraTotemUi planned total', () => {
  it('sem estrutura exibe 0 min e hint', () => {
    expect(formatTotalPlannedMinutesDisplay([])).toEqual({
      text: '0 min',
      hint: 'Calculado após definir a estrutura',
    })
  })

  it('soma unitário × quantidade como no backend', () => {
    const roots = sampleRoots([
      { plannedMinutes: 30, plannedQuantity: 1 },
      { plannedMinutes: 15, plannedQuantity: 2 },
    ])
    expect(sumPlannedMinutesInManualRoots(roots)).toBe(60)
    expect(formatTotalPlannedMinutesDisplay(roots)).toEqual({
      text: '60 min',
      hint: null,
    })
  })
})
