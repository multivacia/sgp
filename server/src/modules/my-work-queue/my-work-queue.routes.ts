import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getMyWorkQueue } from './my-work-queue.controller.js'

export function myWorkQueueRouter(): Router {
  const r = Router()
  r.get('/me/work-queue', requireAuth(), asyncRoute(getMyWorkQueue))
  return r
}
