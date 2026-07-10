import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { getVersion } from './version.controller.js'

export function versionRouter(): Router {
  const router = Router()
  router.get('/version', asyncRoute(getVersion))
  return router
}
