import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type {
  CreateStepAbortReasonBody,
  UpdateStepAbortReasonBody,
} from './step-abort-reasons.schemas.js'
import {
  findStepAbortReasonByCode,
  insertStepAbortReason,
  listActiveStepAbortReasonsForSelection,
  listStepAbortReasons,
  updateStepAbortReason,
  type StepAbortReasonRow,
} from './step-abort-reasons.repository.js'

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string }
  return e.code === '23505'
}

export async function serviceListStepAbortReasons(
  pool: pg.Pool,
  input: { q?: string; status: 'active' | 'inactive' | 'all' },
): Promise<StepAbortReasonRow[]> {
  return listStepAbortReasons(pool, input)
}

export async function serviceListActiveStepAbortReasonsForSelection(
  pool: pg.Pool,
): Promise<StepAbortReasonRow[]> {
  return listActiveStepAbortReasonsForSelection(pool)
}

export async function serviceCreateStepAbortReason(
  pool: pg.Pool,
  body: CreateStepAbortReasonBody,
): Promise<StepAbortReasonRow> {
  const existing = await findStepAbortReasonByCode(pool, body.code)
  if (existing) {
    throw new AppError(
      'Já existe um motivo de dispensa com este código.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
  try {
    return await insertStepAbortReason(pool, {
      code: body.code,
      label: body.label,
      description: body.description ?? null,
      requiresComplement: body.requiresComplement ?? false,
      sortOrder: body.sortOrder ?? 100,
      isActive: body.isActive ?? true,
    })
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new AppError(
        'Já existe um motivo de dispensa com este código.',
        409,
        ErrorCodes.CONFLICT,
      )
    }
    throw e
  }
}

export async function serviceUpdateStepAbortReason(
  pool: pg.Pool,
  code: string,
  body: UpdateStepAbortReasonBody,
): Promise<StepAbortReasonRow> {
  const cur = await findStepAbortReasonByCode(pool, code)
  if (!cur) {
    throw new AppError('Motivo de dispensa não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }

  const row = await updateStepAbortReason(pool, code, {
    label: body.label,
    description: body.description,
    requiresComplement: body.requiresComplement,
    sortOrder: body.sortOrder,
    isActive: body.isActive,
  })
  if (!row) {
    throw new AppError('Motivo de dispensa não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return row
}

export async function serviceSetStepAbortReasonActive(
  pool: pg.Pool,
  code: string,
  isActive: boolean,
): Promise<StepAbortReasonRow> {
  const cur = await findStepAbortReasonByCode(pool, code)
  if (!cur) {
    throw new AppError('Motivo de dispensa não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const row = await updateStepAbortReason(pool, code, { isActive })
  if (!row) {
    throw new AppError('Motivo de dispensa não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return row
}
