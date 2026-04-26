import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  createCollaboratorRoleBodySchema,
  createSectorBodySchema,
  patchCollaboratorRoleBodySchema,
  patchSectorBodySchema,
  uuidParamSchema,
} from './operational-settings.schemas.js'
import {
  serviceCreateCollaboratorFunction,
  serviceCreateSector,
  serviceDeleteCollaboratorFunction,
  serviceDeleteSector,
  serviceListCollaboratorFunctions,
  serviceListSectorsAdmin,
  servicePatchCollaboratorFunction,
  servicePatchSector,
} from './operational-settings.service.js'

function sectorToJson(row: {
  id: string
  name: string
  is_active: boolean
  created_at: Date
}) {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
  }
}

function roleToJson(row: {
  id: string
  code: string
  name: string
  is_active: boolean
  is_collaborator_function: boolean
  created_at: Date
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    isCollaboratorFunction: row.is_collaborator_function,
    createdAt: row.created_at.toISOString(),
  }
}

export async function getOperationalSectors(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListSectorsAdmin(pool)
  const data = rows.map(sectorToJson)
  res.json(ok(data, { total: data.length }))
}

export async function postOperationalSector(req: Request, res: Response): Promise<void> {
  const body = createSectorBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceCreateSector(pool, body)
  res.status(201).json(ok(sectorToJson(row)))
}

export async function patchOperationalSector(req: Request, res: Response): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const body = patchSectorBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await servicePatchSector(pool, id, body)
  res.json(ok(sectorToJson(row)))
}

export async function deleteOperationalSector(req: Request, res: Response): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  await serviceDeleteSector(pool, id)
  res.status(204).send()
}

export async function getOperationalCollaboratorRoles(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListCollaboratorFunctions(pool)
  const data = rows.map(roleToJson)
  res.json(ok(data, { total: data.length }))
}

export async function postOperationalCollaboratorRole(
  req: Request,
  res: Response,
): Promise<void> {
  const body = createCollaboratorRoleBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceCreateCollaboratorFunction(pool, body)
  res.status(201).json(ok(roleToJson(row)))
}

export async function patchOperationalCollaboratorRole(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const body = patchCollaboratorRoleBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await servicePatchCollaboratorFunction(pool, id, body)
  res.json(ok(roleToJson(row)))
}

export async function deleteOperationalCollaboratorRole(
  req: Request,
  res: Response,
): Promise<void> {
  const id = uuidParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  await serviceDeleteCollaboratorFunction(pool, id)
  res.status(204).send()
}
