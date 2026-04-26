/**
 * Exige cookie de sessão JWT válido e não obsoleto face a `password_changed_at`.
 * Preenche `req.authUser` (id + email do token).
 */
export declare function requireAuth(): import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
//# sourceMappingURL=auth.middleware.d.ts.map