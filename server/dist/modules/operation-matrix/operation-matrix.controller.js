import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { ok } from '../../shared/http/ok.js';
import { createMatrixNodeBodySchema, listMatrixItemsQuerySchema, patchMatrixNodeBodySchema, reorderBodySchema, uuidParamSchema, } from './operation-matrix.schemas.js';
import { serviceCreateNode, serviceDeleteNode, serviceDuplicate, serviceGetTree, serviceListSuggestionCatalog, serviceListRootItems, servicePatchNode, serviceReorder, serviceRestoreNode, } from './operation-matrix.service.js';
function queryString(v) {
    if (typeof v === 'string')
        return v;
    if (Array.isArray(v) && typeof v[0] === 'string')
        return v[0];
    return undefined;
}
export async function getMatrixItems(req, res) {
    const pool = req.app.locals.pool;
    const q = listMatrixItemsQuerySchema.parse({
        search: queryString(req.query.search),
        is_active: queryString(req.query.is_active),
    });
    const data = await serviceListRootItems(pool, {
        search: q.search,
        is_active: q.is_active,
    });
    res.json(ok(data, { total: data.length }));
}
export async function getSuggestionCatalog(_req, res) {
    const pool = _req.app.locals.pool;
    const data = await serviceListSuggestionCatalog(pool);
    res.json(ok(data, {
        optionCount: data.options.length,
        areaCount: data.areas.length,
        activityCount: data.activities.length,
    }));
}
export async function getMatrixItemTree(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const tree = await serviceGetTree(pool, id);
    res.json(ok(tree));
}
export async function postMatrixNode(req, res) {
    const body = createMatrixNodeBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const created = await serviceCreateNode(pool, body);
    res.status(201).json(ok(created));
}
export async function patchMatrixNode(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const body = patchMatrixNodeBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const updated = await servicePatchNode(pool, id, body);
    if (!updated) {
        throw new AppError('Nó não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json(ok(updated));
}
export async function deleteMatrixNode(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const result = await serviceDeleteNode(pool, id);
    res.json(ok(result));
}
export async function postMatrixNodeReorder(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const body = reorderBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const updated = await serviceReorder(pool, id, body.direction);
    if (!updated) {
        throw new AppError('Nó não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json(ok(updated));
}
export async function postMatrixNodeDuplicate(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const tree = await serviceDuplicate(pool, id);
    res.status(201).json(ok(tree));
}
export async function postMatrixNodeRestore(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const result = await serviceRestoreNode(pool, id);
    res.json(ok(result));
}
//# sourceMappingURL=operation-matrix.controller.js.map