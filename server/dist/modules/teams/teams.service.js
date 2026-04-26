import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { listRowToTeamApi, rowToTeamApi, rowToTeamMemberApi, } from './teams.dto.js';
import * as repo from './teams.repository.js';
function isPgUniqueViolation(e) {
    return (typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        e.code === '23505');
}
export async function serviceListTeams(pool, q) {
    const total = await repo.countTeams(pool, q);
    const rows = await repo.listTeams(pool, q);
    return { data: rows.map(listRowToTeamApi), total };
}
export async function serviceGetTeam(pool, id) {
    const row = await repo.findTeamById(pool, id);
    return row ? rowToTeamApi(row) : null;
}
export async function serviceCreateTeam(pool, body) {
    const description = body.description === undefined
        ? null
        : body.description === null
            ? null
            : body.description;
    const row = await repo.insertTeam(pool, {
        name: body.name.trim(),
        description,
        is_active: body.isActive ?? true,
    });
    return rowToTeamApi(row);
}
export async function servicePatchTeam(pool, id, body) {
    const patch = {};
    if (body.name !== undefined)
        patch.name = body.name.trim();
    if (body.description !== undefined) {
        patch.description =
            body.description === null ? null : body.description ?? null;
    }
    if (body.isActive !== undefined)
        patch.is_active = body.isActive;
    return repo.updateTeam(pool, id, patch).then((r) => (r ? rowToTeamApi(r) : null));
}
export async function serviceSemanticDeleteTeam(pool, id) {
    const row = await repo.softDeleteTeam(pool, id);
    return row ? rowToTeamApi(row) : null;
}
/** Retorna `null` se a equipe não existir (404 em camada HTTP). */
export async function serviceListMembers(pool, teamId) {
    const team = await repo.findTeamById(pool, teamId);
    if (!team)
        return null;
    const rows = await repo.listActiveMembersForTeam(pool, teamId);
    return rows.map(rowToTeamMemberApi);
}
function assertCollaboratorActiveForNewMembership(row) {
    if (row.deleted_at != null ||
        !row.is_active ||
        String(row.status).toUpperCase() !== 'ACTIVE') {
        throw new AppError('Só é possível associar colaboradores ativos à equipe.', 400, ErrorCodes.VALIDATION_ERROR);
    }
}
export async function serviceAddMember(pool, teamId, body) {
    const team = await repo.findTeamById(pool, teamId);
    if (!team) {
        throw new AppError('Equipe não encontrada.', 404, ErrorCodes.NOT_FOUND);
    }
    const collab = await repo.findCollaboratorEligibility(pool, body.collaboratorId);
    if (!collab) {
        throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    assertCollaboratorActiveForNewMembership(collab);
    const role = body.role === undefined ? null : body.role === null ? null : body.role;
    const isPrimary = body.isPrimary ?? false;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (isPrimary) {
            await repo.clearPrimaryForTeam(client, teamId);
        }
        const row = await repo.insertTeamMember(client, {
            team_id: teamId,
            collaborator_id: body.collaboratorId,
            role,
            is_primary: isPrimary,
        });
        await client.query('COMMIT');
        return rowToTeamMemberApi(row);
    }
    catch (e) {
        await client.query('ROLLBACK');
        if (isPgUniqueViolation(e)) {
            throw new AppError('Este colaborador já está nesta equipe.', 409, ErrorCodes.CONFLICT);
        }
        throw e;
    }
    finally {
        client.release();
    }
}
export async function servicePatchMember(pool, teamId, memberId, body) {
    const existing = await repo.findMemberById(pool, teamId, memberId);
    if (!existing)
        return null;
    const hasChange = body.role !== undefined ||
        body.isPrimary !== undefined ||
        body.isActive !== undefined;
    if (!hasChange) {
        return rowToTeamMemberApi(existing);
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (body.isPrimary === true) {
            await repo.clearPrimaryForTeam(client, teamId, memberId);
        }
        const patch = {};
        if (body.role !== undefined) {
            patch.role = body.role === null ? null : body.role;
        }
        if (body.isPrimary !== undefined)
            patch.is_primary = body.isPrimary;
        if (body.isActive !== undefined) {
            patch.is_active = body.isActive;
            if (body.isActive === false) {
                patch.is_primary = false;
            }
        }
        const row = await repo.updateTeamMember(client, teamId, memberId, patch);
        await client.query('COMMIT');
        return row ? rowToTeamMemberApi(row) : null;
    }
    catch (e) {
        await client.query('ROLLBACK');
        if (isPgUniqueViolation(e)) {
            throw new AppError('Conflito ao atualizar membro (unicidade).', 409, ErrorCodes.CONFLICT);
        }
        throw e;
    }
    finally {
        client.release();
    }
}
/** `DELETE` semântico: inativa a linha de `team_members`. Idempotente se já inativo. */
export async function serviceSemanticDeleteMember(pool, teamId, memberId) {
    const existing = await repo.findMemberById(pool, teamId, memberId);
    if (!existing) {
        return null;
    }
    if (!existing.is_active) {
        return rowToTeamMemberApi(existing);
    }
    const row = await repo.softDeactivateTeamMember(pool, teamId, memberId);
    return row ? rowToTeamMemberApi(row) : null;
}
//# sourceMappingURL=teams.service.js.map