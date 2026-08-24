import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-settings/step-abort-reasons.repository.js'
import {
  serviceCreateStepAbortReason,
  serviceListActiveStepAbortReasonsForSelection,
  serviceSetStepAbortReasonActive,
  serviceUpdateStepAbortReason,
} from '../modules/operational-settings/step-abort-reasons.service.js'

describe('step abort reasons service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bloqueia código duplicado', async () => {
    vi.spyOn(repo, 'findStepAbortReasonByCode').mockResolvedValue({
      code: 'OUTRO',
      label: 'Outro',
      description: null,
      requires_complement: true,
      sort_order: 50,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await expect(
      serviceCreateStepAbortReason({} as pg.Pool, {
        code: 'OUTRO',
        label: 'Outro',
      }),
    ).rejects.toMatchObject<AppError>({
      statusCode: 409,
      code: ErrorCodes.CONFLICT,
    })
  })

  it('listagem ativa para seleção retorna apenas ativos', async () => {
    const listSpy = vi
      .spyOn(repo, 'listActiveStepAbortReasonsForSelection')
      .mockResolvedValue([])
    await serviceListActiveStepAbortReasonsForSelection({} as pg.Pool)
    expect(listSpy).toHaveBeenCalled()
  })

  it('não permite alterar code via update (só label/ordem/etc)', async () => {
    vi.spyOn(repo, 'findStepAbortReasonByCode').mockResolvedValue({
      code: 'CUSTOM',
      label: 'Antigo',
      description: null,
      requires_complement: false,
      sort_order: 10,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const updateSpy = vi.spyOn(repo, 'updateStepAbortReason').mockResolvedValue({
      code: 'CUSTOM',
      label: 'Novo',
      description: null,
      requires_complement: false,
      sort_order: 20,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const out = await serviceUpdateStepAbortReason({} as pg.Pool, 'CUSTOM', {
      label: 'Novo',
      sortOrder: 20,
    })
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      'CUSTOM',
      expect.objectContaining({ label: 'Novo', sortOrder: 20 }),
    )
    expect(out.code).toBe('CUSTOM')
  })

  it('ativa e desativa motivo', async () => {
    vi.spyOn(repo, 'findStepAbortReasonByCode').mockResolvedValue({
      code: 'CUSTOM',
      label: 'Custom',
      description: null,
      requires_complement: false,
      sort_order: 10,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const updateSpy = vi.spyOn(repo, 'updateStepAbortReason').mockResolvedValue({
      code: 'CUSTOM',
      label: 'Custom',
      description: null,
      requires_complement: false,
      sort_order: 10,
      is_active: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const out = await serviceSetStepAbortReasonActive({} as pg.Pool, 'CUSTOM', false)
    expect(updateSpy).toHaveBeenCalledWith(expect.anything(), 'CUSTOM', { isActive: false })
    expect(out.is_active).toBe(false)
  })

  it('update retorna 404 quando não encontrado', async () => {
    vi.spyOn(repo, 'findStepAbortReasonByCode').mockResolvedValue(null)
    await expect(
      serviceUpdateStepAbortReason({} as pg.Pool, 'MISSING', { label: 'X' }),
    ).rejects.toMatchObject<AppError>({
      statusCode: 404,
      code: ErrorCodes.NOT_FOUND,
    })
  })

  it('violação UNIQUE 23505 concorrente → 409', async () => {
    vi.spyOn(repo, 'findStepAbortReasonByCode').mockResolvedValue(null)
    const err = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    })
    vi.spyOn(repo, 'insertStepAbortReason').mockRejectedValue(err)
    await expect(
      serviceCreateStepAbortReason({} as pg.Pool, {
        code: 'RACE_CODE',
        label: 'Race',
      }),
    ).rejects.toMatchObject<AppError>({
      statusCode: 409,
      code: ErrorCodes.CONFLICT,
      message: 'Já existe um motivo de dispensa com este código.',
    })
  })

  it('erro de banco diferente de 23505 não é mascarado como 409', async () => {
    vi.spyOn(repo, 'findStepAbortReasonByCode').mockResolvedValue(null)
    const err = Object.assign(new Error('connection failure'), { code: '08006' })
    vi.spyOn(repo, 'insertStepAbortReason').mockRejectedValue(err)
    await expect(
      serviceCreateStepAbortReason({} as pg.Pool, {
        code: 'CONN_FAIL',
        label: 'X',
      }),
    ).rejects.toMatchObject({ code: '08006' })
  })
})
