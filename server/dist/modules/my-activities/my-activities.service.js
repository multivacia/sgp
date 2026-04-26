import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { getOperationalBucketForConveyor, operationalBucketSortRank, parseFlexibleDeadlineToDate, } from '../../shared/operationalBucket.js';
import { listActivitiesRawForCollaborator } from './my-activities.repository.js';
/**
 * Ordenação final (após filtro por colaborador):
 * 1. bucket operacional: em atraso → em revisão → em andamento → no backlog → concluídas
 * 2. prazo estimado (mais urgente primeiro; sem prazo por último dentro do bucket)
 * 3. nome da esteira (pt-BR)
 * 4. ordem da matriz: opção → área → step (`order_index` da esteira)
 */
function mapAndSortActivities(rows) {
    const now = new Date();
    const rawByAssigneeId = new Map(rows.map((r) => [r.assignee_id, r]));
    const mapped = rows.map((row) => {
        const operationalBucket = getOperationalBucketForConveyor(row.conveyor_status, row.estimated_deadline, now);
        return {
            assigneeId: row.assignee_id,
            conveyorId: row.conveyor_id,
            conveyorCode: row.conveyor_code,
            conveyorName: row.conveyor_name,
            conveyorStatus: row.conveyor_status,
            estimatedDeadline: row.estimated_deadline,
            operationalBucket,
            stepNodeId: row.step_node_id,
            stepName: row.step_name,
            optionName: row.option_name,
            areaName: row.area_name,
            roleInStep: row.is_primary ? 'primary' : 'support',
            plannedMinutes: row.planned_minutes === null || row.planned_minutes === ''
                ? null
                : Number(row.planned_minutes),
            realizedMinutes: row.realized_minutes === null || row.realized_minutes === ''
                ? null
                : Number(row.realized_minutes),
        };
    });
    mapped.sort((a, b) => {
        const br = operationalBucketSortRank(a.operationalBucket) -
            operationalBucketSortRank(b.operationalBucket);
        if (br !== 0)
            return br;
        const da = parseFlexibleDeadlineToDate(a.estimatedDeadline);
        const db = parseFlexibleDeadlineToDate(b.estimatedDeadline);
        const ma = da === null ? Number.POSITIVE_INFINITY : da.getTime();
        const mb = db === null ? Number.POSITIVE_INFINITY : db.getTime();
        if (ma !== mb)
            return ma - mb;
        const nc = a.conveyorName
            .trim()
            .toLocaleLowerCase('pt-BR')
            .localeCompare(b.conveyorName.trim().toLocaleLowerCase('pt-BR'), 'pt-BR');
        if (nc !== 0)
            return nc;
        const ra = rawByAssigneeId.get(a.assigneeId);
        const rb = rawByAssigneeId.get(b.assigneeId);
        if (!ra || !rb)
            return 0;
        const oa = Number(ra.opt_order_index);
        const ob = Number(rb.opt_order_index);
        if (oa !== ob)
            return oa - ob;
        const aa = Number(ra.area_order_index);
        const ab = Number(rb.area_order_index);
        if (aa !== ab)
            return aa - ab;
        return Number(ra.step_order_index) - Number(rb.step_order_index);
    });
    return mapped;
}
export async function serviceListMyActivities(pool, query) {
    const collaboratorId = await findCollaboratorIdByAppUserId(pool, query.userId);
    if (!collaboratorId) {
        throw new AppError('Operação indisponível: o seu utilizador não tem colaborador operacional vinculado (app_users.collaborator_id). Peça ao administrador de governança para associar o seu acesso a um colaborador.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    const raw = await listActivitiesRawForCollaborator(pool, collaboratorId);
    const items = mapAndSortActivities(raw);
    return { items, resolvedCollaboratorId: collaboratorId };
}
/** Lista atividades alocadas (mesmo shape que Minhas atividades), por id de colaborador. */
export async function serviceListActivitiesForCollaborator(pool, collaboratorId, options) {
    const raw = await listActivitiesRawForCollaborator(pool, collaboratorId, options);
    return mapAndSortActivities(raw);
}
//# sourceMappingURL=my-activities.service.js.map