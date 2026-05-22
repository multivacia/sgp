import type { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  getConveyorOperationalPlan,
  patchConveyorOperationalPlanItem,
  postConveyorOperationalPlan,
  postConveyorOperationalPlanApprove,
  postConveyorOperationalPlanGenerateItems,
  postConveyorOperationalPlanGenerateItemsPreview,
  postConveyorOperationalPlanItem,
  postConveyorOperationalPlanSendToFactory,
} from './conveyor-operational-plan.controller.js'

const authPlan = [requireAuth(), requirePermission('conveyors.create')]

/** Plano operacional da esteira (R3-S2) — sob `/api/v1/conveyors/:conveyorId/operational-plan`. */
export function registerConveyorOperationalPlanRoutes(r: Router): void {
  r.get(
    '/conveyors/:conveyorId/operational-plan',
    ...authPlan,
    asyncRoute(getConveyorOperationalPlan),
  )
  r.post(
    '/conveyors/:conveyorId/operational-plan',
    ...authPlan,
    asyncRoute(postConveyorOperationalPlan),
  )
  r.post(
    '/conveyors/:conveyorId/operational-plan/:planId/items',
    ...authPlan,
    asyncRoute(postConveyorOperationalPlanItem),
  )
  r.patch(
    '/conveyors/:conveyorId/operational-plan/:planId/items/:itemId',
    ...authPlan,
    asyncRoute(patchConveyorOperationalPlanItem),
  )
  r.post(
    '/conveyors/:conveyorId/operational-plan/:planId/generate-items/preview',
    ...authPlan,
    asyncRoute(postConveyorOperationalPlanGenerateItemsPreview),
  )
  r.post(
    '/conveyors/:conveyorId/operational-plan/:planId/generate-items',
    ...authPlan,
    asyncRoute(postConveyorOperationalPlanGenerateItems),
  )
  r.post(
    '/conveyors/:conveyorId/operational-plan/:planId/approve',
    ...authPlan,
    asyncRoute(postConveyorOperationalPlanApprove),
  )
  r.post(
    '/conveyors/:conveyorId/operational-plan/:planId/send-to-factory',
    ...authPlan,
    asyncRoute(postConveyorOperationalPlanSendToFactory),
  )
}
