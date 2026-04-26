import { ok } from '../../shared/http/ok.js';
import { listSectors } from './sectors.repository.js';
export async function getSectors(req, res) {
    const pool = req.app.locals.pool;
    const rows = await listSectors(pool);
    const data = rows.map((x) => ({ id: x.id, name: x.name }));
    res.json(ok(data, { total: data.length }));
}
//# sourceMappingURL=sectors.controller.js.map