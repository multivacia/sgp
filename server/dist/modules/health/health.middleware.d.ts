import type { NextFunction, Request, Response } from 'express';
/** Header com token técnico de infra (produção, quando `HEALTH_INFRA_TOKEN` está definido). */
export declare const HEALTH_INFRA_TOKEN_HEADER = "X-SGP-Infra-Token";
/**
 * Em `NODE_ENV=production`, `GET /health/db` exige:
 * - header `X-SGP-Infra-Token` igual a `HEALTH_INFRA_TOKEN` (se este estiver definido), ou
 * - sessão válida + permissão `system.health_db`.
 * Em development/test o endpoint permanece público (probes locais).
 */
export declare function maybeRequireHealthDbAuth(): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=health.middleware.d.ts.map