import type pg from 'pg';
export type RoleRow = {
    id: string;
    code: string;
    name: string;
};
export declare function listRoles(pool: pg.Pool): Promise<RoleRow[]>;
//# sourceMappingURL=roles.repository.d.ts.map