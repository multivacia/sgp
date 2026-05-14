import { describe, expect, it } from 'vitest'
import { clampWarningToTimeout } from './system-settings.service.js'

describe('getSessionIdleWarningMinutes fallback', () => {
  it('ajusta warning efetivo quando timeout é menor ou igual a 5', () => {
    expect(clampWarningToTimeout(5, 5)).toBe(4)
    expect(clampWarningToTimeout(5, 4)).toBe(3)
  })
})
