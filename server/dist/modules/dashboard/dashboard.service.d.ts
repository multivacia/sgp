import type pg from 'pg';
import type { ExecutiveDashboardDto, OperationalDashboardDto } from './dashboard.dto.js';
export declare function serviceOperationalDashboard(pool: pg.Pool, opts?: {
    realizedPeriodPreset?: '7d' | '15d' | '30d' | 'month';
}): Promise<OperationalDashboardDto>;
export declare function serviceExecutiveDashboard(pool: pg.Pool, completedWithinDays: number): Promise<ExecutiveDashboardDto>;
//# sourceMappingURL=dashboard.service.d.ts.map