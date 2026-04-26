import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  getRbacPermissionsCatalog,
  getRbacRolePermissions,
  getRbacRoles,
  putRbacRolePermissions,
} from './rbac.controller.js'

const rbacGate = [requireAuth(), requirePermission('rbac.manage_role_permissions')]

export function rbacRouter(): Router {
  const r = Router()
  r.get('/rbac/roles', ...rbacGate, asyncRoute(getRbacRoles))
  r.get('/rbac/permissions', ...rbacGate, asyncRoute(getRbacPermissionsCatalog))
  r.get(
    '/rbac/roles/:roleId/permissions',
    ...rbacGate,
    asyncRoute(getRbacRolePermissions),
  )
  r.put(
    '/rbac/roles/:roleId/permissions',
    ...rbacGate,
    asyncRoute(putRbacRolePermissions),
  )
  return r
}
