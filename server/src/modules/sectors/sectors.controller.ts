import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { listSectors } from './sectors.repository.js'

export async function getSectors(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const rows = await listSectors(pool)
  const data = rows.map((x) => ({ id: x.id, name: x.name }))
  res.json(ok(data, { total: data.length }))
}
