import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as authRepo from '../modules/auth/auth.repository.js'
import * as repo from '../modules/my-activities/extra-time-entries.repository.js'
import {
  serviceCreateMyExtraTimeEntry,
  serviceListExtraTimeEntryDescriptionOptions,
  serviceListMyRecentExtraTimeEntries,
} from '../modules/my-activities/extra-time-entries.service.js'

describe('extra-time-entries service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('usuário sem colaborador retorna tratamento esperado na listagem', async () => {
    vi.spyOn(authRepo, 'findCollaboratorIdByAppUserId').mockResolvedValue(null)
    const out = await serviceListMyRecentExtraTimeEntries({} as pg.Pool, {
      userId: 'u1',
      limit: 10,
    })
    expect(out.items).toEqual([])
    expect(out.unavailableReason).toContain('colaborador')
  })

  it('descrição inativa/deletada bloqueada no POST', async () => {
    vi.spyOn(authRepo, 'findCollaboratorIdByAppUserId').mockResolvedValue('c1')
    vi.spyOn(repo, 'descriptionExistsActive').mockResolvedValue(false)
    await expect(
      serviceCreateMyExtraTimeEntry({} as pg.Pool, {
        userId: 'u1',
        body: {
          descriptionId: '11111111-1111-1111-1111-111111111111',
          minutes: 20,
        },
      }),
    ).rejects.toMatchObject<AppError>({
      statusCode: 422,
      code: ErrorCodes.VALIDATION_ERROR,
    })
  })

  it('criação válida persiste apontamento', async () => {
    vi.spyOn(authRepo, 'findCollaboratorIdByAppUserId').mockResolvedValue('c1')
    vi.spyOn(repo, 'descriptionExistsActive').mockResolvedValue(true)
    const insertSpy = vi.spyOn(repo, 'insertExtraTimeEntry').mockResolvedValue({
      id: 'e1',
      collaborator_id: 'c1',
      created_by_user_id: 'u1',
      description_id: 'd1',
      description: 'Ajuste',
      entry_date: '2026-05-05',
      minutes: 30,
      notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    })
    const out = await serviceCreateMyExtraTimeEntry({} as pg.Pool, {
      userId: 'u1',
      body: {
        descriptionId: '11111111-1111-1111-1111-111111111111',
        minutes: 30,
      },
    })
    expect(out.minutes).toBe(30)
    expect(insertSpy).toHaveBeenCalled()
  })

  it('listagem recente retorna somente do colaborador resolvido', async () => {
    vi.spyOn(authRepo, 'findCollaboratorIdByAppUserId').mockResolvedValue('c1')
    const listSpy = vi.spyOn(repo, 'listRecentExtraTimeEntries').mockResolvedValue([])
    await serviceListMyRecentExtraTimeEntries({} as pg.Pool, {
      userId: 'u1',
      limit: 10,
    })
    expect(listSpy).toHaveBeenCalledWith(expect.anything(), {
      collaboratorId: 'c1',
      limit: 10,
    })
  })

  it('descrições ativas retornam ordenadas (delegação repository)', async () => {
    const listSpy = vi
      .spyOn(repo, 'listActiveExtraTimeEntryDescriptions')
      .mockResolvedValue([])
    await serviceListExtraTimeEntryDescriptionOptions({} as pg.Pool)
    expect(listSpy).toHaveBeenCalled()
  })
})
