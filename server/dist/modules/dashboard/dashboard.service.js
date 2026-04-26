import { getOperationalBucketForConveyor, } from '../../shared/operationalBucket.js';
import { resolveOperationalPeriod } from '../../shared/operationalPeriod.js';
import { countActiveConveyors, countAssigneeRoles, countCompletedInWindow, listCollaboratorLoadAggregates, listConveyorsForDashboard, listRecentTimeEntries, sumConveyorPlannedMinutes, sumRealizedMinutes, sumRealizedMinutesBetween, sumRealizedMinutesByCollaborator, sumStepPlannedMinutes, } from './dashboard.repository.js';
function emptyBucketCounts() {
    return {
        em_atraso: 0,
        em_revisao: 0,
        em_andamento: 0,
        no_backlog: 0,
        concluidas: 0,
    };
}
export async function serviceOperationalDashboard(pool, opts) {
    const [conveyors, assignRoles, plannedConv, plannedSteps, realized, collabRows, realizedByCollab, recentRows,] = await Promise.all([
        listConveyorsForDashboard(pool),
        countAssigneeRoles(pool),
        sumConveyorPlannedMinutes(pool),
        sumStepPlannedMinutes(pool),
        sumRealizedMinutes(pool),
        listCollaboratorLoadAggregates(pool),
        sumRealizedMinutesByCollaborator(pool),
        listRecentTimeEntries(pool, 12),
    ]);
    let realizedInPeriod;
    let realizedPeriod;
    if (opts?.realizedPeriodPreset) {
        const win = resolveOperationalPeriod({
            preset: opts.realizedPeriodPreset,
            now: new Date(),
        });
        realizedInPeriod = await sumRealizedMinutesBetween(pool, win.from, win.to);
        realizedPeriod = {
            from: win.from.toISOString(),
            to: win.to.toISOString(),
            preset: win.preset,
        };
    }
    const conveyorsByBucket = emptyBucketCounts();
    for (const c of conveyors) {
        const b = getOperationalBucketForConveyor(c.operational_status, c.estimated_deadline);
        conveyorsByBucket[b]++;
    }
    const overdueHighlight = conveyors
        .filter((c) => getOperationalBucketForConveyor(c.operational_status, c.estimated_deadline) ===
        'em_atraso')
        .slice(0, 12)
        .map((c) => ({
        conveyorId: c.id,
        name: c.name,
        code: c.code,
        operationalStatus: c.operational_status,
        estimatedDeadline: c.estimated_deadline,
    }));
    const collaboratorLoad = collabRows.map((row) => ({
        collaboratorId: row.collaborator_id,
        fullName: row.full_name,
        assignmentCount: Number.parseInt(row.assignment_count, 10) || 0,
        primaryCount: Number.parseInt(row.primary_count, 10) || 0,
        supportCount: Number.parseInt(row.support_count, 10) || 0,
        plannedMinutesOnSteps: Number.parseInt(row.planned_minutes_steps, 10) || 0,
        realizedMinutes: realizedByCollab.get(row.collaborator_id) ?? 0,
    }));
    const recentTimeEntries = recentRows.map((r) => ({
        id: r.id,
        conveyorId: r.conveyor_id,
        conveyorName: r.conveyor_name,
        stepNodeId: r.conveyor_node_id,
        stepName: r.step_name,
        collaboratorId: r.collaborator_id,
        collaboratorName: r.collaborator_name,
        minutes: r.minutes,
        entryAt: r.entry_at.toISOString(),
        notes: r.notes,
    }));
    const periodNote = realizedInPeriod !== undefined && realizedPeriod
        ? ` Minutos apontados (período, preset ${realizedPeriod.preset}): soma dos lançamentos com entry_at entre o início da janela e agora (UTC).`
        : '';
    return {
        meta: {
            generatedAt: new Date().toISOString(),
            scope: 'snapshot_atual',
            bucketRule: 'shared_operationalBucket_ts',
            ...(realizedPeriod ? { semanticsVersion: '1.5' } : {}),
        },
        conveyorsByBucket,
        overdueHighlight,
        assignees: {
            totalAllocations: assignRoles.total,
            primaryAllocations: assignRoles.primary,
            supportAllocations: assignRoles.support,
        },
        plannedVsRealized: {
            plannedMinutesConveyorTotal: plannedConv,
            plannedMinutesStepNodes: plannedSteps,
            realizedMinutesTotal: realized,
            ...(realizedInPeriod !== undefined && realizedPeriod
                ? {
                    realizedMinutesInPeriod: realizedInPeriod,
                    realizedPeriod,
                }
                : {}),
            notes: 'Previsto estrutural: soma dos minutos planejados nos STEPs ativos. Total por esteira (coluna OS): soma de total_planned_minutes (apoio; pode diferir do previsto estrutural). Minutos apontados (acumulado): soma global de conveyor_time_entries não apagados.' +
                periodNote,
        },
        collaboratorLoad,
        recentTimeEntries,
    };
}
export async function serviceExecutiveDashboard(pool, completedWithinDays) {
    const [rows, active, completedInWindow, plannedConv, plannedSteps, realized] = await Promise.all([
        listConveyorsForDashboard(pool),
        countActiveConveyors(pool),
        countCompletedInWindow(pool, completedWithinDays),
        sumConveyorPlannedMinutes(pool),
        sumStepPlannedMinutes(pool),
        sumRealizedMinutes(pool),
    ]);
    let overdue = 0;
    for (const c of rows) {
        if (getOperationalBucketForConveyor(c.operational_status, c.estimated_deadline) ===
            'em_atraso') {
            overdue++;
        }
    }
    const delayRateVsActive = active > 0 ? Math.round((overdue / active) * 1000) / 1000 : null;
    const topOverdue = rows
        .filter((c) => getOperationalBucketForConveyor(c.operational_status, c.estimated_deadline) ===
        'em_atraso')
        .slice(0, 8)
        .map((c) => ({
        conveyorId: c.id,
        name: c.name,
        code: c.code,
        estimatedDeadline: c.estimated_deadline,
    }));
    return {
        meta: {
            generatedAt: new Date().toISOString(),
            completedWithinDays,
            scope: `esteiras_ativas_e_concluidas_ultimos_${completedWithinDays}_dias`,
        },
        totals: {
            activeConveyors: active,
            completedInWindow,
            overdueConveyors: overdue,
            delayRateVsActive,
        },
        plannedVsRealized: {
            plannedMinutesConveyorTotal: plannedConv,
            plannedMinutesStepNodes: plannedSteps,
            realizedMinutesTotal: realized,
            notes: 'Previsto estrutural: soma dos STEPs. Total por esteira (OS): apoio. Minutos apontados (acumulado): todos os lançamentos válidos. Mesma base de agregação do painel operacional.',
        },
        topOverdueConveyors: topOverdue,
    };
}
//# sourceMappingURL=dashboard.service.js.map