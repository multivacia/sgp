import type { Request, Response } from 'express'
import type { Logger } from 'pino'
import type pg from 'pg'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import { changePasswordBodySchema, loginBodySchema } from './auth.schemas.js'
import { authCookieOptions, clearAuthCookieOptions } from './auth.cookies.js'
import { signSessionToken } from './auth.jwt.js'
import { defaultSessionActivityAtLogin } from './session-timeout.service.js'
import { buildSessionIdlePolicy } from './session-idle-policy.service.js'
import { serviceChangePassword, serviceGetMe, serviceLogin } from './auth.service.js'
import { findPasswordStampForSessionAuth } from './auth.repository.js'

function getEnv(req: Request): Env {
  return req.app.locals.env as Env
}

function cookieOptions(env: Env) {
  return authCookieOptions(env)
}

export async function postLogin(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const env = getEnv(req)
  const logger = req.app.locals.logger as Logger
  const body = loginBodySchema.parse(req.body)
  try {
    const { user, token } = await serviceLogin(pool, env, body.email, body.password)
    res.cookie(env.authCookieName, token, cookieOptions(env))
    const sessionIdle = await buildSessionIdlePolicy(
      pool,
      defaultSessionActivityAtLogin(),
      logger,
    )
    res.status(200).json(ok({ user, sessionIdle }))
  } catch (e) {
    if (e instanceof AppError) {
      if (e.statusCode === 401) {
        logger.warn({ code: e.code }, 'auth_login_denied')
      } else if (e.statusCode === 403) {
        logger.warn(
          { code: e.code },
          e.code === ErrorCodes.ACCOUNT_TEMPORARILY_LOCKED
            ? 'auth_login_temporarily_locked'
            : 'auth_login_inactive',
        )
      }
    }
    throw e
  }
}

export async function postLogout(req: Request, res: Response): Promise<void> {
  const env = getEnv(req)
  res.clearCookie(env.authCookieName, clearAuthCookieOptions(env))
  res.status(204).end()
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const logger = req.app.locals.logger as Logger
  try {
    const user = await serviceGetMe(pool, req.authUser!.id)
    const activity = req.sessionActivity ?? defaultSessionActivityAtLogin()
    const sessionIdle = await buildSessionIdlePolicy(pool, activity, logger)
    res.json(ok({ user, sessionIdle }))
  } catch (e) {
    if (e instanceof AppError && e.statusCode === 403) {
      logger.warn({ code: e.code }, 'auth_me_inactive')
    }
    throw e
  }
}

export async function postChangePassword(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const env = getEnv(req)
  const body = changePasswordBodySchema.parse(req.body)
  const user = await serviceChangePassword(
    pool,
    req.authUser!.id,
    body.currentPassword,
    body.newPassword,
  )
  const stamp = await findPasswordStampForSessionAuth(pool, user.userId)
  const pwdStampMs =
    stamp.found && stamp.passwordChangedAt != null
      ? stamp.passwordChangedAt.getTime()
      : 0
  const token = signSessionToken(
    user.userId,
    user.email,
    pwdStampMs,
    defaultSessionActivityAtLogin(),
    env,
  )
  res.cookie(env.authCookieName, token, cookieOptions(env))
  const sessionIdle = await buildSessionIdlePolicy(
    pool,
    defaultSessionActivityAtLogin(),
    req.app.locals.logger as Logger,
  )
  res.json(ok({ user, sessionIdle }))
}
