import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  createExtraTimeEntryDescriptionBodySchema,
  extraTimeEntryDescriptionIdParamSchema,
  listExtraTimeEntryDescriptionsQuerySchema,
  updateExtraTimeEntryDescriptionBodySchema,
} from './extra-time-entry-descriptions.schemas.js'
import {
  serviceCreateExtraTimeEntryDescription,
  serviceDeleteExtraTimeEntryDescription,
  serviceListExtraTimeEntryDescriptions,
  serviceUpdateExtraTimeEntryDescription,
} from './extra-time-entry-descriptions.service.js'

function rowToJson(row: {
  id: string
  description: string
  internal_note: string | null
  sort_order: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}) {
  return {
    id: row.id,
    description: row.description,
    internalNote: row.internal_note,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function getExtraTimeEntryDescriptions(
  req: Request,
  res: Response,
): Promise<void> {
  const query = listExtraTimeEntryDescriptionsQuerySchema.parse(req.query)
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListExtraTimeEntryDescriptions(pool, query)
  const data = rows.map(rowToJson)
  res.json(ok(data, { total: data.length }))
}

export async function postExtraTimeEntryDescription(
  req: Request,
  res: Response,
): Promise<void> {
  const body = createExtraTimeEntryDescriptionBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceCreateExtraTimeEntryDescription(pool, body)
  res.status(201).json(ok(rowToJson(row)))
}

export async function putExtraTimeEntryDescription(
  req: Request,
  res: Response,
): Promise<void> {
  const id = extraTimeEntryDescriptionIdParamSchema.parse(req.params.id)
  const body = updateExtraTimeEntryDescriptionBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceUpdateExtraTimeEntryDescription(pool, id, body)
  res.json(ok(rowToJson(row)))
}

export async function deleteExtraTimeEntryDescription(
  req: Request,
  res: Response,
): Promise<void> {
  const id = extraTimeEntryDescriptionIdParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  await serviceDeleteExtraTimeEntryDescription(pool, id)
  res.status(204).send()
}
