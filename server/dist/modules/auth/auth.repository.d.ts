import type pg from 'pg';
import type { AuthMeUser } from './auth.types.js';
export type AppUserAuthRow = {
    id: string;
    email: string;
    password_hash: string | null;
    is_active: boolean;
    collaborator_id: string | null;
    role_id: string | null;
    role_code: string | null;
    avatar_url: string | null;
    must_change_password: boolean;
    password_changed_at: Date | null;
    deleted_at: Date | null;
    locked_until: Date | null;
    failed_login_count: number;
};
export declare function findAppUserForLoginByEmail(pool: pg.Pool, email: string): Promise<AppUserAuthRow | null>;
export declare function findAppUserProfileById(pool: pg.Pool, userId: string): Promise<AuthMeUser | null>;
export declare function findAppUserForPasswordChange(pool: pg.Pool, userId: string): Promise<AppUserAuthRow | null>;
/**
 * Incrementa falhas consecutivas e aplica bloqueio quando atinge o limiar.
 * A linha deve existir e estar elegível (chamado só após senha inválida).
 */
export declare function incrementFailedLoginForUser(pool: pg.Pool, userId: string, maxAttempts: number, lockoutMinutes: number): Promise<{
    failedLoginCount: number;
    lockedUntil: Date | null;
}>;
/** Colaborador operacional ligado ao utilizador (se existir). */
/** Para validação de sessão após JWT: marca de senha ou conta inexistente/apagada. */
export declare function findPasswordStampForSessionAuth(pool: pg.Pool, userId: string): Promise<{
    found: false;
} | {
    found: true;
    passwordChangedAt: Date | null;
}>;
export declare function findCollaboratorIdByAppUserId(pool: pg.Pool, userId: string): Promise<string | null>;
export declare function findAppUserEmailById(pool: pg.Pool, userId: string): Promise<string | null>;
export declare function updateLoginSuccess(pool: pg.Pool, userId: string, newPasswordHash: string | null): Promise<void>;
export declare function updatePasswordAfterChange(pool: pg.Pool, userId: string, passwordHash: string): Promise<void>;
//# sourceMappingURL=auth.repository.d.ts.map