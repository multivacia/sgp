import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { asyncRoute } from '../../shared/asyncRoute.js';
import { findPermissionCodesForAppUser } from './permissions.repository.js';
async function permissionCodesSetForRequest(req, pool, userId) {
    if (req.appPermissionCodes) {
        return req.appPermissionCodes;
    }
    const codes = await findPermissionCodesForAppUser(pool, userId);
    const set = new Set(codes);
    req.appPermissionCodes = set;
    return set;
}
/**
 * Encadeie após `requireAuth()`.
 * Exige uma permissão explícita (matriz seedada em `app_role_permissions`).
 */
export function requirePermission(permissionCode) {
    return asyncRoute(async (req, _res, next) => {
        const pool = req.app.locals.pool;
        const uid = req.authUser?.id;
        if (!uid) {
            next(new AppError('Sessão não autenticada. Faça login.', 401, ErrorCodes.UNAUTHORIZED));
            return;
        }
        const set = await permissionCodesSetForRequest(req, pool, uid);
        if (!set.has(permissionCode)) {
            next(new AppError('Sem permissão para esta operação.', 403, ErrorCodes.FORBIDDEN));
            return;
        }
        next();
    });
}
/**
 * Encadeie após `requireAuth()`. Basta uma das permissões listadas.
 */
export function requireAnyPermission(...permissionCodes) {
    const needed = [...new Set(permissionCodes)];
    return asyncRoute(async (req, _res, next) => {
        const pool = req.app.locals.pool;
        const uid = req.authUser?.id;
        if (!uid) {
            next(new AppError('Sessão não autenticada. Faça login.', 401, ErrorCodes.UNAUTHORIZED));
            return;
        }
        const set = await permissionCodesSetForRequest(req, pool, uid);
        if (!needed.some((c) => set.has(c))) {
            next(new AppError('Sem permissão para esta operação.', 403, ErrorCodes.FORBIDDEN));
            return;
        }
        next();
    });
}
//# sourceMappingURL=permissions.middleware.js.map