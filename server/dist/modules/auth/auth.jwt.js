import jwt from 'jsonwebtoken';
export function signSessionToken(userId, email, passwordChangedAtMs, env) {
    return jwt.sign({ sub: userId, email, pwdStampMs: passwordChangedAtMs }, env.jwtSecret, {
        expiresIn: `${env.jwtExpiresDays}d`,
    });
}
export function verifySessionToken(token, secret) {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded.sub !== 'string' || typeof decoded.email !== 'string') {
        throw new Error('invalid_token_payload');
    }
    if (typeof decoded.iat !== 'number') {
        throw new Error('invalid_token_payload');
    }
    if (typeof decoded.pwdStampMs !== 'number' ||
        !Number.isFinite(decoded.pwdStampMs)) {
        throw new Error('invalid_token_payload');
    }
    return {
        sub: decoded.sub,
        email: decoded.email,
        iat: decoded.iat,
        pwdStampMs: decoded.pwdStampMs,
    };
}
//# sourceMappingURL=auth.jwt.js.map