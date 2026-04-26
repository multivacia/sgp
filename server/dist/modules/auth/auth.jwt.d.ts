import type { Env } from '../../config/env.js';
export type SessionJwtPayload = {
    sub: string;
    email: string;
    /** Unix timestamp (seconds), emitido pelo jsonwebtoken. */
    iat: number;
    /**
     * `password_changed_at` da conta no instante da emissão (ms desde epoch).
     * Comparação com a BD detecta alteração de senha sem ambiguidade de segundos do `iat`.
     */
    pwdStampMs: number;
};
export declare function signSessionToken(userId: string, email: string, passwordChangedAtMs: number, env: Env): string;
export declare function verifySessionToken(token: string, secret: string): SessionJwtPayload;
//# sourceMappingURL=auth.jwt.d.ts.map