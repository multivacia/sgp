import { describe, expect, it } from 'vitest'
import { computeConveyorProgressMetrics } from '../shared/conveyorProgressMetrics.js'

describe('computeConveyorProgressMetrics', () => {
  it('calcula faltante e percentual quando realizado < previsto', () => {
    const m = computeConveyorProgressMetrics(120, 90)
    expect(m.plannedMinutes).toBe(120)
    expect(m.realizedMinutes).toBe(90)
    expect(m.remainingMinutes).toBe(30)
    expect(m.exceededMinutes).toBe(0)
    expect(m.progressPercent).toBe(75)
  })

  it('zera faltante e calcula excedente quando realizado > previsto', () => {
    const m = computeConveyorProgressMetrics(100, 180)
    expect(m.remainingMinutes).toBe(0)
    expect(m.exceededMinutes).toBe(80)
    expect(m.progressPercent).toBe(180)
  })

  it('evita divisão por zero quando previsto = 0', () => {
    const m = computeConveyorProgressMetrics(0, 45)
    expect(m.progressPercent).toBe(0)
    expect(m.exceededMinutes).toBe(45)
    expect(m.remainingMinutes).toBe(0)
  })
})
