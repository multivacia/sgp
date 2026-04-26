import { secureTokenCompare } from '../../shared/crypto/secureTokenCompare.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requirePermission } from '../permissions/permissions.middleware.js';
/** Header com token técnico de infra (produção, quando `HEALTH_INFRA_TOKEN` está definido). */
export const HEALTH_INFRA_TOKEN_HEADER = 'X-SGP-Infra-Token';
/**
 * Em `NODE_ENV=production`, `GET /health/db` exige:
 * - header `X-SGP-Infra-Token` igual a `HEALTH_INFRA_TOKEN` (se este estiver definido), ou
 * - sessão válida + permissão `system.health_db`.
 * Em development/test o endpoint permanece público (probes locais).
 */
export function maybeRequireHealthDbAuth() {
    return (req, res, next) => {
        const env = req.app.locals.env;
        if (env.nodeEnv !== 'production') {
            next();
            return;
        }
        const configured = env.healthInfraToken;
        if (configured) {
            const presented = req.get(HEALTH_INFRA_TOKEN_HEADER)?.trim();
            if (presented && secureTokenCompare(presented, configured)) {
                next();
                return;
            }
        }
        requireAuth()(req, res, (err) => {
            if (err) {
                next(err);
                return;
            }
            requirePermission('system.health_db')(req, res, next);
        });
    };
}
//# sourceMappingURL=health.middleware.js.map