import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import { getActiveStepAbortReasonsForSelection } from '../operational-settings/step-abort-reasons.controller.js'
import {
  deleteConveyorStepAssignee,
  deleteConveyorStepTimeEntry,
  getConveyorStepAssignees,
  getConveyorStepSequenceCheck,
  getConveyorStepTimeEntries,
  patchConveyorStepCompletion,
  postConveyorStepAbort,
  postConveyorStepAssignee,
  postConveyorStepRestoreAborted,
  postConveyorStepTimeEntry,
  postConveyorStepTimeEntryOnBehalf,
} from './conveyorAssignments.controller.js'

const auth = [requireAuth()]

export function conveyorAssignmentsRouter(): Router {
  const r = Router()
  // Rota estática antes de :conveyorId para evitar colisão com parâmetros dinâmicos.
  r.get(
    '/conveyors/step-abort-reasons',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(getActiveStepAbortReasonsForSelection),
  )
  r.patch(
    '/conveyors/:conveyorId/steps/:stepNodeId/completion',
    requireAuth(),
    asyncRoute(patchConveyorStepCompletion),
  )
  r.post(
    '/conveyors/:conveyorId/steps/:stepNodeId/abort',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(postConveyorStepAbort),
  )
  r.post(
    '/conveyors/:conveyorId/steps/:stepNodeId/restore-aborted',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(postConveyorStepRestoreAborted),
  )
  r.get(
    '/conveyors/:conveyorId/steps/:stepNodeId/sequence-check',
    ...auth,
    asyncRoute(getConveyorStepSequenceCheck),
  )
  r.post(
    '/conveyors/:conveyorId/steps/:stepNodeId/assignees',
    requireAuth(),
    requirePermission('conveyors.manage_assignments'),
    asyncRoute(postConveyorStepAssignee),
  )
  r.get(
    '/conveyors/:conveyorId/steps/:stepNodeId/assignees',
    ...auth,
    asyncRoute(getConveyorStepAssignees),
  )
  r.delete(
    '/conveyors/:conveyorId/steps/:stepNodeId/assignees/:assigneeId',
    requireAuth(),
    requirePermission('conveyors.manage_assignments'),
    asyncRoute(deleteConveyorStepAssignee),
  )
  r.post(
    '/conveyors/:conveyorId/steps/:stepNodeId/time-entries/on-behalf',
    requireAuth(),
    requirePermission('time_entries.create_on_behalf'),
    asyncRoute(postConveyorStepTimeEntryOnBehalf),
  )
  r.post(
    '/conveyors/:conveyorId/steps/:stepNodeId/time-entries',
    requireAuth(),
    asyncRoute(postConveyorStepTimeEntry),
  )
  r.get(
    '/conveyors/:conveyorId/steps/:stepNodeId/time-entries',
    requireAuth(),
    asyncRoute(getConveyorStepTimeEntries),
  )
  r.delete(
    '/conveyors/:conveyorId/steps/:stepNodeId/time-entries/:timeEntryId',
    requireAuth(),
    asyncRoute(deleteConveyorStepTimeEntry),
  )
  return r
}
