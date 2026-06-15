import { describe, expect, it } from 'vitest'
import {
  computeConveyorProgressMetrics,
  formatConveyorProgressDuration,
  formatExceededLabel,
} from './conveyorProgressMetrics'

describe('conveyorProgressMetrics', () => {
  it('calcula faltante', () => {
    expect(computeConveyorProgressMetrics(90, 60).remainingMinutes).toBe(30)
  })

  it('calcula excedente', () => {
    expect(computeConveyorProgressMetrics(60, 80).exceededMinutes).toBe(20)
    expect(computeConveyorProgressMetrics(60, 80).remainingMinutes).toBe(0)
  })

  it('calcula percentual', () => {
    expect(computeConveyorProgressMetrics(200, 50).progressPercent).toBe(25)
  })

  it('formatConveyorProgressDuration', () => {
    expect(formatConveyorProgressDuration(90)).toBe('01h30')
    expect(formatConveyorProgressDuration(495)).toBe('08h15')
    expect(formatConveyorProgressDuration(45)).toBe('0h45')
  })

  it('formatExceededLabel', () => {
    expect(formatExceededLabel(80)).toBe('+ 01h20 acima')
    expect(formatExceededLabel(0)).toBeNull()
  })
})
