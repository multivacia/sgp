import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import { serviceListProductionCollaborators } from './production-collaborators.service.js'

export async function getProductionCollaborators(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceListProductionCollaborators(pool)
  res.json(ok(data))
}
