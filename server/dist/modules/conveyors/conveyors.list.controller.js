import { ok } from '../../shared/http/ok.js';
import { getConveyorsQuerySchema } from './conveyors.schemas.js';
import { serviceListConveyors } from './conveyors.service.js';
function firstQueryString(v) {
    if (typeof v === 'string')
        return v;
    if (Array.isArray(v) && typeof v[0] === 'string')
        return v[0];
    return undefined;
}
export async function getConveyors(req, res) {
    const q = req.query;
    const query = getConveyorsQuerySchema.parse({
        q: firstQueryString(q.q),
        priority: firstQueryString(q.priority),
        responsible: firstQueryString(q.responsible),
        operationalStatus: firstQueryString(q.operationalStatus),
    });
    const pool = req.app.locals.pool;
    const list = await serviceListConveyors(pool, {
        q: query.q,
        priority: query.priority,
        responsible: query.responsible,
        operationalStatus: query.operationalStatus,
    });
    res.status(200).json(ok(list));
}
//# sourceMappingURL=conveyors.list.controller.js.map