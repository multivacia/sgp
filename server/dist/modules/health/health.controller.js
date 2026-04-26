import { ok } from '../../shared/http/ok.js';
export async function getHealth(_req, res) {
    res.json(ok({ ok: true, service: 'sgp-api' }));
}
export async function getHealthDb(req, res) {
    const pool = req.app.locals.pool;
    const r = await pool.query('SELECT 1 AS ok');
    const row = r.rows[0];
    res.json(ok({ ok: row?.ok === 1, database: 'connected' }));
}
//# sourceMappingURL=health.controller.js.map