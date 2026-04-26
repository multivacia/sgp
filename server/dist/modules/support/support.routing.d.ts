import type { Env } from '../../config/env.js';
import type { RoutingPlan, SupportTicketSeverity } from './support.types.js';
export declare function resolveRoutingPlan(env: Env, input: {
    severity: SupportTicketSeverity;
    category: string;
}): RoutingPlan;
//# sourceMappingURL=support.routing.d.ts.map