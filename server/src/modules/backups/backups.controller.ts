import type { Request, Response } from 'express'
import type pg from 'pg'
import type { Env } from '../../config/env.js'
import { ok } from '../../shared/http/ok.js'
import { backupIdParamSchema, walIdParamSchema } from './backups.schemas.js'
import {
  serviceDownloadBackup,
  serviceDownloadWal,
  serviceGetBackupSummary,
  serviceListBackups,
  serviceListWal,
  serviceSyncWal,
  serviceTriggerFullBackup,
} from './backups.service.js'

function poolOf(req: Request): pg.Pool {
  return req.app.locals.pool as pg.Pool
}

function envOf(req: Request): Env {
  return req.app.locals.env as Env
}

export async function getBackupsSummary(
  req: Request,
  res: Response,
): Promise<void> {
  const data = await serviceGetBackupSummary(poolOf(req), envOf(req))
  res.json(ok(data))
}

export async function getBackupsList(req: Request, res: Response): Promise<void> {
  const data = await serviceListBackups(poolOf(req), envOf(req))
  res.json(ok(data))
}

export async function postBackupManual(
  req: Request,
  res: Response,
): Promise<void> {
  const actorUserId = req.authUser!.id
  const data = await serviceTriggerFullBackup(poolOf(req), envOf(req), {
    triggerType: 'MANUAL',
    actorUserId,
    logger: req.app.locals.logger,
    wait: false,
  })
  res.status(202).json(ok(data))
}

export async function getBackupDownload(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = backupIdParamSchema.parse(req.params)
  await serviceDownloadBackup(
    poolOf(req),
    envOf(req),
    id,
    req.authUser!.id,
    res,
  )
}

export async function getWalList(req: Request, res: Response): Promise<void> {
  const data = await serviceListWal(poolOf(req), envOf(req))
  res.json(ok(data))
}

export async function postWalSync(req: Request, res: Response): Promise<void> {
  const data = await serviceSyncWal(poolOf(req), envOf(req), req.authUser!.id)
  res.json(ok(data))
}

export async function getWalDownload(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = walIdParamSchema.parse(req.params)
  await serviceDownloadWal(
    poolOf(req),
    envOf(req),
    id,
    req.authUser!.id,
    res,
  )
}
