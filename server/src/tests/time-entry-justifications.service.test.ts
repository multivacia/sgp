import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-settings/time-entry-justifications.repository.js'
import {
  serviceCreateTimeEntryJustification,
  serviceListActiveTimeEntryJustificationsForSelection,
  serviceSetTimeEntryJustificationActive,
  serviceUpdateTimeEntryJustification,
} from '../modules/operational-settings/time-entry-justifications.service.js'
import {
  pickStandardJustificationSnapshot,
  resolveTimeEntryJustification,
} from '../shared/timeEntryJustificationResolver.js'

describe('time entry justifications service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bloqueia duplicidade por rótulo normalizado', async () => {
    vi.spyOn(repo, 'findByNormalizedLabel').mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      label: 'Substituição',
      description: null,
      category: 'SUBSTITUTION',
      requires_complement: false,
      usage_scope: null,
      is_active: true,
      sort_order: 10,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await expect(
      serviceCreateTimeEntryJustification({} as pg.Pool, {
        label: 'Substituição',
      }),
    ).rejects.toMatchObject<AppError>({
      statusCode: 409,
      code: ErrorCodes.CONFLICT,
    })
  })

  it('listagem ativa para seleção retorna apenas ativos', async () => {
    const listSpy = vi.spyOn(repo, 'listTimeEntryJustifications').mockResolvedValue([])
    await serviceListActiveTimeEntryJustificationsForSelection({} as pg.Pool)
    expect(listSpy).toHaveBeenCalledWith(expect.anything(), { status: 'active' })
  })

  it('ativa e desativa justificativa', async () => {
    vi.spyOn(repo, 'findTimeEntryJustificationById').mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      label: 'Teste',
      description: null,
      category: 'OTHER',
      requires_complement: false,
      usage_scope: null,
      is_active: true,
      sort_order: 10,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const updateSpy = vi.spyOn(repo, 'updateTimeEntryJustification').mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      label: 'Teste',
      description: null,
      category: 'OTHER',
      requires_complement: false,
      usage_scope: null,
      is_active: false,
      sort_order: 10,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const out = await serviceSetTimeEntryJustificationActive(
      {} as pg.Pool,
      '11111111-1111-1111-1111-111111111111',
      false,
    )
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      '11111111-1111-1111-1111-111111111111',
      { isActive: false },
    )
    expect(out.is_active).toBe(false)
  })

  it('update retorna 404 quando não encontrada', async () => {
    vi.spyOn(repo, 'findTimeEntryJustificationById').mockResolvedValue(null)
    await expect(
      serviceUpdateTimeEntryJustification({} as pg.Pool, 'missing', { label: 'X' }),
    ).rejects.toMatchObject<AppError>({
      statusCode: 404,
      code: ErrorCodes.NOT_FOUND,
    })
  })
})

describe('timeEntryJustificationResolver', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolve justificationId com snapshot e texto legado', async () => {
    vi.spyOn(repo, 'findActiveTimeEntryJustificationById').mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      label: 'Sequência liberada pelo gestor',
      description: null,
      category: 'SEQUENCE',
      requires_complement: false,
      usage_scope: null,
      is_active: true,
      sort_order: 40,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const out = await resolveTimeEntryJustification({} as pg.Pool, {
      required: true,
      justificationId: '22222222-2222-2222-2222-222222222222',
    })
    expect(out.legacyText).toBe('Sequência liberada pelo gestor')
    expect(out.standard?.standardJustificationLabelSnapshot).toBe(
      'Sequência liberada pelo gestor',
    )
  })

  it('monta texto legado com complemento', async () => {
    vi.spyOn(repo, 'findActiveTimeEntryJustificationById').mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      label: 'Outro motivo autorizado',
      description: null,
      category: 'OTHER',
      requires_complement: true,
      usage_scope: null,
      is_active: true,
      sort_order: 90,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const out = await resolveTimeEntryJustification({} as pg.Pool, {
      required: true,
      justificationId: '33333333-3333-3333-3333-333333333333',
      justificationComplement: 'detalhe operacional',
    })
    expect(out.legacyText).toBe('Outro motivo autorizado — detalhe operacional')
  })

  it('rejeita justificativa inativa ou inexistente', async () => {
    vi.spyOn(repo, 'findActiveTimeEntryJustificationById').mockResolvedValue(null)
    await expect(
      resolveTimeEntryJustification({} as pg.Pool, {
        required: true,
        justificationId: '44444444-4444-4444-4444-444444444444',
      }),
    ).rejects.toMatchObject<AppError>({
      statusCode: 422,
      code: ErrorCodes.VALIDATION_ERROR,
    })
  })

  it('exige complemento quando configurado', async () => {
    vi.spyOn(repo, 'findActiveTimeEntryJustificationById').mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      label: 'Outro motivo autorizado',
      description: null,
      category: 'OTHER',
      requires_complement: true,
      usage_scope: null,
      is_active: true,
      sort_order: 90,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await expect(
      resolveTimeEntryJustification({} as pg.Pool, {
        required: true,
        justificationId: '33333333-3333-3333-3333-333333333333',
      }),
    ).rejects.toMatchObject<AppError>({
      statusCode: 422,
      message: 'Esta justificativa exige complemento.',
    })
  })

  it('mantém compatibilidade com texto livre legado', async () => {
    const out = await resolveTimeEntryJustification({} as pg.Pool, {
      required: true,
      legacyText: 'Motivo manual legado',
    })
    expect(out.legacyText).toBe('Motivo manual legado')
    expect(out.standard).toBeNull()
  })

  it('prioriza snapshot da exceção sobre fora de sequência', () => {
    const fields = pickStandardJustificationSnapshot(
      {
        legacyText: 'Exceção',
        standardJustificationId: 'a',
        standardJustificationLabelSnapshot: 'Exceção',
        standardJustificationCategorySnapshot: 'SUBSTITUTION',
        standardJustificationComplement: null,
      },
      {
        legacyText: 'Sequência',
        standardJustificationId: 'b',
        standardJustificationLabelSnapshot: 'Sequência',
        standardJustificationCategorySnapshot: 'SEQUENCE',
        standardJustificationComplement: null,
      },
    )
    expect(fields.standard_justification_id).toBe('a')
    expect(fields.standard_justification_label_snapshot).toBe('Exceção')
  })
})
