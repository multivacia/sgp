import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type {
  CreateExtraTimeEntryDescriptionBody,
  UpdateExtraTimeEntryDescriptionBody,
} from './extra-time-entry-descriptions.schemas.js'
import {
  findByNormalizedDescription,
  findExtraTimeEntryDescriptionById,
  insertExtraTimeEntryDescription,
  listExtraTimeEntryDescriptions,
  softDeleteExtraTimeEntryDescription,
  updateExtraTimeEntryDescription,
  type ExtraTimeEntryDescriptionRow,
} from './extra-time-entry-descriptions.repository.js'

function normalizeDescription(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export async function serviceListExtraTimeEntryDescriptions(
  pool: pg.Pool,
  input: { q?: string; status: 'active' | 'inactive' | 'all' },
): Promise<ExtraTimeEntryDescriptionRow[]> {
  return listExtraTimeEntryDescriptions(pool, input)
}

export async function serviceCreateExtraTimeEntryDescription(
  pool: pg.Pool,
  body: CreateExtraTimeEntryDescriptionBody,
): Promise<ExtraTimeEntryDescriptionRow> {
  const normalizedDescription = normalizeDescription(body.description)
  const duplicated = await findByNormalizedDescription(pool, normalizedDescription)
  if (duplicated) {
    throw new AppError(
      'Já existe uma descrição com este conteúdo.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
  return insertExtraTimeEntryDescription(pool, {
    description: body.description,
    normalizedDescription,
    internalNote: body.internalNote ?? null,
    sortOrder: body.sortOrder ?? 100,
    isActive: body.isActive ?? true,
  })
}

export async function serviceUpdateExtraTimeEntryDescription(
  pool: pg.Pool,
  id: string,
  body: UpdateExtraTimeEntryDescriptionBody,
): Promise<ExtraTimeEntryDescriptionRow> {
  const cur = await findExtraTimeEntryDescriptionById(pool, id)
  if (!cur) {
    throw new AppError('Descrição não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }

  const nextDescription = body.description ?? cur.description
  const nextNormalized = normalizeDescription(nextDescription)
  const duplicated = await findByNormalizedDescription(pool, nextNormalized, id)
  if (duplicated) {
    throw new AppError(
      'Já existe uma descrição com este conteúdo.',
      409,
      ErrorCodes.CONFLICT,
    )
  }

  const row = await updateExtraTimeEntryDescription(pool, id, {
    description: body.description,
    normalizedDescription: nextNormalized,
    internalNote: body.internalNote,
    sortOrder: body.sortOrder,
    isActive: body.isActive,
  })
  if (!row) {
    throw new AppError('Descrição não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  return row
}

export async function serviceDeleteExtraTimeEntryDescription(
  pool: pg.Pool,
  id: string,
): Promise<void> {
  const cur = await findExtraTimeEntryDescriptionById(pool, id)
  if (!cur) {
    throw new AppError('Descrição não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  const ok = await softDeleteExtraTimeEntryDescription(pool, id)
  if (!ok) {
    throw new AppError('Descrição não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
}
