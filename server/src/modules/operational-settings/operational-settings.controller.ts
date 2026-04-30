import type { Request, Response } from 'express'
import type pg from 'pg'
import { ok } from '../../shared/http/ok.js'
import {
  collaboratorCapacityQuerySchema,
  createCollaboratorRoleBodySchema,
  createSectorBodySchema,
  patchCollaboratorRoleBodySchema,
  patchSectorBodySchema,
  upsertCollaboratorCapacityOverrideBodySchema,
  upsertOperationalCapacityBodySchema,
  uuidParamSchema,
} from './operational-settings.schemas.js'
import {
  serviceCreateCollaboratorFunction,
  serviceCreateSector,
  serviceDeleteCollaboratorFunction,
  serviceGetCollaboratorCapacityOverrides,
  serviceGetOperationalCapacitySettings,
  serviceDeleteSector,
  serviceListCollaboratorFunctions,
  serviceListSectorsAdmin,
  servicePatchCollaboratorFunction,
  servicePatchSector,
  serviceResolveCollaboratorDailyCapacity,
  serviceSoftDeleteCollaboratorCapacityOverride,
  serviceUpsertCollaboratorCapacityOverride,
  serviceUpsertOperationalCapacitySettings,
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

function capacitySettingsToJson(row: {
  default_daily_minutes: number
  updated_at: Date
  updated_by: string | null
}) {
  return {
    defaultDailyMinutes: row.default_daily_minutes,
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updated_by,
  }
}

function capacityOverrideToJson(row: {
  id: string
  collaborator_id: string
  daily_minutes: number
  effective_from: string | null
  effective_to: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
  created_by: string | null
  updated_by: string | null
  deleted_at: Date | null
}) {
  return {
    id: row.id,
    collaboratorId: row.collaborator_id,
    dailyMinutes: row.daily_minutes,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at?.toISOString() ?? null,
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

export async function getOperationalCapacitySettings(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceGetOperationalCapacitySettings(pool)
  const data = row
    ? capacitySettingsToJson(row)
    : {
        defaultDailyMinutes: 480,
        updatedAt: null,
        updatedBy: null,
      }
  res.json(ok(data))
}

export async function putOperationalCapacitySettings(
  req: Request,
  res: Response,
): Promise<void> {
  const body = upsertOperationalCapacityBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceUpsertOperationalCapacitySettings(
    pool,
    body.defaultDailyMinutes,
    req.authUser?.id ?? null,
  )
  res.json(ok(capacitySettingsToJson(row)))
}

export async function getCollaboratorCapacity(
  req: Request,
  res: Response,
): Promise<void> {
  const collaboratorId = uuidParamSchema.parse(req.params.collaboratorId)
  const query = collaboratorCapacityQuerySchema.parse(req.query)
  const pool = req.app.locals.pool as pg.Pool
  const [resolved, overrides] = await Promise.all([
    serviceResolveCollaboratorDailyCapacity(pool, collaboratorId, query.date),
    serviceGetCollaboratorCapacityOverrides(pool, collaboratorId),
  ])
  res.json(
    ok({
      ...resolved,
      overrides: overrides.map(capacityOverrideToJson),
    }),
  )
}

export async function putCollaboratorCapacity(
  req: Request,
  res: Response,
): Promise<void> {
  const collaboratorId = uuidParamSchema.parse(req.params.collaboratorId)
  const body = upsertCollaboratorCapacityOverrideBodySchema.parse(req.body)
  const pool = req.app.locals.pool as pg.Pool
  const row = await serviceUpsertCollaboratorCapacityOverride(pool, {
    collaboratorId,
    dailyMinutes: body.dailyMinutes,
    effectiveFrom: body.effectiveFrom ?? null,
    effectiveTo: body.effectiveTo ?? null,
    isActive: body.isActive ?? true,
    actorUserId: req.authUser?.id ?? null,
  })
  res.json(ok(capacityOverrideToJson(row)))
}

export async function deleteCollaboratorCapacity(
  req: Request,
  res: Response,
): Promise<void> {
  const collaboratorId = uuidParamSchema.parse(req.params.collaboratorId)
  const pool = req.app.locals.pool as pg.Pool
  await serviceSoftDeleteCollaboratorCapacityOverride(
    pool,
    collaboratorId,
    req.authUser?.id ?? null,
  )
  res.status(204).send()
}
