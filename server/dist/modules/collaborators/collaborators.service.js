import { DatabaseError } from 'pg';
import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { countCollaborators, findCollaboratorById, insertCollaborator, listCollaborators, setCollaboratorStatus, updateCollaborator, } from './collaborators.repository.js';
function isPgError(e) {
    return e instanceof DatabaseError;
}
function empty(s) {
    if (s === undefined || s === null)
        return null;
    const t = s.trim();
    return t === '' ? null : t;
}
export function mapCreateBody(body) {
    const sid = body.sectorId?.trim();
    const rid = body.roleId?.trim();
    return {
        full_name: body.fullName,
        code: empty(body.code),
        registration_code: empty(body.registrationCode),
        nickname: empty(body.nickname),
        email: empty(body.email),
        phone: empty(body.phone),
        job_title: empty(body.jobTitle),
        avatar_url: body.avatarUrl === null ? null : empty(body.avatarUrl),
        sector_id: sid ? sid : null,
        role_id: rid ? rid : null,
        notes: empty(body.notes),
        status: body.status ?? 'ACTIVE',
    };
}
export function mapPatchBody(body) {
    const p = {};
    if (body.fullName !== undefined) {
        p.full_name = body.fullName.trim();
    }
    if (body.code !== undefined)
        p.code = empty(body.code);
    if (body.registrationCode !== undefined) {
        p.registration_code = empty(body.registrationCode);
    }
    if (body.nickname !== undefined)
        p.nickname = empty(body.nickname);
    if (body.email !== undefined)
        p.email = empty(body.email);
    if (body.phone !== undefined)
        p.phone = empty(body.phone);
    if (body.jobTitle !== undefined)
        p.job_title = empty(body.jobTitle);
    if (body.avatarUrl !== undefined) {
        p.avatar_url = body.avatarUrl === null ? null : empty(body.avatarUrl);
    }
    if (body.sectorId !== undefined) {
        p.sector_id = body.sectorId.trim() === '' ? null : body.sectorId.trim();
    }
    if (body.roleId !== undefined) {
        p.role_id = body.roleId.trim() === '' ? null : body.roleId.trim();
    }
    if (body.notes !== undefined)
        p.notes = empty(body.notes);
    if (body.status !== undefined)
        p.status = body.status;
    return p;
}
/** Nomes de constraints/índices únicos em `collaborators` (migration). */
const PG_UNIQUE_COLLABORATOR_CODE = 'idx_collaborators_code_active';
const PG_UNIQUE_COLLABORATOR_EMAIL = 'idx_collaborators_email_active';
const PG_UNIQUE_COLLABORATOR_FULL_NAME = 'idx_collaborators_full_name_unique_not_deleted';
function handlePg(e) {
    if (isPgError(e)) {
        if (e.code === '23505') {
            const c = e.constraint;
            if (c === PG_UNIQUE_COLLABORATOR_CODE) {
                throw new AppError('Já existe um colaborador com este código.', 409, ErrorCodes.CONFLICT);
            }
            if (c === PG_UNIQUE_COLLABORATOR_EMAIL) {
                throw new AppError('Já existe um colaborador com este e-mail.', 409, ErrorCodes.CONFLICT);
            }
            if (c === PG_UNIQUE_COLLABORATOR_FULL_NAME) {
                throw new AppError('Já existe um colaborador com este nome.', 409, ErrorCodes.CONFLICT);
            }
            throw new AppError('Conflito com registro existente.', 409, ErrorCodes.CONFLICT);
        }
        if (e.code === '23503') {
            throw new AppError('Setor ou cargo informado não existe.', 422, ErrorCodes.VALIDATION_ERROR);
        }
        if (e.code === '42P08') {
            throw new AppError('Parâmetros inválidos na operação de estado do colaborador.', 422, ErrorCodes.VALIDATION_ERROR);
        }
    }
    throw e;
}
export async function serviceList(pool, filters) {
    const [data, total] = await Promise.all([
        listCollaborators(pool, filters),
        countCollaborators(pool, filters),
    ]);
    return { data, total };
}
export async function serviceGetById(pool, id) {
    return findCollaboratorById(pool, id);
}
export async function serviceCreate(pool, body) {
    try {
        return await insertCollaborator(pool, mapCreateBody(body));
    }
    catch (e) {
        handlePg(e);
    }
}
export async function servicePatch(pool, id, body) {
    try {
        return await updateCollaborator(pool, id, mapPatchBody(body));
    }
    catch (e) {
        handlePg(e);
    }
}
export async function serviceActivate(pool, id) {
    try {
        return await setCollaboratorStatus(pool, id, 'ACTIVE');
    }
    catch (e) {
        handlePg(e);
    }
}
export async function serviceInactivate(pool, id) {
    try {
        return await setCollaboratorStatus(pool, id, 'INACTIVE');
    }
    catch (e) {
        handlePg(e);
    }
}
//# sourceMappingURL=collaborators.service.js.map