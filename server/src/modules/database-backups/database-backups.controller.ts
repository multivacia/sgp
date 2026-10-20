import type { Request, Response } from 'express'
import type pg from 'pg'
import type { Logger } from 'pino'
import type { Env } from '../../config/env.js'
import { ok } from '../../shared/http/ok.js'
import { backupFileParamSchema, restoreBodySchema } from './database-backups.schemas.js'
import {
  serviceGetDatabaseBackupsStatus,
  serviceGetRestoreStatus,
  serviceListDatabaseBackups,
  serviceOpenBackupDownload,
  serviceStartManualBackup,
  serviceStartRestore,
} from './database-backups.service.js'

export async function getDatabaseBackups(_req: Request, res: Response): Promise<void> {
  const items = await serviceListDatabaseBackups()
  res.json(ok(items, { count: items.length }))
}

export async function getDatabaseBackupsStatus(req: Request, res: Response): Promise<void> {
  const env = req.app.locals.env as Env
  res.json(ok(await serviceGetDatabaseBackupsStatus(env)))
}

export async function postDatabaseBackup(req: Request, res: Response): Promise<void> {
  const logger = req.app.locals.logger as Logger
  await serviceStartManualBackup(logger)
  res.status(202).json(ok({ started: true }))
}

export async function getDatabaseBackupDownload(req: Request, res: Response): Promise<void> {
  const { fileName } = backupFileParamSchema.parse(req.params)
  const file = await serviceOpenBackupDownload(fileName)
  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Length', String(file.sizeBytes))
  res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`)
  file.stream.on('error', () => {
    res.destroy()
  })
  file.stream.pipe(res)
}

export async function postDatabaseRestore(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const env = req.app.locals.env as Env
  const logger = req.app.locals.logger as Logger
  const body = restoreBodySchema.parse(req.body)
  const job = await serviceStartRestore(pool, env, logger, {
    fileName: body.fileName,
    databaseName: body.databaseName,
    actorUserId: req.authUser!.id,
    actorEmail: req.authUser!.email,
  })
  res.status(202).json(ok(job))
}

export async function getDatabaseRestoreStatus(_req: Request, res: Response): Promise<void> {
  res.json(ok(serviceGetRestoreStatus()))
}
