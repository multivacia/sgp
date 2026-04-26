import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  deleteConveyorStepAssignee,
  deleteConveyorStepTimeEntry,
  getConveyorStepAssignees,
  getConveyorStepTimeEntries,
  postConveyorStepAssignee,
  postConveyorStepTimeEntry,
  postConveyorStepTimeEntryOnBehalf,
} from './conveyorAssignments.controller.js'

const auth = [requireAuth()]

export function conveyorAssignmentsRouter(): Router {
  const r = Router()
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
