import { ok } from '../../shared/http/ok.js';
import { listRoles } from './roles.repository.js';
export async function getRoles(req, res) {
    const pool = req.app.locals.pool;
    const rows = await listRoles(pool);
    const data = rows.map((x) => ({
        id: x.id,
        code: x.code,
        name: x.name,
    }));
    res.json(ok(data, { total: data.length }));
}
//# sourceMappingURL=roles.controller.js.map