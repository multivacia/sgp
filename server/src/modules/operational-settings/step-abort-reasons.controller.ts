import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  createStepAbortReasonBodySchema,
  listStepAbortReasonsQuerySchema,
  stepAbortReasonCodeParamSchema,
  updateStepAbortReasonBodySchema,
} from './step-abort-reasons.schemas.js'
import {
  serviceCreateStepAbortReason,
  serviceListActiveStepAbortReasonsForSelection,
  serviceListStepAbortReasons,
  serviceSetStepAbortReasonActive,
  serviceUpdateStepAbortReason,
} from './step-abort-reasons.service.js'
import type { StepAbortReasonRow } from './step-abort-reasons.repository.js'

function rowToJson(row: StepAbortReasonRow) {
  return {
    code: row.code,
    label: row.label,
    description: row.description,
    requiresComplement: row.requires_complement,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function selectionRowToJson(row: StepAbortReasonRow) {
  return {
    code: row.code,
    label: row.label,
    description: row.description,
    requiresComplement: row.requires_complement,
    sortOrder: row.sort_order,
  }
}

export async function getStepAbortReasons(req: Request, res: Response): Promise<void> {
  const query = listStepAbortReasonsQuerySchema.parse(req.query)
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListStepAbortReasons(pool, query)
  const data = rows.map(rowToJson)
  res.json(ok(data, { total: data.length }))
}

export async function postStepAbortReason(req: Request, res: Response): Promise<void> {
  const body = createStepAbortReasonBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceCreateStepAbortReason(pool, body)
  res.status(201).json(ok(rowToJson(row)))
}

export async function patchStepAbortReason(req: Request, res: Response): Promise<void> {
  const code = stepAbortReasonCodeParamSchema.parse(req.params.code)
  const body = updateStepAbortReasonBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceUpdateStepAbortReason(pool, code, body)
  res.json(ok(rowToJson(row)))
}

export async function patchStepAbortReasonActivate(
  req: Request,
  res: Response,
): Promise<void> {
  const code = stepAbortReasonCodeParamSchema.parse(req.params.code)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceSetStepAbortReasonActive(pool, code, true)
  res.json(ok(rowToJson(row)))
}

export async function patchStepAbortReasonDeactivate(
  req: Request,
  res: Response,
): Promise<void> {
  const code = stepAbortReasonCodeParamSchema.parse(req.params.code)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceSetStepAbortReasonActive(pool, code, false)
  res.json(ok(rowToJson(row)))
}

export async function getActiveStepAbortReasonsForSelection(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListActiveStepAbortReasonsForSelection(pool)
  const data = rows.map(selectionRowToJson)
  res.json(ok(data, { total: data.length }))
}
