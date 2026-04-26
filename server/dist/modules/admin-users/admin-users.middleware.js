import { findAppUserRoleCodeForGovernance } from '../auth/auth.repository.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { asyncRoute } from '../../shared/asyncRoute.js';
/** Roles com permissão para governança de utilizadores (RBAC). */
export const GOVERNANCE_ROLE_CODES = new Set(['ADMIN', 'GESTOR']);
/**
 * Encadeie após `requireAuth()`.
 * Exige JWT válido + papel ADMIN ou GESTOR + conta ativa e não apagada.
 */
export function requireAdminGovernance() {
    return asyncRoute(async (req, _res, next) => {
        const pool = req.app.locals.pool;
        const uid = req.authUser?.id;
        if (!uid) {
            next(new AppError('Sessão não autenticada. Faça login.', 401, ErrorCodes.UNAUTHORIZED));
            return;
        }
        const code = await findAppUserRoleCodeForGovernance(pool, uid);
        if (!code || !GOVERNANCE_ROLE_CODES.has(code)) {
            next(new AppError('Sem permissão para administrar utilizadores. Apenas perfis ADMIN ou GESTOR.', 403, ErrorCodes.FORBIDDEN));
            return;
        }
        next();
    });
}
//# sourceMappingURL=admin-users.middleware.js.map