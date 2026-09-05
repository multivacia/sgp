import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type { ProductionCreateExtraTimeEntryBody } from './production-extra-time-entries.schemas.js'
import {
  descriptionExistsActive,
  insertProductionExtraTimeEntry,
  listActiveDescriptions,
  listRecentByCollaborator,
  type ExtraTimeEntryDescriptionOptionRow,
  type ExtraTimeEntryWithDescriptionRow,
  type ProductionExtraTimeEntryRow,
} from './production-extra-time-entries.repository.js'

export async function serviceListProductionExtraTimeEntryDescriptions(
  pool: pg.Pool,
): Promise<ExtraTimeEntryDescriptionOptionRow[]> {
  return listActiveDescriptions(pool)
}

export async function serviceListProductionRecentExtraTimeEntries(
  pool: pg.Pool,
  input: { collaboratorId: string; limit: number },
): Promise<ExtraTimeEntryWithDescriptionRow[]> {
  return listRecentByCollaborator(pool, {
    collaboratorId: input.collaboratorId,
    limit: input.limit,
  })
}

export async function serviceCreateProductionExtraTimeEntry(
  pool: pg.Pool,
  input: { collaboratorId: string; body: ProductionCreateExtraTimeEntryBody },
): Promise<ProductionExtraTimeEntryRow> {
  const activeDescription = await descriptionExistsActive(pool, input.body.descriptionId)
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
