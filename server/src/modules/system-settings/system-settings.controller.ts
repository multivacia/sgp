import type { Request, Response } from 'express'
import type pg from 'pg'
import type { Logger } from 'pino'
import { ok } from '../../shared/http/ok.js'
import {
  patchSystemSettingBodySchema,
  systemSettingKeyParamSchema,
} from './system-settings.schemas.js'
import {
  serviceGetAllowlistedSystemSetting,
  serviceListAllowlistedSystemSettings,
  servicePatchAllowlistedSystemSetting,
} from './system-settings-admin.service.js'

export async function getSystemSettings(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const items = await serviceListAllowlistedSystemSettings(pool)
  res.json(ok(items, { count: items.length }))
}

export async function getSystemSettingByKey(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const { key } = systemSettingKeyParamSchema.parse(req.params)
  const item = await serviceGetAllowlistedSystemSetting(pool, key)
  res.json(ok(item))
}

export async function patchSystemSettingByKey(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const logger = req.app.locals.logger as Logger
  const { key } = systemSettingKeyParamSchema.parse(req.params)
  const body = patchSystemSettingBodySchema.parse(req.body)
  const item = await servicePatchAllowlistedSystemSetting(
    pool,
    key,
    body.value,
    req.authUser!.id,
    logger,
    req.get('x-request-id') ?? undefined,
  )
  res.json(ok(item))
}
