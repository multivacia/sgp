import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { ok } from '../../shared/http/ok.js';
import { conveyorIdParamSchema } from './conveyors.schemas.js';
import { serviceGetConveyorById } from './conveyors.service.js';
export async function getConveyorById(req, res) {
    const id = conveyorIdParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const data = await serviceGetConveyorById(pool, id);
    if (!data) {
        throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND);
    }
    res.status(200).json(ok(data));
}
//# sourceMappingURL=conveyors.detail.controller.js.map