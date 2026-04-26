import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import { getAdminAuditEvents } from './admin-audit.controller.js'

export function adminAuditRouter(): Router {
  const r = Router()
  r.get(
    '/admin/audit-events',
    requireAuth(),
    requirePermission('audit.view'),
    asyncRoute(getAdminAuditEvents),
  )
  return r
}
