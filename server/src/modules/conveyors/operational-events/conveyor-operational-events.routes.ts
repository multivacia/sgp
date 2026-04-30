import { Router } from 'express'
import { asyncRoute } from '../../../shared/asyncRoute.js'
import { requireAuth } from '../../auth/auth.middleware.js'
import { getConveyorOperationalEvents } from './conveyor-operational-events.controller.js'

export function registerConveyorOperationalEventsRoutes(r: Router): void {
  r.get(
    '/conveyors/:id/operational-events',
    requireAuth(),
    asyncRoute(getConveyorOperationalEvents),
  )
}

