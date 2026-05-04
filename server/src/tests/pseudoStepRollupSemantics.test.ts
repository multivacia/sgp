import { describe, expect, it } from 'vitest'

/**
 * R6 S9.4.4 — documenta o efeito de uma pseudo-etapa STEP com minutos = rollup da TASK
 * quando coexistem atividades “folha” reais. O backend soma `planned_minutes` em todo STEP.
 */

function sumStepMinutes(steps: readonly { plannedMinutes: number }[]): number {
  return steps.reduce((s, st) => s + Math.max(0, st.plannedMinutes), 0)
}

describe('pseudoStepRollupSemantics', () => {
  const task16Leaves = [
    { title: 'Desmontar volante', plannedMinutes: 100 },
    { title: 'Instalar volante', plannedMinutes: 150 },
  ]
  const expectedTaskTotal = 250

  it('total esperado = soma apenas das atividades reais (folhas)', () => {
    expect(sumStepMinutes(task16Leaves)).toBe(expectedTaskTotal)
  })

  it('pseudo-etapa com mesmo título da TASK + mesmo total que as folhas duplica minutos planejados', () => {
    const withRollupStep = [
      { title: '16 - VOLANTE', plannedMinutes: 250 },
      ...task16Leaves,
    ]
    expect(sumStepMinutes(withRollupStep)).toBe(500)
    expect(sumStepMinutes(withRollupStep)).toBe(2 * expectedTaskTotal)
  })

  it('alinhado ao critério: sem ACTIVITY/STEP duplicando o rótulo da TASK com minutos de rollup', () => {
    expect(sumStepMinutes(task16Leaves)).toBe(expectedTaskTotal)
  })
})
