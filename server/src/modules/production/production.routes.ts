import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import {
  getProductionSession,
  postProductionLogin,
  postProductionLogout,
  postProductionChangePin,
} from './production-auth.controller.js'
import { getProductionCollaborators } from './production-collaborators.controller.js'
import { getProductionWorkQueue } from './production-work-queue.controller.js'
import { postProductionTimeEntry } from './production-time-entries.controller.js'
import { getProductionTimeEntryJustifications } from './production-time-entry-justifications.controller.js'
import {
  getProductionExtraTimeEntryDescriptions,
  postProductionExtraTimeEntry,
} from './production-extra-time-entries.controller.js'
import { getProductionTimeEntryCandidates } from './production-time-entry-candidates.controller.js'
import { postProductionUnassignedTimeEntry } from './production-unassigned-time-entries.controller.js'
import { requireProductionAuth, requireProductionPinChanged } from './production-auth.middleware.js'
import { requireKioskToken } from './production-kiosk.middleware.js'

export function productionRouter(): Router {
  const r = Router()

  r.get('/production/collaborators', requireKioskToken(), asyncRoute(getProductionCollaborators))
  r.post('/production/auth/login', asyncRoute(postProductionLogin))
  r.post('/production/auth/logout', asyncRoute(postProductionLogout))
  r.get(
    '/production/auth/session',
    requireProductionAuth(),
    asyncRoute(getProductionSession),
  )
  r.post(
    '/production/auth/change-pin',
    requireProductionAuth(),
    asyncRoute(postProductionChangePin),
  )
  r.get(
    '/production/me/work-queue',
    requireProductionAuth(),
    requireProductionPinChanged(),
    asyncRoute(getProductionWorkQueue),
  )
  r.post(
    '/production/time-entries',
    requireProductionAuth(),
    requireProductionPinChanged(),
    asyncRoute(postProductionTimeEntry),
  )
  r.get(
    '/production/time-entry-justifications',
    requireProductionAuth(),
    requireProductionPinChanged(),
    asyncRoute(getProductionTimeEntryJustifications),
  )
  r.get(
    '/production/me/extra-time-entry-descriptions',
    requireProductionAuth(),
    requireProductionPinChanged(),
    asyncRoute(getProductionExtraTimeEntryDescriptions),
  )
  r.post(
    '/production/me/extra-time-entries',
    requireProductionAuth(),
    requireProductionPinChanged(),
    asyncRoute(postProductionExtraTimeEntry),
  )
  r.get(
    '/production/me/time-entry-candidates',
    requireProductionAuth(),
    requireProductionPinChanged(),
    asyncRoute(getProductionTimeEntryCandidates),
  )
  r.post(
    '/production/time-entries/unassigned-exception',
    requireProductionAuth(),
    requireProductionPinChanged(),
    asyncRoute(postProductionUnassignedTimeEntry),
  )

  return r
}
