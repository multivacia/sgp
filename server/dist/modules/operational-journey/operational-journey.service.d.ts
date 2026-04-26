import type pg from 'pg';
import type { OperationalJourneyApi } from './operational-journey.dto.js';
import type { OperationalJourneyQuery } from './operational-journey.schemas.js';
export declare function serviceGetOperationalJourney(pool: pg.Pool, args: {
    collaboratorId: string;
    query: OperationalJourneyQuery;
}): Promise<OperationalJourneyApi>;
//# sourceMappingURL=operational-journey.service.d.ts.map