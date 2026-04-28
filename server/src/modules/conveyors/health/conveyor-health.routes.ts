import type { Router } from 'express'
import { asyncRoute } from '../../../shared/asyncRoute.js'
import { requireAuth } from '../../auth/auth.middleware.js'
import {
  getConveyorHealthAnalysisHistory,
  getLatestConveyorHealthAnalysis,
  getConveyorHealthSummary,
  postConveyorHealthAnalysis,
} from './conveyor-health.controller.js'

/**
 * Rotas de análise de saúde (ARGOS).
 * TODO(RBAC): quando existir permissão dedicada, aplicar aqui (hoje só `requireAuth`).
 */
export function registerConveyorHealthRoutes(r: Router): void {
  r.get(
    '/conveyors/health-analysis/summary',
    requireAuth(),
    asyncRoute(getConveyorHealthSummary),
  )
  r.get(
    '/conveyors/:id/health-analysis/latest',
    requireAuth(),
    asyncRoute(getLatestConveyorHealthAnalysis),
  )
  r.get(
    '/conveyors/:id/health-analysis/history',
    requireAuth(),
    asyncRoute(getConveyorHealthAnalysisHistory),
  )
  r.post('/conveyors/:id/health-analysis', requireAuth(), asyncRoute(postConveyorHealthAnalysis))
}
