import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type {
  CreateTimeEntryJustificationBody,
  UpdateTimeEntryJustificationBody,
} from './time-entry-justifications.schemas.js'
import {
  findByNormalizedLabel,
  findTimeEntryJustificationById,
  insertTimeEntryJustification,
  listTimeEntryJustifications,
  updateTimeEntryJustification,
  type TimeEntryJustificationRow,
} from './time-entry-justifications.repository.js'

function normalizeLabel(input: string): string {
  return input.trim().toLowerCase()
}

export async function serviceListTimeEntryJustifications(
  pool: pg.Pool,
  input: { q?: string; status: 'active' | 'inactive' | 'all' },
): Promise<TimeEntryJustificationRow[]> {
  return listTimeEntryJustifications(pool, input)
}

export async function serviceListActiveTimeEntryJustificationsForSelection(
  pool: pg.Pool,
): Promise<TimeEntryJustificationRow[]> {
  return listTimeEntryJustifications(pool, { status: 'active' })
}

export async function serviceCreateTimeEntryJustification(
  pool: pg.Pool,
  body: CreateTimeEntryJustificationBody,
): Promise<TimeEntryJustificationRow> {
  const normalizedLabel = normalizeLabel(body.label)
  const duplicated = await findByNormalizedLabel(pool, normalizedLabel)
  if (duplicated) {
    throw new AppError(
      'Já existe uma justificativa com este rótulo.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
  return insertTimeEntryJustification(pool, {
    label: body.label,
    description: body.description ?? null,
    category: body.category ?? null,
    requiresComplement: body.requiresComplement ?? false,
    usageScope: body.usageScope ?? null,
    sortOrder: body.sortOrder ?? 100,
    isActive: body.isActive ?? true,
  })
}

export async function serviceUpdateTimeEntryJustification(
  pool: pg.Pool,
  id: string,
  body: UpdateTimeEntryJustificationBody,
): Promise<TimeEntryJustificationRow> {
  const cur = await findTimeEntryJustificationById(pool, id)
  if (!cur) {
    throw new AppError('Justificativa não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }

  const nextLabel = body.label ?? cur.label
  const nextNormalized = normalizeLabel(nextLabel)
  const duplicated = await findByNormalizedLabel(pool, nextNormalized, id)
  if (duplicated) {
    throw new AppError(
      'Já existe uma justificativa com este rótulo.',
      409,
      ErrorCodes.CONFLICT,
    )
  }

  const row = await updateTimeEntryJustification(pool, id, {
    label: body.label,
    description: body.description,
    category: body.category,
    requiresComplement: body.requiresComplement,
    usageScope: body.usageScope,
    sortOrder: body.sortOrder,
    isActive: body.isActive,
  })
  if (!row) {
    throw new AppError('Justificativa não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  return row
}

export async function serviceSetTimeEntryJustificationActive(
  pool: pg.Pool,
  id: string,
  isActive: boolean,
): Promise<TimeEntryJustificationRow> {
  const cur = await findTimeEntryJustificationById(pool, id)
  if (!cur) {
    throw new AppError('Justificativa não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  const row = await updateTimeEntryJustification(pool, id, { isActive })
  if (!row) {
    throw new AppError('Justificativa não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  return row
}
