import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  deleteExtraTimeEntryDescription,
  deleteCollaboratorCapacity,
  deleteOperationalCollaboratorRole,
  deleteOperationalSector,
  getExtraTimeEntryDescriptions,
  getTimeEntryJustifications,
  getCollaboratorCapacity,
  getOperationalCapacitySettings,
  getOperationalCollaboratorRoles,
  getOperationalSectors,
  postExtraTimeEntryDescription,
  postTimeEntryJustification,
  putCollaboratorCapacity,
  putOperationalCapacitySettings,
  putExtraTimeEntryDescription,
  patchTimeEntryJustification,
  patchTimeEntryJustificationActivate,
  patchTimeEntryJustificationDeactivate,
  getStepAbortReasons,
  postStepAbortReason,
  patchStepAbortReason,
  patchStepAbortReasonActivate,
  patchStepAbortReasonDeactivate,
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

  r.get(
    '/operational-settings/extra-time-entry-descriptions',
    ...ap(m),
    asyncRoute(getExtraTimeEntryDescriptions),
  )
  r.post(
    '/operational-settings/extra-time-entry-descriptions',
    ...ap(m),
    asyncRoute(postExtraTimeEntryDescription),
  )
  r.put(
    '/operational-settings/extra-time-entry-descriptions/:id',
    ...ap(m),
    asyncRoute(putExtraTimeEntryDescription),
  )
  r.delete(
    '/operational-settings/extra-time-entry-descriptions/:id',
    ...ap(m),
    asyncRoute(deleteExtraTimeEntryDescription),
  )

  r.get(
    '/admin/operational-settings/time-entry-justifications',
    ...ap(m),
    asyncRoute(getTimeEntryJustifications),
  )
  r.post(
    '/admin/operational-settings/time-entry-justifications',
    ...ap(m),
    asyncRoute(postTimeEntryJustification),
  )
  r.patch(
    '/admin/operational-settings/time-entry-justifications/:id',
    ...ap(m),
    asyncRoute(patchTimeEntryJustification),
  )
  r.patch(
    '/admin/operational-settings/time-entry-justifications/:id/activate',
    ...ap(m),
    asyncRoute(patchTimeEntryJustificationActivate),
  )
  r.patch(
    '/admin/operational-settings/time-entry-justifications/:id/deactivate',
    ...ap(m),
    asyncRoute(patchTimeEntryJustificationDeactivate),
  )

  r.get(
    '/admin/operational-settings/step-abort-reasons',
    ...ap(m),
    asyncRoute(getStepAbortReasons),
  )
  r.post(
    '/admin/operational-settings/step-abort-reasons',
    ...ap(m),
    asyncRoute(postStepAbortReason),
  )
  r.patch(
    '/admin/operational-settings/step-abort-reasons/:code/activate',
    ...ap(m),
    asyncRoute(patchStepAbortReasonActivate),
  )
  r.patch(
    '/admin/operational-settings/step-abort-reasons/:code/deactivate',
    ...ap(m),
    asyncRoute(patchStepAbortReasonDeactivate),
  )
  r.patch(
    '/admin/operational-settings/step-abort-reasons/:code',
    ...ap(m),
    asyncRoute(patchStepAbortReason),
  )

  return r
}
