import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getSectors } from './sectors.controller.js'

export function sectorsRouter(): Router {
  const r = Router()
  r.get('/sectors', requireAuth(), asyncRoute(getSectors))
  return r
}
