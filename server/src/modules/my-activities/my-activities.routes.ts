import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import { patchExtraTimeEntry, deleteExtraTimeEntry } from './extra-time-entry-corrections.controller.js'
import {
  getMyExtraTimeEntries,
  getMyExtraTimeEntryDescriptions,
  getMyTimeEntryJustifications,
  getMyActivities,
  getMyOperationalJourney,
  postMyExtraTimeEntry,
  getTimeEntryCandidates,
} from './my-activities.controller.js'

export function myActivitiesRouter(): Router {
  const r = Router()
  r.get(
    '/me/time-entry-candidates',
    requireAuth(),
    asyncRoute(getTimeEntryCandidates),
  )
  r.get(
    '/me/extra-time-entry-descriptions',
    requireAuth(),
    asyncRoute(getMyExtraTimeEntryDescriptions),
  )
  r.get(
    '/me/time-entry-justifications',
    requireAuth(),
    asyncRoute(getMyTimeEntryJustifications),
  )
  r.get('/me/extra-time-entries', requireAuth(), asyncRoute(getMyExtraTimeEntries))
  r.post('/me/extra-time-entries', requireAuth(), asyncRoute(postMyExtraTimeEntry))
  r.patch(
    '/extra-time-entries/:timeEntryId',
    requireAuth(),
    requirePermission('time_entries.edit_any'),
    asyncRoute(patchExtraTimeEntry),
  )
  r.delete(
    '/extra-time-entries/:timeEntryId',
    requireAuth(),
    requirePermission('time_entries.delete_any'),
    asyncRoute(deleteExtraTimeEntry),
  )
  r.get('/my-activities', requireAuth(), asyncRoute(getMyActivities))
  r.get(
    '/my-operational-journey',
    requireAuth(),
    asyncRoute(getMyOperationalJourney),
  )
  return r
}
