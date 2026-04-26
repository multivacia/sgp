import type pg from 'pg';
export type SectorRow = {
    id: string;
    name: string;
};
export declare function listSectors(pool: pg.Pool): Promise<SectorRow[]>;
//# sourceMappingURL=sectors.repository.d.ts.map