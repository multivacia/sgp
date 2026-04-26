import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { ok } from '../../shared/http/ok.js';
import { conveyorIdParamSchema, patchConveyorStatusBodySchema, } from './conveyors.schemas.js';
import { servicePatchConveyorStatus } from './conveyors.service.js';
export async function patchConveyorStatus(req, res) {
    const id = conveyorIdParamSchema.parse(req.params.id);
    const body = patchConveyorStatusBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const data = await servicePatchConveyorStatus(pool, id, body.operationalStatus);
    if (!data) {
        throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND);
    }
    res.status(200).json(ok(data));
}
//# sourceMappingURL=conveyors.status.controller.js.map