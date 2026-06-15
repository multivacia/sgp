import type pg from 'pg'
import type { Request } from 'express'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { defaultSessionActivityAtLogin } from '../auth/session-timeout.service.js'
import { signProductionSessionToken } from './production-auth.jwt.js'
import {
  collaboratorActiveForProduction,
  findCollaboratorForProductionAuth,
  findProductionCredentialByCollaboratorId,
  incrementProductionCredentialFailure,
  insertProductionAuthEvent,
  resetProductionCredentialOnSuccess,
} from './production-auth.repository.js'
import { hashProductionPin, verifyProductionPin } from './production-pin.crypto.js'
import {
  updateProductionPinAfterChange,
} from './production-auth.repository.js'
import type { ProductionCollaboratorPublic, ProductionLoginStatus } from './production.types.js'
import { PRODUCTION_JWT_SCOPE } from './production-auth.jwt.js'
import {
  mapCollaboratorToPublic,
  serviceGetProductionCollaboratorPublic,
} from './production-collaborators.service.js'
import type { ProductionLoginBody, ProductionChangePinBody } from './production.schemas.js'
import { PRODUCTION_DEFAULT_INITIAL_PIN } from './production.schemas.js'

const GENERIC_LOGIN_MESSAGE =
  'PIN inválido ou acesso não habilitado.'

const LOCKOUT_MESSAGE =
  'Não foi possível entrar agora. Tente novamente mais tarde.'

export type ProductionLoginResult = {
  token: string
  status: ProductionLoginStatus
  collaborator: ProductionCollaboratorPublic
  scope: typeof PRODUCTION_JWT_SCOPE
  mustChangePin: boolean
}

function requestAuditContext(req: Request): {
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
} {
  const forwarded = req.headers['x-forwarded-for']
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim() ?? null
      : req.ip ?? null
  const ua = req.headers['user-agent']
  return {
    ipAddress: ip,
    userAgent: typeof ua === 'string' ? ua : null,
    requestId:
      typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id']
        : null,
  }
}

async function recordAuthEvent(
  pool: pg.Pool,
  req: Request,
  input: {
    collaboratorId: string | null
    eventType: Parameters<typeof insertProductionAuthEvent>[1]['eventType']
    result: string
    metadataJson?: Record<string, unknown>
  },
): Promise<void> {
  const ctx = requestAuditContext(req)
  await insertProductionAuthEvent(pool, {
    collaboratorId: input.collaboratorId,
    eventType: input.eventType,
    result: input.result,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    metadataJson: input.metadataJson,
  })
}

function assertLoginAllowed(
  collaborator: Awaited<ReturnType<typeof findCollaboratorForProductionAuth>>,
  credential: Awaited<ReturnType<typeof findProductionCredentialByCollaboratorId>>,
): void {
  if (
    !collaborator ||
    !credential ||
    !credential.enabled ||
    !collaboratorActiveForProduction(collaborator)
  ) {
    throw new AppError(
      GENERIC_LOGIN_MESSAGE,
      401,
      ErrorCodes.PRODUCTION_PIN_INVALID,
    )
  }
}

