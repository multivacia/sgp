/** Roles com permissão para governança de utilizadores (RBAC). */
export declare const GOVERNANCE_ROLE_CODES: Set<string>;
/**
 * Encadeie após `requireAuth()`.
 * Exige JWT válido + papel ADMIN ou GESTOR + conta ativa e não apagada.
 */
export declare function requireAdminGovernance(): import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
//# sourceMappingURL=admin-users.middleware.d.ts.map