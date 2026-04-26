import type pg from 'pg';
export type StepHierarchyRow = {
    step_id: string;
    step_name: string;
    step_order: number;
    planned_minutes: number | null;
    area_id: string;
    area_name: string;
    area_order: number;
    option_id: string;
    option_name: string;
    option_order: number;
};
/**
 * STEPs da esteira com OPTION e AREA (estrutura completa; todas as opções).
 */
export declare function listStepHierarchyForConveyor(pool: pg.Pool, conveyorId: string): Promise<StepHierarchyRow[]>;
/** Soma acumulada de minutos apontados por STEP (`conveyor_node_id`). */
export declare function sumRealizedMinutesByStepForConveyor(pool: pg.Pool, conveyorId: string): Promise<Map<string, number>>;
//# sourceMappingURL=conveyorNodeWorkload.repository.d.ts.map