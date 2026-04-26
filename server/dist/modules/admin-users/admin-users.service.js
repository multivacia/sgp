import { DatabaseError } from 'pg';
import { insertAdminAuditEvent } from '../admin-audit/admin-audit.repository.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { generateTemporaryPassword } from '../../shared/password/generateTemporaryPassword.js';
import { hashPassword } from '../../shared/password/password.js';
import { assertCollaboratorEligibleForLink, countActiveUsersWithoutCollaboratorLink, countAdminUsers, findAdminUserById, insertAppUser, listAdminUsers, listEligibleCollaboratorsForLink, patchAppUser, restoreUser, roleExists, resetAdminUserPasswordHash, setAppUserPasswordExplicit, setForcePasswordChange, setUserActive, softDeleteUser, } from './admin-users.repository.js';
function isPgError(e) {
    return e instanceof DatabaseError;
}
const PG_UNIQUE_EMAIL = 'idx_app_users_email_lower';
const PG_UNIQUE_COLLABORATOR = 'idx_app_users_collaborator_id_unique';
async function withTransaction(pool, fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
export async function serviceCollaboratorLinkageSummary(pool) {
    const unlinkedActiveUserCount = await countActiveUsersWithoutCollaboratorLink(pool);
    return { unlinkedActiveUserCount };
}
function handlePg(e) {
    if (isPgError(e)) {
        if (e.code === '23505') {
            const c = e.constraint;
            if (c === PG_UNIQUE_EMAIL) {
                throw new AppError('Já existe um utilizador com este e-mail.', 409, ErrorCodes.CONFLICT);
            }
            if (c === PG_UNIQUE_COLLABORATOR) {
                throw new AppError('Este colaborador já está vinculado a outro utilizador.', 409, ErrorCodes.CONFLICT);
            }
            throw new AppError('Conflito com registro existente.', 409, ErrorCodes.CONFLICT);
        }
        if (e.code === '23503') {
            throw new AppError('Papel ou colaborador informado não existe.', 422, ErrorCodes.VALIDATION_ERROR);
        }
    }
    throw e;
}
function emptyUrl(s) {
    if (s === undefined || s === null)
        return null;
    const t = s.trim();
    return t === '' ? null : t;
}
function normEmail(e) {
    return e.trim().toLowerCase();
}
function projectAfterPatch(existing, body) {
    const mustChangePassword = body.password !== undefined
        ? false
        : body.mustChangePassword !== undefined
            ? body.mustChangePassword
            : existing.mustChangePassword;
    return {
        ...existing,
        email: body.email !== undefined ? normEmail(body.email) : existing.email,
        roleId: body.roleId !== undefined ? body.roleId : existing.roleId,
        collaboratorId: body.collaboratorId !== undefined
            ? body.collaboratorId
            : existing.collaboratorId,
        avatarUrl: body.avatarUrl !== undefined
            ? emptyUrl(body.avatarUrl)
            : existing.avatarUrl,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
        mustChangePassword,
    };
}
function buildPatchAuditPlan(actorUserId, targetUserId, existing, projected, body) {
    const out = [];
    if (existing.isActive !== projected.isActive) {
        out.push({
            eventType: projected.isActive
                ? 'admin_user_activated'
                : 'admin_user_deactivated',
            actorUserId,
            targetUserId,
            targetCollaboratorId: null,
            metadata: { via: 'patch' },
        });
    }
    const prevC = existing.collaboratorId;
    const nextC = projected.collaboratorId;
    if (prevC !== nextC) {
        if (prevC && !nextC) {
            out.push({
                eventType: 'admin_user_collaborator_unlinked',
                actorUserId,
                targetUserId,
                targetCollaboratorId: null,
                metadata: { previous_collaborator_id: prevC },
            });
        }
        else if (!prevC && nextC) {
            out.push({
                eventType: 'admin_user_collaborator_linked',
                actorUserId,
                targetUserId,
                targetCollaboratorId: nextC,
                metadata: {
                    previous_collaborator_id: null,
                    new_collaborator_id: nextC,
                },
            });
        }
        else if (prevC && nextC && prevC !== nextC) {
            out.push({
                eventType: 'admin_user_collaborator_unlinked',
                actorUserId,
                targetUserId,
                targetCollaboratorId: null,
                metadata: { previous_collaborator_id: prevC },
            });
            out.push({
                eventType: 'admin_user_collaborator_linked',
                actorUserId,
                targetUserId,
                targetCollaboratorId: nextC,
                metadata: {
                    previous_collaborator_id: prevC,
                    new_collaborator_id: nextC,
                },
            });
        }
    }
    const changed = [];
    if (existing.email !== projected.email)
        changed.push('email');
    if (existing.roleId !== projected.roleId)
        changed.push('role_id');
    const av0 = existing.avatarUrl ?? null;
    const av1 = projected.avatarUrl ?? null;
    if (av0 !== av1)
        changed.push('avatar_url');
    if (existing.mustChangePassword !== projected.mustChangePassword) {
        changed.push('must_change_password');
    }
    if (body.password !== undefined) {
        changed.push('password');
    }
    if (changed.length > 0) {
        out.push({
            eventType: 'admin_user_updated',
            actorUserId,
            targetUserId,
            targetCollaboratorId: null,
            metadata: { changed_fields: changed },
        });
    }
    return out;
}
export async function serviceListUsers(pool, filters) {
    const [total, data] = await Promise.all([
        countAdminUsers(pool, filters),
        listAdminUsers(pool, filters),
    ]);
    return { data, total };
}
export async function serviceGetUserById(pool, id) {
    const row = await findAdminUserById(pool, id);
    if (!row) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return row;
}
export async function serviceCreateUser(pool, actorUserId, body) {
    const roleOk = await roleExists(pool, body.roleId);
    if (!roleOk) {
        throw new AppError('Papel de acesso não encontrado.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    const collId = body.collaboratorId ?? null;
    if (collId) {
        const ok = await assertCollaboratorEligibleForLink(pool, collId, null);
        if (!ok) {
            throw new AppError('Colaborador inválido, inativo ou já vinculado a outro utilizador.', 422, ErrorCodes.VALIDATION_ERROR);
        }
    }
    const passwordHash = await hashPassword(body.password);
    const input = {
        email: body.email,
        password_hash: passwordHash,
        role_id: body.roleId,
        collaborator_id: collId,
        avatar_url: emptyUrl(body.avatarUrl),
        is_active: body.isActive ?? true,
        must_change_password: body.mustChangePassword ?? true,
        created_by: actorUserId,
    };
    const newId = await withTransaction(pool, async (client) => {
        const id = await insertAppUser(client, input).catch((e) => {
            handlePg(e);
        });
        await insertAdminAuditEvent(client, {
            eventType: 'admin_user_created',
            actorUserId,
            targetUserId: id,
            targetCollaboratorId: collId,
            metadata: {
                initial_role_id: input.role_id,
                had_collaborator_link: collId !== null,
                must_change_pwd_initial: input.must_change_password,
            },
        });
        return id;
    });
    const row = await findAdminUserById(pool, newId);
    if (!row) {
        throw new AppError('Utilizador criado mas não foi possível recarregar os dados.', 500, ErrorCodes.INTERNAL);
    }
    return row;
}
export async function servicePatchUser(pool, actorUserId, id, body) {
    const existing = await findAdminUserById(pool, id);
    if (!existing) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    if (body.roleId !== undefined && body.roleId !== null) {
        const roleOk = await roleExists(pool, body.roleId);
        if (!roleOk) {
            throw new AppError('Papel de acesso não encontrado.', 422, ErrorCodes.VALIDATION_ERROR);
        }
    }
    if (body.collaboratorId !== undefined && body.collaboratorId !== null) {
        const ok = await assertCollaboratorEligibleForLink(pool, body.collaboratorId, id);
        if (!ok) {
            throw new AppError('Colaborador inválido, inativo ou já vinculado a outro utilizador.', 422, ErrorCodes.VALIDATION_ERROR);
        }
    }
    const patch = { updated_by: actorUserId };
    if (body.email !== undefined)
        patch.email = body.email;
    if (body.roleId !== undefined)
        patch.role_id = body.roleId;
    if (body.collaboratorId !== undefined)
        patch.collaborator_id = body.collaboratorId;
    if (body.avatarUrl !== undefined)
        patch.avatar_url = emptyUrl(body.avatarUrl);
    if (body.isActive !== undefined)
        patch.is_active = body.isActive;
    if (body.mustChangePassword !== undefined) {
        patch.must_change_password = body.mustChangePassword;
    }
    const projected = projectAfterPatch(existing, body);
    const auditPlan = buildPatchAuditPlan(actorUserId, id, existing, projected, body);
    try {
        await withTransaction(pool, async (client) => {
            const ok = await patchAppUser(client, id, patch);
            if (!ok) {
                throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
            }
            if (body.password !== undefined) {
                const passwordHash = await hashPassword(body.password);
                const pwOk = await setAppUserPasswordExplicit(client, id, passwordHash, actorUserId);
                if (!pwOk) {
                    throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
                }
            }
            for (const ev of auditPlan) {
                await insertAdminAuditEvent(client, ev);
            }
        });
    }
    catch (e) {
        if (e instanceof AppError)
            throw e;
        handlePg(e);
    }
    const row = await findAdminUserById(pool, id);
    if (!row) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return row;
}
export async function serviceActivate(pool, actorUserId, id) {
    const existing = await findAdminUserById(pool, id);
    if (!existing) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    if (existing.deletedAt) {
        throw new AppError('Não foi possível ativar (utilizador inexistente ou apagado).', 404, ErrorCodes.NOT_FOUND);
    }
    if (existing.isActive) {
        return existing;
    }
    await withTransaction(pool, async (client) => {
        const ok = await setUserActive(client, id, true, actorUserId);
        if (!ok) {
            throw new AppError('Não foi possível ativar (utilizador inexistente ou apagado).', 404, ErrorCodes.NOT_FOUND);
        }
        await insertAdminAuditEvent(client, {
            eventType: 'admin_user_activated',
            actorUserId,
            targetUserId: id,
            targetCollaboratorId: null,
            metadata: { via: 'endpoint' },
        });
    });
    const row = await findAdminUserById(pool, id);
    if (!row) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return row;
}
export async function serviceInactivate(pool, actorUserId, id) {
    if (actorUserId === id) {
        throw new AppError('Não pode inativar a sua própria conta.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    const existing = await findAdminUserById(pool, id);
    if (!existing) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    if (!existing.isActive) {
        return existing;
    }
    await withTransaction(pool, async (client) => {
        const ok = await setUserActive(client, id, false, actorUserId);
        if (!ok) {
            throw new AppError('Não foi possível inativar (utilizador inexistente ou apagado).', 404, ErrorCodes.NOT_FOUND);
        }
        await insertAdminAuditEvent(client, {
            eventType: 'admin_user_deactivated',
            actorUserId,
            targetUserId: id,
            targetCollaboratorId: null,
            metadata: { via: 'endpoint' },
        });
    });
    const row = await findAdminUserById(pool, id);
    if (!row) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return row;
}
export async function serviceSoftDelete(pool, actorUserId, id) {
    if (actorUserId === id) {
        throw new AppError('Não pode remover a sua própria conta.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    await withTransaction(pool, async (client) => {
        const ok = await softDeleteUser(client, id, actorUserId);
        if (!ok) {
            throw new AppError('Não foi possível remover (já removido ou inexistente).', 404, ErrorCodes.NOT_FOUND);
        }
        await insertAdminAuditEvent(client, {
            eventType: 'admin_user_soft_deleted',
            actorUserId,
            targetUserId: id,
            targetCollaboratorId: null,
            metadata: null,
        });
    });
    const row = await findAdminUserById(pool, id);
    if (!row) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return row;
}
export async function serviceRestore(pool, actorUserId, id) {
    await withTransaction(pool, async (client) => {
        const ok = await restoreUser(client, id, actorUserId);
        if (!ok) {
            throw new AppError('Não foi possível restaurar (não está removido ou inexistente).', 404, ErrorCodes.NOT_FOUND);
        }
        await insertAdminAuditEvent(client, {
            eventType: 'admin_user_restored',
            actorUserId,
            targetUserId: id,
            targetCollaboratorId: null,
            metadata: null,
        });
    });
    const row = await findAdminUserById(pool, id);
    if (!row) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return row;
}
export async function serviceForcePasswordChange(pool, actorUserId, id) {
    const existing = await findAdminUserById(pool, id);
    if (!existing) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    if (existing.mustChangePassword) {
        return existing;
    }
    await withTransaction(pool, async (client) => {
        const ok = await setForcePasswordChange(client, id, actorUserId);
        if (!ok) {
            throw new AppError('Não foi possível aplicar a política (utilizador inexistente ou apagado).', 404, ErrorCodes.NOT_FOUND);
        }
        await insertAdminAuditEvent(client, {
            eventType: 'admin_user_force_password_change',
            actorUserId,
            targetUserId: id,
            targetCollaboratorId: null,
            metadata: null,
        });
    });
    const row = await findAdminUserById(pool, id);
    if (!row) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return row;
}
export async function serviceResetPassword(pool, actorUserId, id) {
    if (actorUserId === id) {
        throw new AppError('Não pode redefinir a sua própria senha por aqui. Utilize «Alterar senha» na sua conta.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    const existing = await findAdminUserById(pool, id);
    if (!existing) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    if (existing.deletedAt) {
        throw new AppError('Não é possível redefinir senha de um utilizador removido.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await withTransaction(pool, async (client) => {
        const ok = await resetAdminUserPasswordHash(client, id, passwordHash, actorUserId);
        if (!ok) {
            throw new AppError('Não foi possível redefinir a senha (utilizador inexistente ou apagado).', 404, ErrorCodes.NOT_FOUND);
        }
        await insertAdminAuditEvent(client, {
            eventType: 'admin_user_password_reset',
            actorUserId,
            targetUserId: id,
            targetCollaboratorId: null,
            metadata: { cleared_lockout: true },
        });
    });
    const row = await findAdminUserById(pool, id);
    if (!row) {
        throw new AppError('Utilizador não encontrado.', 404, ErrorCodes.NOT_FOUND);
    }
    return {
        temporaryPassword,
        mustChangePassword: true,
        user: row,
    };
}
export async function serviceEligibleCollaborators(pool, excludeUserId) {
    return listEligibleCollaboratorsForLink(pool, excludeUserId);
}
//# sourceMappingURL=admin-users.service.js.map