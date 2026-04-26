import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import {
  getCollaboratorById,
  getCollaborators,
  patchCollaborator,
  postActivate,
  postCollaborator,
  postInactivate,
} from './collaborators.controller.js'
import { getOperationalJourney } from '../operational-journey/operational-journey.controller.js'

/** Leitura para fluxos operacionais autenticados (esteiras, matrizes). */
const auth = [requireAuth()]

/**
 * Mutações legadas em `/collaborators` — mesma família que `/admin/collaborators`.
 */
const authCreate = [requireAuth(), requirePermission('collaborators_admin.create')]
const authEdit = [requireAuth(), requirePermission('collaborators_admin.edit')]
const authActivate = [requireAuth(), requirePermission('collaborators_admin.activate')]
const authDeactivate = [
  requireAuth(),
  requirePermission('collaborators_admin.deactivate'),
]

const authJourney = [requireAuth(), requirePermission('collaborators_admin.view')]

export function collaboratorsRouter(): Router {
  const r = Router()
  r.get('/collaborators', ...auth, asyncRoute(getCollaborators))
  r.get(
    '/collaborators/:collaboratorId/operational-journey',
    ...authJourney,
    asyncRoute(getOperationalJourney),
  )
  r.get('/collaborators/:id', ...auth, asyncRoute(getCollaboratorById))
  r.post('/collaborators', ...authCreate, asyncRoute(postCollaborator))
  r.patch('/collaborators/:id', ...authEdit, asyncRoute(patchCollaborator))
  r.post('/collaborators/:id/activate', ...authActivate, asyncRoute(postActivate))
  r.post('/collaborators/:id/inactivate', ...authDeactivate, asyncRoute(postInactivate))
  return r
}
