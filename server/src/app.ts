import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import type { Logger } from 'pino'
import type pg from 'pg'
import type { Env } from './config/env.js'
import { corsOptions } from './config/cors.js'
import { adminAuditRouter } from './modules/admin-audit/admin-audit.routes.js'
import { adminUsersRouter } from './modules/admin-users/admin-users.routes.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { collaboratorsRouter } from './modules/collaborators/collaborators.routes.js'
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js'
import { conveyorAssignmentsRouter } from './modules/conveyors/conveyorAssignments.routes.js'
import { createArgosDocumentDraftAdapter } from './modules/argos-integration/createArgosDocumentDraftAdapter.js'
import { conveyorsRouter } from './modules/conveyors/conveyors.routes.js'
import { myActivitiesRouter } from './modules/my-activities/my-activities.routes.js'
import { operationalSettingsRouter } from './modules/operational-settings/operational-settings.routes.js'
import { operationMatrixRouter } from './modules/operation-matrix/operation-matrix.routes.js'
import { healthRouter } from './modules/health/health.routes.js'
import { rbacRouter } from './modules/rbac/rbac.routes.js'
import { rolesRouter } from './modules/roles/roles.routes.js'
import { sectorsRouter } from './modules/sectors/sectors.routes.js'
import { supportRouter } from './modules/support/support.routes.js'
import { teamsRouter } from './modules/teams/teams.routes.js'
import { errorHandler } from './shared/errors/errorHandler.js'
import { notFoundHandler } from './shared/http/notFound.js'

export function createApp(pool: pg.Pool, logger: Logger, env: Env): Express {
  const app = express()
  app.locals.pool = pool
  app.locals.logger = logger
  app.locals.env = env

  app.use(cors(corsOptions(env.corsOrigin)))
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))

  app.use('/api/v1', healthRouter())
  app.use('/api/v1', authRouter())
  app.use('/api/v1', adminAuditRouter())
  app.use('/api/v1', adminUsersRouter())
  app.use('/api/v1', operationalSettingsRouter())
  app.use('/api/v1', rbacRouter())
  app.use('/api/v1', rolesRouter())
  app.use('/api/v1', sectorsRouter())
  app.use('/api/v1', teamsRouter())
  app.use('/api/v1', collaboratorsRouter())
  app.use('/api/v1', operationMatrixRouter())
  app.locals.argosDocumentDraftAdapter = createArgosDocumentDraftAdapter(env)
  app.use('/api/v1', conveyorsRouter(env))
  app.use('/api/v1', conveyorAssignmentsRouter())
  app.use('/api/v1', myActivitiesRouter())
  app.use('/api/v1', dashboardRouter())
  app.use('/api/v1', supportRouter())

  app.use(notFoundHandler)
  app.use(errorHandler(logger))

  return app
}
