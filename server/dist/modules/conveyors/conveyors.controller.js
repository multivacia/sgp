import { ok } from '../../shared/http/ok.js';
import { postConveyorBodySchema } from './conveyors.schemas.js';
import { serviceCreateConveyor } from './conveyors.service.js';
export async function postConveyor(req, res) {
    const body = postConveyorBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const created = await serviceCreateConveyor(pool, body);
    res.status(201).json(ok(created));
}
//# sourceMappingURL=conveyors.controller.js.map