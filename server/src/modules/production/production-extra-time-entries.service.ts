import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type { CreateProductionExtraTimeEntryBody } from './production-extra-time-entries.schemas.js'
import {
  descriptionExistsActive,
  insertProductionExtraTimeEntry,
  listActiveExtraTimeEntryDescriptions,
  listRecentExtraTimeEntries,
  type ExtraTimeEntryDescriptionOptionRow,
  type ExtraTimeEntryWithDescriptionRow,
} from './production-extra-time-entries.repository.js'

export async function serviceListProductionExtraTimeEntryDescriptionOptions(
  pool: pg.Pool,
): Promise<ExtraTimeEntryDescriptionOptionRow[]> {
  return listActiveExtraTimeEntryDescriptions(pool)
}

export async function serviceListProductionExtraTimeEntries(
  pool: pg.Pool,
  input: { collaboratorId: string; limit: number },
): Promise<ExtraTimeEntryWithDescriptionRow[]> {
  return listRecentExtraTimeEntries(pool, {
    collaboratorId: input.collaboratorId,
    limit: input.limit,
  })
}

export async function serviceCreateProductionExtraTimeEntry(
  pool: pg.Pool,
  input: { collaboratorId: string; body: CreateProductionExtraTimeEntryBody },
): Promise<ExtraTimeEntryWithDescriptionRow> {
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
  return insertProductionExtraTimeEntry(pool, {
    collaboratorId: input.collaboratorId,
    descriptionId: input.body.descriptionId,
    entryDate: input.body.entryDate,
    minutes: input.body.minutes,
    notes: input.body.notes?.trim() || null,
  })
}
