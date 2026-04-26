import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { listRoles } from './roles.repository.js'

export async function getRoles(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const rows = await listRoles(pool)
  const data = rows.map((x) => ({
    id: x.id,
    code: x.code,
    name: x.name,
  }))
  res.json(ok(data, { total: data.length }))
}
