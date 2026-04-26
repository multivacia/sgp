import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'

export async function getHealth(_req: Request, res: Response): Promise<void> {
  res.json(ok({ ok: true, service: 'sgp-api' }))
}

export async function getHealthDb(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const r = await pool.query('SELECT 1 AS ok')
  const row = r.rows[0] as { ok: number }
  res.json(ok({ ok: row?.ok === 1, database: 'connected' }))
}
