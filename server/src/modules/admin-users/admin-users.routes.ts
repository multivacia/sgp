import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  getAdminCollaboratorById,
  getAdminCollaborators,
  patchAdminCollaborator,
  postAdminCollaborator,
  postAdminCollaboratorActivate,
  postAdminCollaboratorInactivate,
  postAdminCollaboratorRestore,
  postAdminCollaboratorSoftDelete,
} from '../admin-collaborators/admin-collaborators.controller.js'
import {
  getAdminUserById,
  getAdminUsers,
  getCollaboratorLinkageSummary,
  getEligibleCollaboratorsForLink,
  patchAdminUser,
  postAdminUser,
  postAdminUserActivate,
  postAdminUserForcePasswordChange,
  postAdminUserInactivate,
  postAdminUserResetPassword,
  postAdminUserRestore,
  postAdminUserSoftDelete,
} from './admin-users.controller.js'

function ap(code: string) {
  return [requireAuth(), requirePermission(code)]
}

export function adminUsersRouter(): Router {
  const r = Router()

  r.get(
    '/admin/users/collaborator-linkage-summary',
    ...ap('users.view'),
    asyncRoute(getCollaboratorLinkageSummary),
  )
  r.get('/admin/users', ...ap('users.view'), asyncRoute(getAdminUsers))
  r.get('/admin/users/:id', ...ap('users.view'), asyncRoute(getAdminUserById))
  r.post('/admin/users', ...ap('users.create'), asyncRoute(postAdminUser))
  r.patch('/admin/users/:id', ...ap('users.edit'), asyncRoute(patchAdminUser))
  r.post(
    '/admin/users/:id/activate',
    ...ap('users.activate'),
    asyncRoute(postAdminUserActivate),
  )
  r.post(
    '/admin/users/:id/inactivate',
    ...ap('users.deactivate'),
    asyncRoute(postAdminUserInactivate),
  )
  r.post(
    '/admin/users/:id/soft-delete',
    ...ap('users.soft_delete'),
    asyncRoute(postAdminUserSoftDelete),
  )
  r.post('/admin/users/:id/restore', ...ap('users.restore'), asyncRoute(postAdminUserRestore))
  r.post(
    '/admin/users/:id/force-password-change',
    ...ap('users.force_password_change'),
    asyncRoute(postAdminUserForcePasswordChange),
  )
  r.post(
    '/admin/users/:id/reset-password',
    ...ap('users.reset_password'),
    asyncRoute(postAdminUserResetPassword),
  )
  r.get(
    '/admin/collaborators/eligible-for-link',
    ...ap('users.view'),
    asyncRoute(getEligibleCollaboratorsForLink),
  )

  r.get(
    '/admin/collaborators',
    ...ap('collaborators_admin.view'),
    asyncRoute(getAdminCollaborators),
  )
  r.get(
    '/admin/collaborators/:id',
    ...ap('collaborators_admin.view'),
    asyncRoute(getAdminCollaboratorById),
  )
  r.post(
    '/admin/collaborators',
    ...ap('collaborators_admin.create'),
    asyncRoute(postAdminCollaborator),
  )
  r.patch(
    '/admin/collaborators/:id',
    ...ap('collaborators_admin.edit'),
    asyncRoute(patchAdminCollaborator),
  )
  r.post(
    '/admin/collaborators/:id/activate',
    ...ap('collaborators_admin.activate'),
    asyncRoute(postAdminCollaboratorActivate),
  )
  r.post(
    '/admin/collaborators/:id/inactivate',
    ...ap('collaborators_admin.deactivate'),
    asyncRoute(postAdminCollaboratorInactivate),
  )
  r.post(
    '/admin/collaborators/:id/soft-delete',
    ...ap('collaborators_admin.soft_delete'),
    asyncRoute(postAdminCollaboratorSoftDelete),
  )
  r.post(
    '/admin/collaborators/:id/restore',
    ...ap('collaborators_admin.restore'),
    asyncRoute(postAdminCollaboratorRestore),
  )
  return r
}
