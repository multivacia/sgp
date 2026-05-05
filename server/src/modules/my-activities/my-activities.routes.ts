import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import {
  getMyActivities,
  getMyOperationalJourney,
  getTimeEntryCandidates,
} from './my-activities.controller.js'

export function myActivitiesRouter(): Router {
  const r = Router()
  r.get(
    '/me/time-entry-candidates',
    requireAuth(),
    asyncRoute(getTimeEntryCandidates),
  )
  r.get('/my-activities', requireAuth(), asyncRoute(getMyActivities))
  r.get(
    '/my-operational-journey',
    requireAuth(),
    asyncRoute(getMyOperationalJourney),
  )
  return r
}
