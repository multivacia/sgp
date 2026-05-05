import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import {
  getMyExtraTimeEntries,
  getMyExtraTimeEntryDescriptions,
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
  r.get('/me/extra-time-entries', requireAuth(), asyncRoute(getMyExtraTimeEntries))
  r.post('/me/extra-time-entries', requireAuth(), asyncRoute(postMyExtraTimeEntry))
  r.get('/my-activities', requireAuth(), asyncRoute(getMyActivities))
  r.get(
    '/my-operational-journey',
    requireAuth(),
    asyncRoute(getMyOperationalJourney),
  )
  return r
}
