import { describe, expect, it, vi, beforeEach } from 'vitest'
import type pg from 'pg'
import {
  resolveDailyCapacityMinutes,
  serviceResolveCollaboratorDailyCapacity,
} from '../modules/operational-settings/operational-settings.service.js'

const repoMocks = vi.hoisted(() => ({
  resolveCollaboratorDailyCapacityMinutes: vi.fn(),
}))

vi.mock('../modules/operational-settings/operational-settings.repository.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/operational-settings/operational-settings.repository.js')
  >('../modules/operational-settings/operational-settings.repository.js')
  return {
    ...actual,
    resolveCollaboratorDailyCapacityMinutes: repoMocks.resolveCollaboratorDailyCapacityMinutes,
  }
})

describe('operational capacity service', () => {
  beforeEach(() => {
    repoMocks.resolveCollaboratorDailyCapacityMinutes.mockReset()
  })

  it('resolveDailyCapacityMinutes usa fallback 480 sem settings/override', () => {
    expect(
      resolveDailyCapacityMinutes({
        defaultDailyMinutes: null,
        overrideDailyMinutes: null,
      }),
    ).toBe(480)
  })

  it('resolveDailyCapacityMinutes usa default quando não há override', () => {
    expect(
      resolveDailyCapacityMinutes({
        defaultDailyMinutes: 420,
        overrideDailyMinutes: null,
      }),
    ).toBe(420)
  })

  it('resolveDailyCapacityMinutes usa override quando ativo', () => {
    expect(
      resolveDailyCapacityMinutes({
        defaultDailyMinutes: 480,
        overrideDailyMinutes: 360,
      }),
    ).toBe(360)
  })

  it('resolveDailyCapacityMinutes rejeita default inválido explícito', () => {
    expect(() =>
      resolveDailyCapacityMinutes({
        defaultDailyMinutes: 0,
        overrideDailyMinutes: null,
      }),
    ).toThrow()
  })

  it('resolveDailyCapacityMinutes rejeita override inválido explícito', () => {
    expect(() =>
      resolveDailyCapacityMinutes({
        defaultDailyMinutes: 480,
        overrideDailyMinutes: 1500,
      }),
    ).toThrow()
  })

  it('serviceResolveCollaboratorDailyCapacity aplica source=default', async () => {
    repoMocks.resolveCollaboratorDailyCapacityMinutes.mockResolvedValue({
      defaultDailyMinutes: 480,
      overrideDailyMinutes: null,
      source: 'default',
    })
    const out = await serviceResolveCollaboratorDailyCapacity(
      {} as pg.Pool,
      '11111111-1111-1111-1111-111111111111',
      '2026-04-28',
    )
    expect(out.resolvedDailyMinutes).toBe(480)
    expect(out.source).toBe('default')
  })

  it('serviceResolveCollaboratorDailyCapacity aplica source=override', async () => {
    repoMocks.resolveCollaboratorDailyCapacityMinutes.mockResolvedValue({
      defaultDailyMinutes: 480,
      overrideDailyMinutes: 300,
      source: 'override',
    })
    const out = await serviceResolveCollaboratorDailyCapacity(
      {} as pg.Pool,
      '11111111-1111-1111-1111-111111111111',
      '2026-04-28',
    )
    expect(out.resolvedDailyMinutes).toBe(300)
    expect(out.source).toBe('override')
  })

  it('serviceResolveCollaboratorDailyCapacity aplica source=fallback', async () => {
    repoMocks.resolveCollaboratorDailyCapacityMinutes.mockResolvedValue({
      defaultDailyMinutes: null,
      overrideDailyMinutes: null,
      source: 'fallback',
    })
    const out = await serviceResolveCollaboratorDailyCapacity(
      {} as pg.Pool,
      '11111111-1111-1111-1111-111111111111',
      '2026-04-28',
    )
    expect(out.resolvedDailyMinutes).toBe(480)
    expect(out.source).toBe('fallback')
  })
})

