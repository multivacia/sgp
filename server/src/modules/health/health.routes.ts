import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { getHealth, getHealthDb } from './health.controller.js'
import { maybeRequireHealthDbAuth } from './health.middleware.js'

export function healthRouter(): Router {
  const r = Router()
  r.get('/health', asyncRoute(getHealth))
  r.get('/health/db', maybeRequireHealthDbAuth(), asyncRoute(getHealthDb))
  return r
}
