import type pg from 'pg'
import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type { CreateExtraTimeEntryBody } from './extra-time-entries.schemas.js'
import {
  descriptionExistsActive,
  insertExtraTimeEntry,
  listActiveExtraTimeEntryDescriptions,
  listRecentExtraTimeEntries,
  type ExtraTimeEntryDescriptionOptionRow,
  type ExtraTimeEntryWithDescriptionRow,
} from './extra-time-entries.repository.js'
import { resolveExtraEntryDate } from '../../shared/operationalWorkDate.js'

const UNAVAILABLE_REASON =
  'Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso.'

export async function serviceListExtraTimeEntryDescriptionOptions(
  pool: pg.Pool,
): Promise<ExtraTimeEntryDescriptionOptionRow[]> {
  return listActiveExtraTimeEntryDescriptions(pool)
}

export async function serviceListMyRecentExtraTimeEntries(
  pool: pg.Pool,
  input: { userId: string; limit: number },
): Promise<{
  items: ExtraTimeEntryWithDescriptionRow[]
  collaboratorId: string | null
  unavailableReason: string | null
}> {
  const collaboratorId = await findCollaboratorIdByAppUserId(pool, input.userId)
  if (!collaboratorId) {
    return {
      items: [],
      collaboratorId: null,
      unavailableReason: UNAVAILABLE_REASON,
    }
  }
  const items = await listRecentExtraTimeEntries(pool, {
    collaboratorId,
    limit: input.limit,
  })
  return {
    items,
    collaboratorId,
    unavailableReason: null,
  }
}

export async function serviceCreateMyExtraTimeEntry(
  pool: pg.Pool,
  input: { userId: string; body: CreateExtraTimeEntryBody },
): Promise<ExtraTimeEntryWithDescriptionRow> {
  const collaboratorId = await findCollaboratorIdByAppUserId(pool, input.userId)
  if (!collaboratorId) {
    throw new AppError(UNAVAILABLE_REASON, 422, ErrorCodes.VALIDATION_ERROR)
  }
  const activeDescription = await descriptionExistsActive(
    pool,
    input.body.descriptionId,
  )
  if (!activeDescription) {
    throw new AppError(
      'Descrição inexistente, inativa ou removida.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return insertExtraTimeEntry(pool, {
    collaboratorId,
    createdByUserId: input.userId,
    descriptionId: input.body.descriptionId,
    entryDate: resolveExtraEntryDate(input.body.entryDate),
    minutes: input.body.minutes,
    notes: input.body.notes?.trim() || null,
  })
}
