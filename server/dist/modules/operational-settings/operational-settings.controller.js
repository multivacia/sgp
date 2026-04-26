import { ok } from '../../shared/http/ok.js';
import { createCollaboratorRoleBodySchema, createSectorBodySchema, patchCollaboratorRoleBodySchema, patchSectorBodySchema, uuidParamSchema, } from './operational-settings.schemas.js';
import { serviceCreateCollaboratorFunction, serviceCreateSector, serviceDeleteCollaboratorFunction, serviceDeleteSector, serviceListCollaboratorFunctions, serviceListSectorsAdmin, servicePatchCollaboratorFunction, servicePatchSector, } from './operational-settings.service.js';
function sectorToJson(row) {
    return {
        id: row.id,
        name: row.name,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
    };
}
function roleToJson(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        isActive: row.is_active,
        isCollaboratorFunction: row.is_collaborator_function,
        createdAt: row.created_at.toISOString(),
    };
}
export async function getOperationalSectors(req, res) {
    const pool = req.app.locals.pool;
    const rows = await serviceListSectorsAdmin(pool);
    const data = rows.map(sectorToJson);
    res.json(ok(data, { total: data.length }));
}
export async function postOperationalSector(req, res) {
    const body = createSectorBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const row = await serviceCreateSector(pool, body);
    res.status(201).json(ok(sectorToJson(row)));
}
export async function patchOperationalSector(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const body = patchSectorBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const row = await servicePatchSector(pool, id, body);
    res.json(ok(sectorToJson(row)));
}
export async function deleteOperationalSector(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    await serviceDeleteSector(pool, id);
    res.status(204).send();
}
export async function getOperationalCollaboratorRoles(req, res) {
    const pool = req.app.locals.pool;
    const rows = await serviceListCollaboratorFunctions(pool);
    const data = rows.map(roleToJson);
    res.json(ok(data, { total: data.length }));
}
export async function postOperationalCollaboratorRole(req, res) {
    const body = createCollaboratorRoleBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const row = await serviceCreateCollaboratorFunction(pool, body);
    res.status(201).json(ok(roleToJson(row)));
}
export async function patchOperationalCollaboratorRole(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const body = patchCollaboratorRoleBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const row = await servicePatchCollaboratorFunction(pool, id, body);
    res.json(ok(roleToJson(row)));
}
export async function deleteOperationalCollaboratorRole(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    await serviceDeleteCollaboratorFunction(pool, id);
    res.status(204).send();
}
//# sourceMappingURL=operational-settings.controller.js.map