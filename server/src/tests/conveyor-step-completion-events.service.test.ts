import { beforeEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { detectAndRecordConveyorStepCompleted } from '../modules/conveyors/operational-events/conveyor-step-completion-events.service.js'

const repoMocks = vi.hoisted(() => ({
  getStepFacts: vi.fn(),
}))

const eventServiceMocks = vi.hoisted(() => ({
  createEvent: vi.fn(),
}))

vi.mock('../modules/conveyors/operational-events/conveyor-operational-events.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/operational-events/conveyor-operational-events.repository.js')
  >('../modules/conveyors/operational-events/conveyor-operational-events.repository.js')
  return {
    ...actual,
    getStepCompletionFacts: repoMocks.getStepFacts,
  }
})

vi.mock('../modules/conveyors/operational-events/conveyor-operational-events.service.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/conveyors/operational-events/conveyor-operational-events.service.js')
  >('../modules/conveyors/operational-events/conveyor-operational-events.service.js')
  return {
    ...actual,
    serviceCreateConveyorOperationalEvent: eventServiceMocks.createEvent,
  }
})

describe('detectAndRecordConveyorStepCompleted', () => {
  beforeEach(() => {
    repoMocks.getStepFacts.mockReset()
    eventServiceMocks.createEvent.mockReset()
  })

  it('step não concluído não cria evento', async () => {
    repoMocks.getStepFacts.mockResolvedValue({
      nodeType: 'STEP',
      plannedMinutes: 100,
      realizedMinutes: 90,
    })
    const out = await detectAndRecordConveyorStepCompleted({} as pg.Pool, {
      conveyorId: '11111111-1111-1111-1111-111111111111',
      stepNodeId: '22222222-2222-2222-2222-222222222222',
      source: 'USER_ACTION',
      occurredAt: new Date('2026-04-28T10:00:00.000Z'),
    })
    expect(out).toBeNull()
    expect(eventServiceMocks.createEvent).not.toHaveBeenCalled()
  })

  it('realized >= planned NÃO cria CONVEYOR_STEP_COMPLETED', async () => {
    repoMocks.getStepFacts.mockResolvedValue({
      nodeType: 'STEP',
      plannedMinutes: 100,
      realizedMinutes: 100,
    })
    const out = await detectAndRecordConveyorStepCompleted({} as pg.Pool, {
      conveyorId: '11111111-1111-1111-1111-111111111111',
      stepNodeId: '22222222-2222-2222-2222-222222222222',
      source: 'USER_ACTION',
      occurredAt: new Date('2026-04-28T10:00:00.000Z'),
    })
    expect(out).toBeNull()
    expect(eventServiceMocks.createEvent).not.toHaveBeenCalled()
  })

  it('chamada repetida continua sem duplicar (sem criação)', async () => {
    repoMocks.getStepFacts.mockResolvedValue({
      nodeType: 'STEP',
      plannedMinutes: 100,
      realizedMinutes: 110,
    })
    const outA = await detectAndRecordConveyorStepCompleted({} as pg.Pool, {
      conveyorId: '11111111-1111-1111-1111-111111111111',
      stepNodeId: '22222222-2222-2222-2222-222222222222',
      source: 'SYSTEM',
      occurredAt: new Date('2026-04-28T10:00:00.000Z'),
    })
    const outB = await detectAndRecordConveyorStepCompleted({} as pg.Pool, {
      conveyorId: '11111111-1111-1111-1111-111111111111',
      stepNodeId: '22222222-2222-2222-2222-222222222222',
      source: 'SYSTEM',
      occurredAt: new Date('2026-04-28T10:00:00.000Z'),
    })
    expect(outA).toBeNull()
    expect(outB).toBeNull()
    expect(eventServiceMocks.createEvent).not.toHaveBeenCalled()
  })

  it('erro real de banco propaga', async () => {
    repoMocks.getStepFacts.mockRejectedValue(new Error('db down'))
    await expect(
      detectAndRecordConveyorStepCompleted({} as pg.Pool, {
        conveyorId: '11111111-1111-1111-1111-111111111111',
        stepNodeId: '22222222-2222-2222-2222-222222222222',
        source: 'SYSTEM',
        occurredAt: new Date('2026-04-28T10:00:00.000Z'),
      }),
    ).rejects.toThrow('db down')
  })
})

