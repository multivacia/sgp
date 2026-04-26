import type { Request, Response } from 'express'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import {
  createCollaboratorBodySchema,
  listCollaboratorsQuerySchema,
  patchCollaboratorBodySchema,
  uuidParamSchema,
} from './collaborators.schemas.js'
import {
  serviceActivate,
  serviceCreate,
  serviceGetById,
  serviceInactivate,
  serviceList,
  servicePatch,
} from './collaborators.service.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getCollaborators(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = listCollaboratorsQuerySchema.parse({
    status: queryString(req.query.status),
    sector_id: queryString(req.query.sector_id),
    search: queryString(req.query.search),
  })
  const filters = {
    status:
      q.status === undefined || q.status === 'ALL' ? undefined : q.status,
    sector_id:
      q.sector_id === undefined || q.sector_id === 'ALL'
        ? undefined
        : q.sector_id,
    search: q.search,
  }
  const { data, total } = await serviceList(pool, filters)
  res.json(ok(data, { total }))
}

export async function getCollaboratorById(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceGetById(pool, id)
  if (!row) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  res.json(ok(row))
}

export async function postCollaborator(
  req: Request,
  res: Response,
): Promise<void> {
  const body = createCollaboratorBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const created = await serviceCreate(pool, body)
  res.status(201).json(ok(created))
}

export async function patchCollaborator(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const body = patchCollaboratorBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const updated = await servicePatch(pool, id, body)
  if (!updated) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  res.json(ok(updated))
}

export async function postActivate(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const updated = await serviceActivate(pool, id)
  if (!updated) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  res.json(ok(updated))
}

export async function postInactivate(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const updated = await serviceInactivate(pool, id)
  if (!updated) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  res.json(ok(updated))
}
