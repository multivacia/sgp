import { Router } from 'express'
import type { Env } from '../../config/env.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import {
  documentDraftMulter,
  documentDraftMulterErrorHandler,
} from '../argos-integration/document-draft.multer.js'
import { postDocumentDraft } from '../argos-integration/document-draft.controller.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import { postConveyor } from './conveyors.controller.js'
import { getConveyorById } from './conveyors.detail.controller.js'
import { getConveyorNodeWorkload } from './conveyors.nodeWorkload.controller.js'
import { getConveyors } from './conveyors.list.controller.js'
import { getActiveStepAbortReasonsForSelection } from '../operational-settings/step-abort-reasons.controller.js'
import {
  patchConveyorDados,
  patchConveyorStructure,
} from './conveyors.patch.controller.js'
import { postConveyorStructureItem } from './conveyors.structure-append.controller.js'
import { deleteConveyor } from './conveyors.delete.controller.js'
import {
  postConveyorReturnToBacklog,
  postConveyorReturnToPlanning,
} from './conveyor-lifecycle.controller.js'
import { patchConveyorStatus } from './conveyors.status.controller.js'
import { registerConveyorOperationalPlanRoutes } from '../conveyor-operational-plan/conveyor-operational-plan.routes.js'
import { registerConveyorHealthRoutes } from './health/conveyor-health.routes.js'
import { registerConveyorOperationalEventsRoutes } from './operational-events/conveyor-operational-events.routes.js'

const auth = [requireAuth()]

export function conveyorsRouter(env: Env): Router {
  const r = Router()
  registerConveyorHealthRoutes(r)
  registerConveyorOperationalEventsRoutes(r)
  registerConveyorOperationalPlanRoutes(r)
  const uploadDraft = documentDraftMulter(env)
  r.get('/conveyors', ...auth, asyncRoute(getConveyors))
  // Estática antes de /conveyors/:id — evita capturar "step-abort-reasons" como UUID.
  r.get(
    '/conveyors/step-abort-reasons',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(getActiveStepAbortReasonsForSelection),
  )
  r.patch(
    '/conveyors/:id/status',
    requireAuth(),
    requirePermission('conveyors.edit_status'),
    asyncRoute(patchConveyorStatus),
  )
  r.post(
    '/conveyors/:id/return-to-backlog',
    requireAuth(),
    requirePermission('conveyors.edit_status'),
    asyncRoute(postConveyorReturnToBacklog),
  )
  r.post(
    '/conveyors/:id/return-to-planning',
    requireAuth(),
    requirePermission('conveyors.edit_status'),
    asyncRoute(postConveyorReturnToPlanning),
  )
  r.patch(
    '/conveyors/:id/structure',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(patchConveyorStructure),
  )
  r.post(
    '/conveyors/:id/structure/items',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(postConveyorStructureItem),
  )
  r.patch(
    '/conveyors/:id',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(patchConveyorDados),
  )
  r.get(
    '/conveyors/:id/node-workload',
    ...auth,
    asyncRoute(getConveyorNodeWorkload),
  )
  r.get('/conveyors/:id', ...auth, asyncRoute(getConveyorById))
  r.post(
    '/conveyors/document-draft',
    requireAuth(),
    requirePermission('conveyors.create'),
    (req, res, next) => {
      uploadDraft(req, res, (err) => {
        if (err) {
          documentDraftMulterErrorHandler(err, req, res, next)
          return
        }
        next()
      })
    },
    asyncRoute(postDocumentDraft),
  )
  r.post(
    '/conveyors',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(postConveyor),
  )
  /** Exclusão física (NO_BACKLOG). RBAC: `conveyors.create`; evolução futura: `conveyors.delete`. */
  r.delete(
    '/conveyors/:id',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(deleteConveyor),
  )
  return r
}
