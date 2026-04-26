/**
 * Hash de senha centralizado: Argon2id (PHC string com salt embutido).
 * Legado bcrypt ($2a/b/y) ainda é aceite em verifyPassword para migração sem downtime.
 */
export declare function hashPassword(plain: string): Promise<string>;
export declare function verifyPassword(plain: string, storedHash: string | null): Promise<{
    ok: boolean;
    needsRehash: boolean;
}>;
//# sourceMappingURL=password.d.ts.map