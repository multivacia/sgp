import { describe, expect, it, vi, afterEach } from 'vitest'
import type pg from 'pg'
import * as repo from '../modules/operational-settings/operational-settings.repository.js'
import {
  serviceUpsertCollaboratorCapacityOverride,
  serviceUpsertOperationalCapacitySettings,
} from '../modules/operational-settings/operational-settings.service.js'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'

describe('operational-settings capacity writes (erros mapeados)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('PUT padrão global — armazenamento ausente → 503 SERVICE_UNAVAILABLE', async () => {
    vi.spyOn(repo, 'upsertOperationalCapacitySettings').mockRejectedValue(
      new Error('OPERATIONAL_CAPACITY_STORAGE_UNAVAILABLE'),
    )
    try {
      await serviceUpsertOperationalCapacitySettings({} as pg.Pool, 480, null)
      expect.fail('deveria lançar')
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      const err = e as AppError
      expect(err.statusCode).toBe(503)
      expect(err.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE)
    }
  })

  it('PUT override — FK colaborador → 404', async () => {
    vi.spyOn(repo, 'upsertCollaboratorCapacityOverride').mockRejectedValue({ code: '23503' })
    try {
      await serviceUpsertCollaboratorCapacityOverride({} as pg.Pool, {
        collaboratorId: '22222222-2222-2222-2222-222222222222',
        dailyMinutes: 400,
        isActive: true,
        actorUserId: null,
      })
      expect.fail('deveria lançar')
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      const err = e as AppError
      expect(err.statusCode).toBe(404)
      expect(err.code).toBe(ErrorCodes.NOT_FOUND)
    }
  })
})
