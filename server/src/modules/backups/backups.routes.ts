import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  getBackupDownload,
  getBackupsList,
  getBackupsSummary,
  getWalDownload,
  getWalList,
  postBackupManual,
  postWalSync,
} from './backups.controller.js'

function withPerm(code: string) {
  return [requireAuth(), requirePermission(code)]
}

export function backupsRouter(): Router {
  const r = Router()

  // Rotas estáticas antes de /:id
  r.get(
    '/admin/backups/summary',
    ...withPerm('backups.view'),
    asyncRoute(getBackupsSummary),
  )
  r.get(
    '/admin/backups/wal',
    ...withPerm('backups.wal.view'),
    asyncRoute(getWalList),
  )
  r.post(
    '/admin/backups/wal/sync',
    ...withPerm('backups.wal.view'),
    asyncRoute(postWalSync),
  )
  r.get(
    '/admin/backups/wal/:id/download',
    ...withPerm('backups.wal.download'),
    asyncRoute(getWalDownload),
  )
  r.get(
    '/admin/backups/:id/download',
    ...withPerm('backups.download'),
    asyncRoute(getBackupDownload),
  )
  r.get(
    '/admin/backups',
    ...withPerm('backups.view'),
    asyncRoute(getBackupsList),
  )
  r.post(
    '/admin/backups',
    ...withPerm('backups.create'),
    asyncRoute(postBackupManual),
  )

  return r
}
