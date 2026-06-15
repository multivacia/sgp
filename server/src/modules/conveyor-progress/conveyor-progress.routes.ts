import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import { getConveyorProgress } from './conveyor-progress.controller.js'

export function conveyorProgressRouter(): Router {
  const r = Router()
  r.get(
    '/management/conveyor-progress',
    requireAuth(),
    requirePermission('conveyors.create'),
    asyncRoute(getConveyorProgress),
  )
  return r
}
