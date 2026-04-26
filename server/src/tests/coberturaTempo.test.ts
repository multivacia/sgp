import { describe, expect, it } from 'vitest'
import { computeCoberturaTempo } from '../shared/coberturaTempo.js'

describe('computeCoberturaTempo', () => {
  it('previsto ≤ 0 → ratio null', () => {
    expect(computeCoberturaTempo(10, 0).ratio).toBeNull()
    expect(computeCoberturaTempo(10, -5).ratio).toBeNull()
  })

  it('previsto > 0 → realizado / previsto', () => {
    expect(computeCoberturaTempo(50, 100).ratio).toBe(0.5)
    expect(computeCoberturaTempo(120, 100).ratio).toBe(1.2)
  })

  it('realizado 0 e previsto > 0 → 0', () => {
    expect(computeCoberturaTempo(0, 60).ratio).toBe(0)
  })
})
