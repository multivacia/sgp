import type { NextFunction, Request, Response } from 'express'
import type pg from 'pg'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { findPasswordStampForSessionAuth } from './auth.repository.js'
import { verifySessionToken } from './auth.jwt.js'

function getEnv(req: Request): Env {
  const env = req.app.locals.env as Env | undefined
  if (!env) {
    throw new Error('app.locals.env não configurado')
  }
  return env
}

const SESSION_REVOKED_MESSAGE =
  'Sua sessão foi encerrada porque suas credenciais foram alteradas. Faça login novamente.'

/**
 * Exige cookie de sessão JWT válido e não obsoleto face a `password_changed_at`.
 * Preenche `req.authUser` (id + email do token).
 */
export function requireAuth() {
  return asyncRoute(
    async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      const env = getEnv(req)
      const pool = req.app.locals.pool as pg.Pool
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
        next(
          new AppError(
            SESSION_REVOKED_MESSAGE,
            401,
            ErrorCodes.SESSION_REVOKED_CREDENTIALS_CHANGED,
          ),
        )
        return
      }

      req.authUser = { id: payload.sub, email: payload.email }
      next()
    },
  )
}
