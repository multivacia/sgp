import type { NextFunction, Request, Response } from 'express'
import type pg from 'pg'
import type { Logger } from 'pino'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { getSessionIdleTimeoutMinutes } from '../system-settings/system-settings.service.js'
import { authCookieOptions, clearAuthCookieOptions } from './auth.cookies.js'
import { findPasswordStampForSessionAuth } from './auth.repository.js'
import { signSessionToken, verifySessionToken } from './auth.jwt.js'
import {
  getSessionAbsoluteTimeoutHours,
  isSessionExpiredByAbsoluteLimit,
  isSessionExpiredByIdle,
  resolveSessionActivityFromPayload,
} from './session-timeout.service.js'

function getEnv(req: Request): Env {
  const env = req.app.locals.env as Env | undefined
  if (!env) {
    throw new Error('app.locals.env não configurado')
  }
  return env
}

const SESSION_REVOKED_MESSAGE =
  'Sua sessão foi encerrada porque suas credenciais foram alteradas. Faça login novamente.'

const SESSION_EXPIRED_MESSAGE =
  'Sua sessão expirou. Faça login novamente.'

function expireSession(
  _req: Request,
  res: Response,
  env: Env,
): void {
  res.clearCookie(env.authCookieName, clearAuthCookieOptions(env))
}

/**
 * Exige cookie de sessão JWT válido e não obsoleto face a `password_changed_at`.
 * Preenche `req.authUser` (id + email do token).
 */
export function requireAuth() {
  return asyncRoute(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const env = getEnv(req)
      const pool = req.app.locals.pool as pg.Pool
      const logger = req.app.locals.logger as Logger | undefined
      const token = req.cookies?.[env.authCookieName] as string | undefined
      if (!token) {
        next(
          new AppError(
            'Sessão não autenticada. Faça login.',
            401,
            ErrorCodes.UNAUTHORIZED,
          ),
        )
        return
      }
      let payload: ReturnType<typeof verifySessionToken>
      try {
        payload = verifySessionToken(token, env.jwtSecret)
      } catch {
        expireSession(req, res, env)
        next(
          new AppError(
            'Sessão expirada ou inválida. Faça login novamente.',
            401,
            ErrorCodes.UNAUTHORIZED,
          ),
        )
        return
      }

      const stamp = await findPasswordStampForSessionAuth(pool, payload.sub)
      if (!stamp.found) {
        expireSession(req, res, env)
        next(
          new AppError(
            'Sessão expirada ou inválida. Faça login novamente.',
            401,
            ErrorCodes.UNAUTHORIZED,
          ),
        )
        return
      }

      const dbPwdMs =
        stamp.passwordChangedAt != null
          ? stamp.passwordChangedAt.getTime()
          : 0
      if (dbPwdMs > payload.pwdStampMs) {
        expireSession(req, res, env)
        next(
          new AppError(
            SESSION_REVOKED_MESSAGE,
            401,
            ErrorCodes.SESSION_REVOKED_CREDENTIALS_CHANGED,
          ),
        )
        return
      }

      const nowMs = Date.now()
      const activity = resolveSessionActivityFromPayload(payload, nowMs)
      const idleTimeoutMinutes = await getSessionIdleTimeoutMinutes(pool, logger)
      const absoluteTimeoutHours = getSessionAbsoluteTimeoutHours(env)

      if (
        isSessionExpiredByIdle(activity.lastActivityAtMs, idleTimeoutMinutes, nowMs) ||
        isSessionExpiredByAbsoluteLimit(
          activity.authenticatedAtMs,
          absoluteTimeoutHours,
          nowMs,
        )
      ) {
        expireSession(req, res, env)
        next(
          new AppError(
            SESSION_EXPIRED_MESSAGE,
            401,
            ErrorCodes.SESSION_EXPIRED,
          ),
        )
        return
      }

      const refreshedActivity = {
        authenticatedAtMs: activity.authenticatedAtMs,
        lastActivityAtMs: nowMs,
      }
      const shouldRefreshToken =
        refreshedActivity.lastActivityAtMs !== payload.lastActMs ||
        refreshedActivity.authenticatedAtMs !== payload.authAtMs
      if (shouldRefreshToken) {
        const refreshedToken = signSessionToken(
          payload.sub,
          payload.email,
          payload.pwdStampMs,
          refreshedActivity,
          env,
        )
        res.cookie(env.authCookieName, refreshedToken, authCookieOptions(env))
      }

      req.authUser = { id: payload.sub, email: payload.email }
      req.sessionActivity = refreshedActivity
      next()
    },
  )
}
