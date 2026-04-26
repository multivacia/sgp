import { ok } from '../../shared/http/ok.js';
import { uuidParamSchema } from '../collaborators/collaborators.schemas.js';
import { serviceGetOperationalJourney } from './operational-journey.service.js';
import { operationalJourneyQuerySchema } from './operational-journey.schemas.js';
function queryString(v) {
    if (typeof v === 'string')
        return v;
    if (Array.isArray(v) && typeof v[0] === 'string')
        return v[0];
    return undefined;
}
export async function getOperationalJourney(req, res) {
    const collaboratorId = uuidParamSchema.parse(req.params.collaboratorId);
    const pool = req.app.locals.pool;
    const q = operationalJourneyQuerySchema.parse({
        periodPreset: queryString(req.query.periodPreset),
        from: queryString(req.query.from),
        to: queryString(req.query.to),
        limit: queryString(req.query.limit),
        conveyorId: queryString(req.query.conveyorId),
    });
    const data = await serviceGetOperationalJourney(pool, { collaboratorId, query: q });
    res.json(ok(data));
}
//# sourceMappingURL=operational-journey.controller.js.map