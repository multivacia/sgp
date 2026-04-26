import { ok } from '../../shared/http/ok.js';
import { executiveDashboardQuerySchema, operationalDashboardQuerySchema, } from './dashboard.schemas.js';
import { serviceExecutiveDashboard, serviceOperationalDashboard, } from './dashboard.service.js';
function queryString(v) {
    if (typeof v === 'string')
        return v;
    if (Array.isArray(v) && typeof v[0] === 'string')
        return v[0];
    return undefined;
}
export async function getOperationalDashboard(req, res) {
    const pool = req.app.locals.pool;
    const q = operationalDashboardQuerySchema.parse({
        realizedPeriodPreset: queryString(req.query.realizedPeriodPreset),
    });
    const data = await serviceOperationalDashboard(pool, {
        realizedPeriodPreset: q.realizedPeriodPreset,
    });
    res.json(ok(data));
}
export async function getExecutiveDashboard(req, res) {
    const q = executiveDashboardQuerySchema.parse(req.query);
    const pool = req.app.locals.pool;
    const data = await serviceExecutiveDashboard(pool, q.days);
    res.json(ok(data));
}
//# sourceMappingURL=dashboard.controller.js.map