export async function serviceProductionLogin(
  pool: pg.Pool,
  env: Env,
  req: Request,
  body: ProductionLoginBody,
): Promise<ProductionLoginResult> {
  const collaboratorId = body.collaboratorId
  const collaborator = await findCollaboratorForProductionAuth(pool, collaboratorId)
  const credential = await findProductionCredentialByCollaboratorId(
    pool,
    collaboratorId,
  )

  try {
    assertLoginAllowed(collaborator, credential)
  } catch (e) {
    await recordAuthEvent(pool, req, {
      collaboratorId: collaborator ? collaboratorId : null,
      eventType: 'PRODUCTION_LOGIN_FAILURE',
      result: 'rejected',
    })
    throw e
  }

  const cred = credential!
  if (cred.locked_until && cred.locked_until.getTime() > Date.now()) {
    await recordAuthEvent(pool, req, {
      collaboratorId,
      eventType: 'PRODUCTION_LOGIN_FAILURE',
      result: 'locked',
    })
    throw new AppError(
      LOCKOUT_MESSAGE,
      403,
      ErrorCodes.PRODUCTION_PIN_LOCKED,
    )
  }

  const pinOk = await verifyProductionPin(body.pin, cred.pin_hash)
  if (!pinOk) {
    const after = await incrementProductionCredentialFailure(
      pool,
      collaboratorId,
      env.productionPinMaxFailedAttempts,
      env.productionPinLockoutMinutes,
    )
    await recordAuthEvent(pool, req, {
      collaboratorId,
      eventType: 'PRODUCTION_LOGIN_FAILURE',
      result:
        after.lockedUntil && after.lockedUntil.getTime() > Date.now()
          ? 'locked_after_failure'
          : 'invalid_pin',
    })
    if (after.lockedUntil && after.lockedUntil.getTime() > Date.now()) {
      throw new AppError(
        LOCKOUT_MESSAGE,
        403,
        ErrorCodes.PRODUCTION_PIN_LOCKED,
      )
    }
    throw new AppError(
      GENERIC_LOGIN_MESSAGE,
      401,
      ErrorCodes.PRODUCTION_PIN_INVALID,
    )
  }

  await resetProductionCredentialOnSuccess(pool, collaboratorId)
  const activity = defaultSessionActivityAtLogin()
  const token = signProductionSessionToken(collaboratorId, activity, env)
  const publicCollaborator = mapCollaboratorToPublic(collaborator!)
  const mustChangePin = cred.must_change_pin === true
  const status: ProductionLoginStatus = mustChangePin
    ? 'PIN_CHANGE_REQUIRED'
    : 'AUTHENTICATED'

  await recordAuthEvent(pool, req, {
    collaboratorId,
    eventType: 'PRODUCTION_LOGIN_SUCCESS',
    result: mustChangePin ? 'pin_change_required' : 'success',
  })

  return {
    token,
    status,
    collaborator: publicCollaborator,
    scope: PRODUCTION_JWT_SCOPE,
    mustChangePin,
  }
}

export async function serviceProductionLogout(
  pool: pg.Pool,
  req: Request,
  collaboratorId: string | null,
): Promise<void> {
  if (!collaboratorId) return
  await recordAuthEvent(pool, req, {
    collaboratorId,
    eventType: 'PRODUCTION_LOGOUT',
    result: 'success',
  })
}

export async function serviceProductionSession(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<{
  collaborator: ProductionCollaboratorPublic
  scope: typeof PRODUCTION_JWT_SCOPE
  mustChangePin: boolean
}> {
  const collaborator = await serviceGetProductionCollaboratorPublic(
    pool,
    collaboratorId,
  )
  if (!collaborator) {
    throw new AppError(
      'Sessão de produção inválida ou expirada.',
      401,
      ErrorCodes.PRODUCTION_AUTH_INVALID,
    )
  }
  const credential = await findProductionCredentialByCollaboratorId(
    pool,
    collaboratorId,
  )
  if (!credential?.enabled) {
    throw new AppError(
      'Sessão de produção inválida ou expirada.',
      401,
      ErrorCodes.PRODUCTION_AUTH_INVALID,
    )
  }
  if (credential.locked_until && credential.locked_until.getTime() > Date.now()) {
    throw new AppError(
      LOCKOUT_MESSAGE,
      403,
      ErrorCodes.PRODUCTION_PIN_LOCKED,
    )
  }
  return {
    collaborator,
    scope: PRODUCTION_JWT_SCOPE,
    mustChangePin: credential.must_change_pin === true,
  }
}

const CHANGE_PIN_MISMATCH_MESSAGE = 'A confirmação do PIN deve ser igual ao novo PIN.'
const DEFAULT_PIN_MESSAGE =
  'Escolha um PIN diferente do PIN inicial padrão.'

export async function serviceProductionChangePin(
  pool: pg.Pool,
  collaboratorId: string,
  body: ProductionChangePinBody,
): Promise<void> {
  const credential = await findProductionCredentialByCollaboratorId(
    pool,
    collaboratorId,
  )
  if (!credential?.enabled) {
    throw new AppError(
      'Sessão de produção inválida ou expirada.',
      401,
      ErrorCodes.PRODUCTION_AUTH_INVALID,
    )
  }
  if (body.newPin !== body.confirmPin) {
    throw new AppError(
      CHANGE_PIN_MISMATCH_MESSAGE,
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (body.newPin === PRODUCTION_DEFAULT_INITIAL_PIN) {
    throw new AppError(
      DEFAULT_PIN_MESSAGE,
      400,
      ErrorCodes.PRODUCTION_DEFAULT_PIN_NOT_ALLOWED,
    )
  }
  const pinHash = await hashProductionPin(body.newPin)
  await updateProductionPinAfterChange(pool, {
    collaboratorId,
    pinHash,
  })
}
