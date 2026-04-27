import type { NextFunction, Request, Response } from 'express'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ErrorRefs } from '../../shared/errors/errorRefs.js'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { findPermissionCodesForAppUser } from './permissions.repository.js'

async function permissionCodesSetForRequest(
  req: Request,
  pool: pg.Pool,
  userId: string,
): Promise<Set<string>> {
  if (req.appPermissionCodes) {
    return req.appPermissionCodes
  }
  const codes = await findPermissionCodesForAppUser(pool, userId)
  const set = new Set(codes)
  req.appPermissionCodes = set
  return set
}

/**
 * Encadeie após `requireAuth()`.
 * Exige uma permissão explícita (matriz seedada em `app_role_permissions`).
 */
export function requirePermission(permissionCode: string) {
  return asyncRoute(async (req: Request, _res: Response, next: NextFunction) => {
    const pool = req.app.locals.pool as pg.Pool
    const uid = req.authUser?.id
    if (!uid) {
      next(
        new AppError(
          'Sessão não autenticada. Faça login.',
          401,
          ErrorCodes.UNAUTHORIZED,
          undefined,
          {
            errorRef: ErrorRefs.RBAC_UNAUTHENTICATED,
            category: 'AUTH',
            severity: 'warning',
          },
        ),
      )
      return
    }
    const set = await permissionCodesSetForRequest(req, pool, uid)
    if (!set.has(permissionCode)) {
      next(
        new AppError(
          'Sem permissão para esta operação.',
          403,
          ErrorCodes.FORBIDDEN,
          undefined,
          {
            errorRef: ErrorRefs.RBAC_PERMISSION_DENIED,
            category: 'RBAC',
            severity: 'warning',
          },
        ),
      )
      return
    }
    next()
  })
}

/**
 * Encadeie após `requireAuth()`. Basta uma das permissões listadas.
 */
export function requireAnyPermission(...permissionCodes: string[]) {
  const needed = [...new Set(permissionCodes)]
  return asyncRoute(async (req: Request, _res: Response, next: NextFunction) => {
    const pool = req.app.locals.pool as pg.Pool
    const uid = req.authUser?.id
    if (!uid) {
      next(
        new AppError(
          'Sessão não autenticada. Faça login.',
          401,
          ErrorCodes.UNAUTHORIZED,
          undefined,
          {
            errorRef: ErrorRefs.RBAC_UNAUTHENTICATED,
            category: 'AUTH',
            severity: 'warning',
          },
        ),
      )
      return
    }
    const set = await permissionCodesSetForRequest(req, pool, uid)
    if (!needed.some((c) => set.has(c))) {
      next(
        new AppError(
          'Sem permissão para esta operação.',
          403,
          ErrorCodes.FORBIDDEN,
          undefined,
          {
            errorRef: ErrorRefs.RBAC_PERMISSION_DENIED,
            category: 'RBAC',
            severity: 'warning',
          },
        ),
      )
      return
    }
    next()
  })
}
