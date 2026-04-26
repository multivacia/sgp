export declare const ErrorCodes: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND";
    readonly CONFLICT: "CONFLICT";
    readonly INTERNAL: "INTERNAL_ERROR";
    readonly INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    /** JWT válido na assinatura mas emitido antes da última alteração de senha. */
    readonly SESSION_REVOKED_CREDENTIALS_CHANGED: "SESSION_REVOKED_CREDENTIALS_CHANGED";
    readonly ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE";
    /** Bloqueio temporário por tentativas falhadas de login (locked_until). */
    readonly ACCOUNT_TEMPORARILY_LOCKED: "ACCOUNT_TEMPORARILY_LOCKED";
    readonly FORBIDDEN: "FORBIDDEN";
};
//# sourceMappingURL=errorCodes.d.ts.map