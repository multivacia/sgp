import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
/**
 * Hash de senha centralizado: Argon2id (PHC string com salt embutido).
 * Legado bcrypt ($2a/b/y) ainda é aceite em verifyPassword para migração sem downtime.
 */
export async function hashPassword(plain) {
    return argon2.hash(plain, { type: argon2.argon2id });
}
export async function verifyPassword(plain, storedHash) {
    if (!storedHash)
        return { ok: false, needsRehash: false };
    if (storedHash.startsWith('$argon2')) {
        try {
            const ok = await argon2.verify(storedHash, plain);
            if (!ok)
                return { ok: false, needsRehash: false };
            const needsRehash = argon2.needsRehash(storedHash);
            return { ok: true, needsRehash };
        }
        catch {
            return { ok: false, needsRehash: false };
        }
    }
    if (storedHash.startsWith('$2')) {
        const ok = await bcrypt.compare(plain, storedHash);
        return { ok, needsRehash: ok };
    }
    return { ok: false, needsRehash: false };
}
//# sourceMappingURL=password.js.map