import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-settings/extra-time-entry-descriptions.repository.js'
import {
  serviceCreateExtraTimeEntryDescription,
  serviceDeleteExtraTimeEntryDescription,
  serviceListExtraTimeEntryDescriptions,
  serviceUpdateExtraTimeEntryDescription,
} from '../modules/operational-settings/extra-time-entry-descriptions.service.js'

describe('extra time entry descriptions service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bloqueia duplicidade por descrição normalizada', async () => {
    vi.spyOn(repo, 'findByNormalizedDescription').mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      description: 'Ajuste',
      normalized_description: 'ajuste',
      internal_note: null,
      sort_order: 100,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    })
    await expect(
      serviceCreateExtraTimeEntryDescription({} as pg.Pool, {
        description: 'Ajuste',
      }),
    ).rejects.toMatchObject<AppError>({
      statusCode: 409,
      code: ErrorCodes.CONFLICT,
    })
  })

  it('listagem usa filtros de status e busca q', async () => {
    const listSpy = vi
      .spyOn(repo, 'listExtraTimeEntryDescriptions')
      .mockResolvedValue([])
    await serviceListExtraTimeEntryDescriptions({} as pg.Pool, {
      status: 'inactive',
      q: 'ajuste',
    })
    expect(listSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'inactive', q: 'ajuste' }),
    )
  })

  it('update aplica atualização e mantém validação de duplicidade', async () => {
    vi.spyOn(repo, 'findExtraTimeEntryDescriptionById').mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      description: 'Parada técnica',
      normalized_description: 'parada tecnica',
      internal_note: null,
      sort_order: 100,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    })
    vi.spyOn(repo, 'findByNormalizedDescription').mockResolvedValue(null)
    const updateSpy = vi.spyOn(repo, 'updateExtraTimeEntryDescription').mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      description: 'Parada técnica geral',
      normalized_description: 'parada tecnica geral',
      internal_note: 'obs',
      sort_order: 5,
      is_active: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    })

    const out = await serviceUpdateExtraTimeEntryDescription({} as pg.Pool, 'id', {
      description: 'Parada técnica geral',
      sortOrder: 5,
      isActive: false,
      internalNote: 'obs',
    })

    expect(out.sort_order).toBe(5)
    expect(updateSpy).toHaveBeenCalled()
  })

  it('delete realiza soft delete', async () => {
    vi.spyOn(repo, 'findExtraTimeEntryDescriptionById').mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      description: 'Parada técnica',
      normalized_description: 'parada tecnica',
      internal_note: null,
      sort_order: 100,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    })
    const softDeleteSpy = vi
      .spyOn(repo, 'softDeleteExtraTimeEntryDescription')
      .mockResolvedValue(true)
    await serviceDeleteExtraTimeEntryDescription({} as pg.Pool, 'id')
    expect(softDeleteSpy).toHaveBeenCalledWith(expect.anything(), 'id')
  })
})
