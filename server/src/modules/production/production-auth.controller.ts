import type { Request, Response } from 'express'
import type pg from 'pg'
import type { Logger } from 'pino'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ok } from '../../shared/http/ok.js'
import { productionLoginBodySchema, productionChangePinBodySchema } from './production.schemas.js'
import {
  productionAuthCookieOptions,
  clearProductionAuthCookieOptions,
} from './production-auth.cookies.js'
import {
  serviceProductionLogin,
  serviceProductionLogout,
  serviceProductionSession,
  serviceProductionChangePin,
} from './production-auth.service.js'
import { tryReadProductionSession } from './production-auth.middleware.js'

function getEnv(req: Request): Env {
  return req.app.locals.env as Env
}

export async function postProductionLogin(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const env = getEnv(req)
  const logger = req.app.locals.logger as Logger
  const body = productionLoginBodySchema.parse(req.body)
  try {
    const result = await serviceProductionLogin(pool, env, req, body)
    res.cookie(
      env.productionAuthCookieName,
      result.token,
      productionAuthCookieOptions(env),
    )
    res.status(200).json(
      ok({
        status: result.status,
        collaborator: result.collaborator,
        scope: result.scope,
        mustChangePin: result.mustChangePin,
      }),
    )
  } catch (e) {
    if (e instanceof AppError && e.statusCode >= 400 && e.statusCode < 500) {
      logger.warn(
        { code: e.code, collaboratorId: body.collaboratorId },
        'production_login_denied',
      )
    }
    throw e
  }
}

export async function postProductionLogout(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const env = getEnv(req)
  const collaboratorId = tryReadProductionSession(req)
  await serviceProductionLogout(pool, req, collaboratorId)
  res.clearCookie(
    env.productionAuthCookieName,
    clearProductionAuthCookieOptions(env),
  )
  res.status(204).end()
}

export async function getProductionSession(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const session = req.productionSession!
  const data = await serviceProductionSession(pool, session.collaboratorId)
  res.json(ok(data))
}

export async function postProductionChangePin(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const session = req.productionSession!
  const body = productionChangePinBodySchema.parse(req.body)
  await serviceProductionChangePin(pool, session.collaboratorId, body)
  res.status(204).end()
}
