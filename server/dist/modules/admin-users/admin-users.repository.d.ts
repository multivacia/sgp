import type { DbExecutor } from '../../shared/db/dbExecutor.js';
import type { AdminUserListItem, EligibleCollaboratorOption } from './admin-users.types.js';
export type AdminUserListFilters = {
    search?: string;
    roleId?: string;
    limit: number;
    offset: number;
};
/**
 * Contas ativas, não apagadas, sem `collaborator_id` (pendência de vínculo operacional).
 */
export declare function countActiveUsersWithoutCollaboratorLink(db: DbExecutor): Promise<number>;
export declare function countAdminUsers(db: DbExecutor, filters: AdminUserListFilters): Promise<number>;
export declare function listAdminUsers(db: DbExecutor, filters: AdminUserListFilters): Promise<AdminUserListItem[]>;
export declare function findAdminUserById(db: DbExecutor, id: string): Promise<AdminUserListItem | null>;
export type InsertAppUserInput = {
    email: string;
    password_hash: string;
    role_id: string;
    collaborator_id: string | null;
    avatar_url: string | null;
    is_active: boolean;
    must_change_password: boolean;
    created_by: string;
};
export declare function insertAppUser(db: DbExecutor, input: InsertAppUserInput): Promise<string>;
export type PatchAppUserInput = {
    email?: string;
    role_id?: string | null;
    collaborator_id?: string | null;
    avatar_url?: string | null;
    is_active?: boolean;
    must_change_password?: boolean;
    updated_by: string;
};
export declare function patchAppUser(db: DbExecutor, id: string, patch: PatchAppUserInput): Promise<boolean>;
export declare function setUserActive(db: DbExecutor, id: string, isActive: boolean, updatedBy: string): Promise<boolean>;
export declare function softDeleteUser(db: DbExecutor, id: string, updatedBy: string): Promise<boolean>;
export declare function restoreUser(db: DbExecutor, id: string, updatedBy: string): Promise<boolean>;
export declare function setForcePasswordChange(db: DbExecutor, id: string, updatedBy: string): Promise<boolean>;
/** Redefine hash, obriga troca no próximo acesso e limpa bloqueio por tentativas. */
export declare function resetAdminUserPasswordHash(db: DbExecutor, id: string, passwordHash: string, updatedBy: string): Promise<boolean>;
/**
 * Senha definida explicitamente pelo administrador (formulário).
 * Não força troca no próximo acesso; limpa bloqueio por tentativas.
 */
export declare function setAppUserPasswordExplicit(db: DbExecutor, id: string, passwordHash: string, updatedBy: string): Promise<boolean>;
export declare function assertCollaboratorEligibleForLink(db: DbExecutor, collaboratorId: string, excludeUserId: string | null): Promise<boolean>;
export declare function listEligibleCollaboratorsForLink(db: DbExecutor, excludeUserId: string | null): Promise<EligibleCollaboratorOption[]>;
export declare function roleExists(db: DbExecutor, roleId: string): Promise<boolean>;
//# sourceMappingURL=admin-users.repository.d.ts.map