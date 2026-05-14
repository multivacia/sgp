import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  getSystemSettingByKey,
  getSystemSettings,
  patchSystemSettingByKey,
} from './system-settings.controller.js'

function viewAccess() {
  return [requireAuth(), requirePermission('system_settings.view')]
}

function manageAccess() {
  return [requireAuth(), requirePermission('system_settings.manage')]
}

export function systemSettingsRouter(): Router {
  const r = Router()
  r.get('/system-settings', ...viewAccess(), asyncRoute(getSystemSettings))
  r.get('/system-settings/:key', ...viewAccess(), asyncRoute(getSystemSettingByKey))
  r.patch('/system-settings/:key', ...manageAccess(), asyncRoute(patchSystemSettingByKey))
  return r
}
