import pg from 'pg';
const { Pool } = pg;
let pool;
export function getPool(env) {
    if (!pool) {
        const opts = { ...env.pgPoolConfig };
        if (env.pgPoolMax != null) {
            opts.max = env.pgPoolMax;
        }
        pool = new Pool(opts);
    }
    return pool;
}
export async function closePool() {
    if (pool) {
        await pool.end();
        pool = undefined;
    }
}
//# sourceMappingURL=db.js.map