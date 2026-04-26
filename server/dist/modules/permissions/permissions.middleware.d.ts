/**
 * Encadeie após `requireAuth()`.
 * Exige uma permissão explícita (matriz seedada em `app_role_permissions`).
 */
export declare function requirePermission(permissionCode: string): import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Encadeie após `requireAuth()`. Basta uma das permissões listadas.
 */
export declare function requireAnyPermission(...permissionCodes: string[]): import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
//# sourceMappingURL=permissions.middleware.d.ts.map