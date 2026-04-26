import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getRoles } from './roles.controller.js'

export function rolesRouter(): Router {
  const r = Router()
  r.get('/roles', requireAuth(), asyncRoute(getRoles))
  return r
}
