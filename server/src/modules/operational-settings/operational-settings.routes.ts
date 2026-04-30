import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  deleteCollaboratorCapacity,
  deleteOperationalCollaboratorRole,
  deleteOperationalSector,
  getCollaboratorCapacity,
  getOperationalCapacitySettings,
  getOperationalCollaboratorRoles,
  getOperationalSectors,
  putCollaboratorCapacity,
  putOperationalCapacitySettings,
  patchOperationalCollaboratorRole,
  patchOperationalSector,
  postOperationalCollaboratorRole,
  postOperationalSector,
} from './operational-settings.controller.js'

function ap(code: string) {
  return [requireAuth(), requirePermission(code)]
}

export function operationalSettingsRouter(): Router {
  const r = Router()
  const m = 'operational_settings.manage'

  r.get('/admin/operational-settings/sectors', ...ap(m), asyncRoute(getOperationalSectors))
  r.post('/admin/operational-settings/sectors', ...ap(m), asyncRoute(postOperationalSector))
  r.patch('/admin/operational-settings/sectors/:id', ...ap(m), asyncRoute(patchOperationalSector))
  r.delete('/admin/operational-settings/sectors/:id', ...ap(m), asyncRoute(deleteOperationalSector))

  r.get(
    '/admin/operational-settings/collaborator-roles',
    ...ap(m),
    asyncRoute(getOperationalCollaboratorRoles),
  )
  r.post(
    '/admin/operational-settings/collaborator-roles',
    ...ap(m),
    asyncRoute(postOperationalCollaboratorRole),
  )
  r.patch(
    '/admin/operational-settings/collaborator-roles/:id',
    ...ap(m),
    asyncRoute(patchOperationalCollaboratorRole),
  )
  r.delete(
    '/admin/operational-settings/collaborator-roles/:id',
    ...ap(m),
    asyncRoute(deleteOperationalCollaboratorRole),
  )
  r.get('/admin/operational-settings/capacity', ...ap(m), asyncRoute(getOperationalCapacitySettings))
  r.put('/admin/operational-settings/capacity', ...ap(m), asyncRoute(putOperationalCapacitySettings))
  r.get(
    '/admin/operational-settings/collaborators/:collaboratorId/capacity',
    ...ap(m),
    asyncRoute(getCollaboratorCapacity),
  )
  r.put(
    '/admin/operational-settings/collaborators/:collaboratorId/capacity',
    ...ap(m),
    asyncRoute(putCollaboratorCapacity),
  )
  r.delete(
    '/admin/operational-settings/collaborators/:collaboratorId/capacity',
    ...ap(m),
    asyncRoute(deleteCollaboratorCapacity),
  )

  return r
}
