export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
    CONFLICT: 'CONFLICT',
    INTERNAL: 'INTERNAL_ERROR',
    INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
    UNAUTHORIZED: 'UNAUTHORIZED',
    /** JWT válido na assinatura mas emitido antes da última alteração de senha. */
    SESSION_REVOKED_CREDENTIALS_CHANGED: 'SESSION_REVOKED_CREDENTIALS_CHANGED',
    ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
    /** Bloqueio temporário por tentativas falhadas de login (locked_until). */
    ACCOUNT_TEMPORARILY_LOCKED: 'ACCOUNT_TEMPORARILY_LOCKED',
    FORBIDDEN: 'FORBIDDEN',
};
//# sourceMappingURL=errorCodes.js.map