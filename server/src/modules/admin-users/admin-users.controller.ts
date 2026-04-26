import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  createAdminUserBodySchema,
  eligibleCollaboratorsQuerySchema,
  listAdminUsersQuerySchema,
  patchAdminUserBodySchema,
  uuidParamSchema,
} from './admin-users.schemas.js'
import {
  serviceActivate,
  serviceCollaboratorLinkageSummary,
  serviceCreateUser,
  serviceEligibleCollaborators,
  serviceForcePasswordChange,
  serviceGetUserById,
  serviceInactivate,
  serviceResetPassword,
  serviceListUsers,
  servicePatchUser,
  serviceRestore,
  serviceSoftDelete,
} from './admin-users.service.js'
import type { AdminUserListFilters } from './admin-users.repository.js'

function queryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export async function getCollaboratorLinkageSummary(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceCollaboratorLinkageSummary(pool)
  res.json(ok(data))
}

export async function getAdminUsers(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = listAdminUsersQuerySchema.parse({
    search: queryString(req.query.search),
    role_id: queryString(req.query.role_id),
    limit: queryString(req.query.limit),
    offset: queryString(req.query.offset),
  })
  const filters: AdminUserListFilters = {
    search: q.search,
    roleId: q.roleId,
    limit: q.limit,
    offset: q.offset,
  }
  const { data, total } = await serviceListUsers(pool, filters)
  res.json(ok(data, { total, limit: q.limit, offset: q.offset }))
}

export async function getAdminUserById(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceGetUserById(pool, id)
  res.json(ok(data))
}

export async function postAdminUser(
  req: Request,
  res: Response,
): Promise<void> {
  const body = createAdminUserBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const actorId = req.authUser!.id
  const created = await serviceCreateUser(pool, actorId, body)
  res.status(201).json(ok(created))
}

export async function patchAdminUser(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const body = patchAdminUserBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const actorId = req.authUser!.id
  const updated = await servicePatchUser(pool, actorId, id, body)
  res.json(ok(updated))
}

export async function postAdminUserActivate(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const actorId = req.authUser!.id
  const row = await serviceActivate(pool, actorId, id)
  res.json(ok(row))
}

export async function postAdminUserInactivate(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const actorId = req.authUser!.id
  const row = await serviceInactivate(pool, actorId, id)
  res.json(ok(row))
}

export async function postAdminUserSoftDelete(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const actorId = req.authUser!.id
  const row = await serviceSoftDelete(pool, actorId, id)
  res.json(ok(row))
}

export async function postAdminUserRestore(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const actorId = req.authUser!.id
  const row = await serviceRestore(pool, actorId, id)
  res.json(ok(row))
}

export async function postAdminUserForcePasswordChange(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const actorId = req.authUser!.id
  const row = await serviceForcePasswordChange(pool, actorId, id)
  res.json(ok(row))
}

export async function postAdminUserResetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const actorId = req.authUser!.id
  const result = await serviceResetPassword(pool, actorId, id)
  res.json(ok(result))
}

export async function getEligibleCollaboratorsForLink(
  req: Request,
  res: Response,
): Promise<void> {
  const q = eligibleCollaboratorsQuerySchema.parse({
    excludeUserId: queryString(req.query.excludeUserId),
  })
  const pool = req.app.locals.pool as pg.Pool
  const data = await serviceEligibleCollaborators(pool, q.excludeUserId)
  res.json(ok(data, { total: data.length }))
}
