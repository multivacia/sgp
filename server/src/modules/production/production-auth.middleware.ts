import type { NextFunction, Request, Response } from 'express'
import type pg from 'pg'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { resolveSessionActivityFromPayload } from '../auth/session-timeout.service.js'
import {
  productionAuthCookieOptions,
  clearProductionAuthCookieOptions,
} from './production-auth.cookies.js'
import {
  signProductionSessionToken,
  verifyProductionSessionToken,
} from './production-auth.jwt.js'
import { isProductionSessionExpired } from './production-session-timeout.js'
import {
  collaboratorActiveForProduction,
  findCollaboratorForProductionAuth,
  findProductionCredentialByCollaboratorId,
} from './production-auth.repository.js'

function getEnv(req: Request): Env {
  const env = req.app.locals.env as Env | undefined
  if (!env) {
    throw new Error('app.locals.env não configurado')
  }
  return env
}

function expireProductionSession(_req: Request, res: Response, env: Env): void {
  res.clearCookie(env.productionAuthCookieName, clearProductionAuthCookieOptions(env))
}

const SESSION_EXPIRED_MESSAGE =
  'Sua sessão de produção expirou. Selecione seu nome e informe o PIN novamente.'

/**
 * Exige cookie `sgp_production_auth` com JWT `scope=PRODUCTION_MODE`.
 * Não lê o cookie administrativo nem preenche `req.authUser`.
 */
export function requireProductionAuth() {
  return asyncRoute(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const env = getEnv(req)
      const pool = req.app.locals.pool as pg.Pool
      const token = req.cookies?.[env.productionAuthCookieName] as string | undefined
      if (!token) {
        next(
          new AppError(
            'Sessão de produção não autenticada.',
            401,
            ErrorCodes.PRODUCTION_AUTH_REQUIRED,
          ),
        )
        return
      }

      let payload: ReturnType<typeof verifyProductionSessionToken>
      try {
        payload = verifyProductionSessionToken(token, env.productionJwtSecret)
      } catch {
        expireProductionSession(req, res, env)
        next(
          new AppError(
            SESSION_EXPIRED_MESSAGE,
            401,
            ErrorCodes.PRODUCTION_AUTH_INVALID,
          ),
        )
        return
      }

      if (isProductionSessionExpired(payload, env)) {
        expireProductionSession(req, res, env)
        next(
          new AppError(
            SESSION_EXPIRED_MESSAGE,
            401,
            ErrorCodes.SESSION_EXPIRED,
          ),
        )
        return
      }

      const collaborator = await findCollaboratorForProductionAuth(pool, payload.sub)
      if (!collaboratorActiveForProduction(collaborator)) {
        expireProductionSession(req, res, env)
        next(
          new AppError(
            'Acesso de produção indisponível para este colaborador.',
            401,
            ErrorCodes.PRODUCTION_ACCESS_DISABLED,
          ),
        )
        return
      }

      const credential = await findProductionCredentialByCollaboratorId(
        pool,
        payload.sub,
      )
      if (!credential?.enabled) {
        expireProductionSession(req, res, env)
        next(
          new AppError(
            'Acesso de produção indisponível para este colaborador.',
            401,
            ErrorCodes.PRODUCTION_ACCESS_DISABLED,
          ),
        )
        return
      }

      if (credential.locked_until && credential.locked_until.getTime() > Date.now()) {
        expireProductionSession(req, res, env)
        next(
          new AppError(
            'Não foi possível entrar agora. Tente novamente mais tarde.',
            403,
            ErrorCodes.PRODUCTION_PIN_LOCKED,
          ),
        )
        return
      }

      const nowMs = Date.now()
      const activity = resolveSessionActivityFromPayload(payload, nowMs)
      const refreshedActivity = {
        authenticatedAtMs: activity.authenticatedAtMs,
        lastActivityAtMs: nowMs,
      }
      const shouldRefreshToken =
        refreshedActivity.lastActivityAtMs !== payload.lastActMs ||
        refreshedActivity.authenticatedAtMs !== payload.authAtMs
      if (shouldRefreshToken) {
        const refreshedToken = signProductionSessionToken(
          payload.sub,
          refreshedActivity,
          env,
        )
        res.cookie(
          env.productionAuthCookieName,
          refreshedToken,
          productionAuthCookieOptions(env),
        )
      }

      req.productionSession = {
        collaboratorId: payload.sub,
        scope: 'PRODUCTION_MODE',
        authAtMs: refreshedActivity.authenticatedAtMs,
        lastActMs: refreshedActivity.lastActivityAtMs,
      }
      next()
    },
  )
}

const PIN_CHANGE_REQUIRED_MESSAGE =
  'Troque seu PIN de produção para continuar.'

/**
 * Bloqueia fila/apontamentos enquanto `must_change_pin = true`.
 * Deve ser usado após `requireProductionAuth`.
 */
export function requireProductionPinChanged() {
  return asyncRoute(
    async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      const pool = req.app.locals.pool as pg.Pool
      const session = req.productionSession
      if (!session) {
        next(
          new AppError(
            'Sessão de produção não autenticada.',
            401,
            ErrorCodes.PRODUCTION_AUTH_REQUIRED,
          ),
        )
        return
      }
      const credential = await findProductionCredentialByCollaboratorId(
        pool,
        session.collaboratorId,
      )
      if (credential?.must_change_pin === true) {
        next(
          new AppError(
            PIN_CHANGE_REQUIRED_MESSAGE,
            403,
            ErrorCodes.PRODUCTION_PIN_CHANGE_REQUIRED,
          ),
        )
        return
      }
      next()
    },
  )
}

/**
 * Lê sessão de produção se presente, sem exigir autenticação (logout idempotente).
 */
export function tryReadProductionSession(
  req: Request,
): string | null {
  const env = getEnv(req)
  const token = req.cookies?.[env.productionAuthCookieName] as string | undefined
  if (!token) return null
  try {
    const payload = verifyProductionSessionToken(token, env.productionJwtSecret)
    return payload.sub
  } catch {
    return null
  }
}
