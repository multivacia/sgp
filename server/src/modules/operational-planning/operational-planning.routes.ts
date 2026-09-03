import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  getOperationalPlanningBacklog,
  getOperationalPlanningFactoryIntake,
  getOperationalPlanningWeek,
  getOperationalPlanningWeekActivity,
  getOperationalPlanningWeekExportXlsx,
  patchOperationalPlanningWeek,
  postApplyConveyorPlanToWeekItem,
  postOperationalPlanningWeek,
  postOperationalPlanningWeekPublish,
} from './operational-planning.controller.js'

/** Planejamento semanal: gestão de esteiras (`conveyors.create` cobre o perfil de gestor operacional). */
const authPlanning = [requireAuth(), requirePermission('conveyors.create')]

export function operationalPlanningRouter(): Router {
  const r = Router()
  r.get('/operational-planning/week', ...authPlanning, asyncRoute(getOperationalPlanningWeek))
  r.get(
    '/operational-planning/week/export.xlsx',
    ...authPlanning,
    asyncRoute(getOperationalPlanningWeekExportXlsx),
  )
  r.get(
    '/operational-planning/week-activity',
    ...authPlanning,
    asyncRoute(getOperationalPlanningWeekActivity),
  )
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
  r.post(
    '/operational-planning/week-items/:workPlanItemId/apply-conveyor-plan-values',
    ...authPlanning,
    asyncRoute(postApplyConveyorPlanToWeekItem),
  )
  r.get('/operational-planning/backlog', ...authPlanning, asyncRoute(getOperationalPlanningBacklog))
  r.get(
    '/operational-planning/factory-intake',
    ...authPlanning,
    asyncRoute(getOperationalPlanningFactoryIntake),
  )
  return r
}
