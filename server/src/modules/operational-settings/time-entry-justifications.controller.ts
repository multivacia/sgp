import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  createTimeEntryJustificationBodySchema,
  listTimeEntryJustificationsQuerySchema,
  timeEntryJustificationIdParamSchema,
  updateTimeEntryJustificationBodySchema,
} from './time-entry-justifications.schemas.js'
import {
  serviceCreateTimeEntryJustification,
  serviceListActiveTimeEntryJustificationsForSelection,
  serviceListTimeEntryJustifications,
  serviceSetTimeEntryJustificationActive,
  serviceUpdateTimeEntryJustification,
} from './time-entry-justifications.service.js'

function rowToJson(row: {
  id: string
  label: string
  description: string | null
  category: string | null
  requires_complement: boolean
  usage_scope: string | null
  sort_order: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}) {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    category: row.category,
    requiresComplement: row.requires_complement,
    usageScope: row.usage_scope,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function selectionRowToJson(row: {
  id: string
  label: string
  description: string | null
  category: string | null
  requires_complement: boolean
  sort_order: number
}) {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    category: row.category,
    requiresComplement: row.requires_complement,
    sortOrder: row.sort_order,
  }
}

export async function getTimeEntryJustifications(
  req: Request,
  res: Response,
): Promise<void> {
  const query = listTimeEntryJustificationsQuerySchema.parse(req.query)
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListTimeEntryJustifications(pool, query)
  const data = rows.map(rowToJson)
  res.json(ok(data, { total: data.length }))
}

export async function postTimeEntryJustification(
  req: Request,
  res: Response,
): Promise<void> {
  const body = createTimeEntryJustificationBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceCreateTimeEntryJustification(pool, body)
  res.status(201).json(ok(rowToJson(row)))
}

export async function patchTimeEntryJustification(
  req: Request,
  res: Response,
): Promise<void> {
  const id = timeEntryJustificationIdParamSchema.parse(req.params.id)
  const body = updateTimeEntryJustificationBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceUpdateTimeEntryJustification(pool, id, body)
  res.json(ok(rowToJson(row)))
}

export async function patchTimeEntryJustificationActivate(
  req: Request,
  res: Response,
): Promise<void> {
  const id = timeEntryJustificationIdParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceSetTimeEntryJustificationActive(pool, id, true)
  res.json(ok(rowToJson(row)))
}

export async function patchTimeEntryJustificationDeactivate(
  req: Request,
  res: Response,
): Promise<void> {
  const id = timeEntryJustificationIdParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceSetTimeEntryJustificationActive(pool, id, false)
  res.json(ok(rowToJson(row)))
}

export async function getActiveTimeEntryJustificationsForSelection(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListActiveTimeEntryJustificationsForSelection(pool)
  const data = rows.map(selectionRowToJson)
  res.json(ok(data, { total: data.length }))
}
