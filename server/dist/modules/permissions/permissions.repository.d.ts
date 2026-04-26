import type pg from 'pg';
/**
 * Códigos de permissão efetivos do utilizador (via papel), ordenados por code.
 * Utilizadores sem papel ou sem permissões → lista vazia.
 */
export declare function findPermissionCodesForAppUser(pool: pg.Pool, userId: string): Promise<string[]>;
/** Verifica se o utilizador tem uma permissão efetiva (via papel). */
export declare function appUserHasPermission(pool: pg.Pool, userId: string, permissionCode: string): Promise<boolean>;
//# sourceMappingURL=permissions.repository.d.ts.map