import type { OperationalBucket } from '../../shared/operationalBucket.js';
/** GET /api/v1/conveyors/:id/node-workload — leitura V1 (sem período; acumulado total). */
export type ConveyorNodeWorkloadStepApi = {
    optionId: string;
    optionName: string;
    areaId: string;
    areaName: string;
    stepId: string;
    stepName: string;
    /** Previsto estrutural no STEP (`conveyor_nodes.planned_minutes`). */
    plannedMinutes: number | null;
    /** Soma de `conveyor_time_entries.minutes` para este STEP (não apagados). */
    realizedMinutes: number;
    /** max(0, planned − realized) com planned nulo tratado como 0. */
    pendingMinutes: number;
};
export type ConveyorNodeWorkloadAreaApi = {
    optionId: string;
    optionName: string;
    areaId: string;
    areaName: string;
    /** Somas dos STEPs filhos desta área (todas as opções; rollup por área). */
    plannedMinutesSum: number;
    realizedMinutesSum: number;
    pendingMinutesSum: number;
};
export type ConveyorNodeWorkloadConveyorContextApi = {
    /** Bucket operacional ao nível da esteira (mesma regra do backlog). */
    operationalBucket: OperationalBucket;
    /** Verdadeiro quando `operationalBucket === 'em_atraso'` (pressão de atraso como contexto). */
    isOverdueContext: boolean;
};
export type ConveyorNodeWorkloadApi = {
    semanticsVersion: '1.5';
    conveyorId: string;
    conveyor: ConveyorNodeWorkloadConveyorContextApi;
    steps: ConveyorNodeWorkloadStepApi[];
    areas: ConveyorNodeWorkloadAreaApi[];
    /** Limitações e o que o indicador não prova. */
    notes: string;
};
//# sourceMappingURL=conveyorNodeWorkload.dto.d.ts.map