import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { countAdminCollaborators, findAdminCollaboratorById, listAdminCollaborators, restoreCollaborator, softDeleteCollaborator, } from './admin-collaborators.repository.js';
import { serviceActivate, serviceCreate, serviceInactivate, servicePatch, } from '../collaborators/collaborators.service.js';
function assertNotDeleted(row) {
    if (!row) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    if (row.deletedAt) {
        throw new AppError('Colaborador removido logicamente. Restaure antes de alterar.', 409, ErrorCodes.CONFLICT);
    }
    return row;
}
export async function serviceListAdmin(pool, filters) {
    const [data, total] = await Promise.all([
        listAdminCollaborators(pool, filters),
        countAdminCollaborators(pool, filters),
    ]);
    return { data, total };
}
export async function serviceGetAdminById(pool, id) {
    return findAdminCollaboratorById(pool, id);
}
export async function serviceCreateAdmin(pool, body) {
    const created = await serviceCreate(pool, body);
    const full = await findAdminCollaboratorById(pool, created.id);
    if (!full) {
        throw new AppError('Colaborador criado mas não encontrado.', 500, ErrorCodes.INTERNAL);
    }
    return full;
}
export async function servicePatchAdmin(pool, id, body) {
    const current = await findAdminCollaboratorById(pool, id);
    assertNotDeleted(current);
    const updated = await servicePatch(pool, id, body);
    if (!updated) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    const full = await findAdminCollaboratorById(pool, id);
    if (!full) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return full;
}
export async function serviceActivateAdmin(pool, id) {
    const current = await findAdminCollaboratorById(pool, id);
    assertNotDeleted(current);
    const updated = await serviceActivate(pool, id);
    if (!updated) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    const full = await findAdminCollaboratorById(pool, id);
    if (!full) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return full;
}
export async function serviceInactivateAdmin(pool, id) {
    const current = await findAdminCollaboratorById(pool, id);
    assertNotDeleted(current);
    const updated = await serviceInactivate(pool, id);
    if (!updated) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    const full = await findAdminCollaboratorById(pool, id);
    if (!full) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return full;
}
export async function serviceSoftDeleteAdmin(pool, id) {
    const row = await softDeleteCollaborator(pool, id);
    if (!row) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return row;
}
export async function serviceRestoreAdmin(pool, id) {
    const row = await restoreCollaborator(pool, id);
    if (!row) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return row;
}
//# sourceMappingURL=admin-collaborators.service.js.map