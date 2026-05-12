import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  getOperationalPlanningBacklog,
  getOperationalPlanningWeek,
  patchOperationalPlanningWeek,
  postOperationalPlanningWeek,
  postOperationalPlanningWeekPublish,
} from './operational-planning.controller.js'

/** Planejamento semanal: gestão de esteiras (`conveyors.create` cobre o perfil de gestor operacional). */
const authPlanning = [requireAuth(), requirePermission('conveyors.create')]

export function operationalPlanningRouter(): Router {
  const r = Router()
  r.get('/operational-planning/week', ...authPlanning, asyncRoute(getOperationalPlanningWeek))
  r.post('/operational-planning/week', ...authPlanning, asyncRoute(postOperationalPlanningWeek))
  r.patch(
    '/operational-planning/week/:planId',
    ...authPlanning,
    asyncRoute(patchOperationalPlanningWeek),
  )
  r.post(
    '/operational-planning/week/:planId/publish',
    ...authPlanning,
    asyncRoute(postOperationalPlanningWeekPublish),
  )
  r.get('/operational-planning/backlog', ...authPlanning, asyncRoute(getOperationalPlanningBacklog))
  return r
}
