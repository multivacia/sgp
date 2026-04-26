import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { ok } from '../../shared/http/ok.js';
import { createCollaboratorBodySchema, patchCollaboratorBodySchema, } from '../collaborators/collaborators.schemas.js';
import { listAdminCollaboratorsQuerySchema, uuidParamSchema, } from './admin-collaborators.schemas.js';
import { serviceActivateAdmin, serviceCreateAdmin, serviceGetAdminById, serviceInactivateAdmin, serviceListAdmin, servicePatchAdmin, serviceRestoreAdmin, serviceSoftDeleteAdmin, } from './admin-collaborators.service.js';
function queryString(v) {
    if (typeof v === 'string')
        return v;
    if (Array.isArray(v) && typeof v[0] === 'string')
        return v[0];
    return undefined;
}
export async function getAdminCollaborators(req, res) {
    const pool = req.app.locals.pool;
    const q = listAdminCollaboratorsQuerySchema.parse({
        search: queryString(req.query.search),
        sector_id: queryString(req.query.sector_id),
        role_id: queryString(req.query.role_id),
        status: queryString(req.query.status),
        linked_user: queryString(req.query.linked_user),
        deleted: queryString(req.query.deleted),
        limit: queryString(req.query.limit),
        offset: queryString(req.query.offset),
    });
    const { data, total } = await serviceListAdmin(pool, q);
    res.json(ok(data, { total, limit: q.limit, offset: q.offset }));
}
export async function getAdminCollaboratorById(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const row = await serviceGetAdminById(pool, id);
    if (!row) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json(ok(row));
}
export async function postAdminCollaborator(req, res) {
    const body = createCollaboratorBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const created = await serviceCreateAdmin(pool, body);
    res.status(201).json(ok(created));
}
export async function patchAdminCollaborator(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const body = patchCollaboratorBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const updated = await servicePatchAdmin(pool, id, body);
    res.json(ok(updated));
}
export async function postAdminCollaboratorActivate(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const updated = await serviceActivateAdmin(pool, id);
    res.json(ok(updated));
}
export async function postAdminCollaboratorInactivate(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const updated = await serviceInactivateAdmin(pool, id);
    res.json(ok(updated));
}
export async function postAdminCollaboratorSoftDelete(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const updated = await serviceSoftDeleteAdmin(pool, id);
    res.json(ok(updated));
}
export async function postAdminCollaboratorRestore(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const updated = await serviceRestoreAdmin(pool, id);
    res.json(ok(updated));
}
//# sourceMappingURL=admin-collaborators.controller.js.map