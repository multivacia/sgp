import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  createProductionExtraTimeEntryBodySchema,
  listProductionExtraTimeEntriesQuerySchema,
} from './production-extra-time-entries.schemas.js'
import {
  serviceCreateProductionExtraTimeEntry,
  serviceListProductionExtraTimeEntries,
  serviceListProductionExtraTimeEntryDescriptionOptions,
} from './production-extra-time-entries.service.js'

function toOptionJson(row: { id: string; description: string }) {
  return {
    id: row.id,
    description: row.description,
  }
}

function toEntryJson(row: {
  id: string
  description_id: string
  description: string
  entry_date: string
  minutes: number
  notes: string | null
  created_at: Date
  updated_at: Date
}) {
  return {
    id: row.id,
    descriptionId: row.description_id,
    description: row.description,
    entryDate: row.entry_date,
    minutes: row.minutes,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function getProductionExtraTimeEntryDescriptions(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListProductionExtraTimeEntryDescriptionOptions(pool)
  const data = rows.map(toOptionJson)
  res.json(ok(data, { total: data.length }))
}

export async function getProductionExtraTimeEntries(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const query = listProductionExtraTimeEntriesQuerySchema.parse(req.query)
  const session = req.productionSession!
  const rows = await serviceListProductionExtraTimeEntries(pool, {
    collaboratorId: session.collaboratorId,
    limit: query.limit,
  })
  res.json(ok(rows.map(toEntryJson)))
}

export async function postProductionExtraTimeEntry(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const body = createProductionExtraTimeEntryBodySchema.parse(req.body)
  const session = req.productionSession!
  const row = await serviceCreateProductionExtraTimeEntry(pool, {
    collaboratorId: session.collaboratorId,
    body,
  })
  res.status(201).json(ok(toEntryJson(row)))
}
