import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  getDatabaseBackupDownload,
  getDatabaseBackups,
  getDatabaseBackupsStatus,
  getDatabaseRestoreStatus,
  postDatabaseBackup,
  postDatabaseRestore,
} from './database-backups.controller.js'

function manageAccess() {
  return [requireAuth(), requirePermission('system_settings.manage')]
}

export function databaseBackupsRouter(): Router {
  const r = Router()
  const base = '/admin/database-backups'
  r.get(base, ...manageAccess(), asyncRoute(getDatabaseBackups))
  r.get(`${base}/status`, ...manageAccess(), asyncRoute(getDatabaseBackupsStatus))
  r.post(base, ...manageAccess(), asyncRoute(postDatabaseBackup))
  r.get(`${base}/restore/status`, ...manageAccess(), asyncRoute(getDatabaseRestoreStatus))
  r.post(`${base}/restore`, ...manageAccess(), asyncRoute(postDatabaseRestore))
  r.get(`${base}/:fileName/download`, ...manageAccess(), asyncRoute(getDatabaseBackupDownload))
  return r
}
