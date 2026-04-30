import { describe, expect, it } from 'vitest'
import { calculateConveyorDelayState } from '../modules/conveyors/operational-events/conveyor-delay-state.js'

describe('calculateConveyorDelayState', () => {
  const now = new Date('2026-04-28T10:00:00.000Z')

  it('sem deadline -> NO_DEADLINE', () => {
    const out = calculateConveyorDelayState({
      operationalStatus: 'EM_PRODUCAO',
      estimatedDeadline: null,
      pendingMinutes: 10,
      now,
    })
    expect(out).toMatchObject({ isDelayed: false, reason: 'NO_DEADLINE' })
  })

  it('deadline inválido -> INVALID_DEADLINE', () => {
    const out = calculateConveyorDelayState({
      operationalStatus: 'EM_PRODUCAO',
      estimatedDeadline: 'not-a-date',
      pendingMinutes: 10,
      now,
    })
    expect(out).toMatchObject({ isDelayed: false, reason: 'INVALID_DEADLINE' })
  })

  it('concluída -> COMPLETED', () => {
    const out = calculateConveyorDelayState({
      operationalStatus: 'concluidas',
      estimatedDeadline: '2026-04-27T10:00:00.000Z',
      pendingMinutes: 10,
      now,
    })
    expect(out).toMatchObject({ isDelayed: false, reason: 'COMPLETED' })
  })

  it('pending 0 -> NO_PENDING_WORK', () => {
    const out = calculateConveyorDelayState({
      operationalStatus: 'EM_PRODUCAO',
      estimatedDeadline: '2026-04-27T10:00:00.000Z',
      pendingMinutes: 0,
      now,
    })
    expect(out).toMatchObject({ isDelayed: false, reason: 'NO_PENDING_WORK' })
  })

  it('deadline futuro -> ON_TIME', () => {
    const out = calculateConveyorDelayState({
      operationalStatus: 'EM_PRODUCAO',
      estimatedDeadline: '2026-04-29T10:00:00.000Z',
      pendingMinutes: 10,
      now,
    })
    expect(out).toMatchObject({ isDelayed: false, reason: 'ON_TIME' })
  })

  it('deadline passado + pendência > 0 -> atraso', () => {
    const out = calculateConveyorDelayState({
      operationalStatus: 'EM_PRODUCAO',
      estimatedDeadline: '2026-04-27T10:00:00.000Z',
      pendingMinutes: 10,
      now,
    })
    expect(out).toMatchObject({
      isDelayed: true,
      reason: 'DEADLINE_EXCEEDED_WITH_PENDING_WORK',
    })
  })
})

