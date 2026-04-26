import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { ok } from '../../shared/http/ok.js';
import { conveyorIdParamSchema, patchConveyorDadosBodySchema, patchConveyorStructureBodySchema, } from './conveyors.schemas.js';
import { servicePatchConveyorDados, serviceReplaceConveyorStructure, } from './conveyors.service.js';
export async function patchConveyorDados(req, res) {
    const id = conveyorIdParamSchema.parse(req.params.id);
    const body = patchConveyorDadosBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const data = await servicePatchConveyorDados(pool, id, body);
    if (!data) {
        throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND);
    }
    res.status(200).json(ok(data));
}
export async function patchConveyorStructure(req, res) {
    const id = conveyorIdParamSchema.parse(req.params.id);
    const body = patchConveyorStructureBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const data = await serviceReplaceConveyorStructure(pool, id, body);
    if (!data) {
        throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND);
    }
    res.status(200).json(ok(data));
}
//# sourceMappingURL=conveyors.patch.controller.js.map