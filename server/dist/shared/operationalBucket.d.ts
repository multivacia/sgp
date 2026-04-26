/**
 * Mesma regra que `src/lib/backlog/operationalBuckets.ts` (Painel Operacional de Esteiras).
 * Usado no servidor para ordenação de “Minhas atividades”.
 */
export type OperationalBucket = 'no_backlog' | 'em_revisao' | 'em_andamento' | 'em_atraso' | 'concluidas';
export declare function parseFlexibleDeadlineToDate(value: string | null | undefined): Date | null;
export declare function getOperationalBucketForConveyor(operationalStatus: string, estimatedDeadline: string | null | undefined, now?: Date): OperationalBucket;
/** Ordem na lista: atraso → revisão → andamento → backlog → concluídas. */
export declare function operationalBucketSortRank(b: OperationalBucket): number;
//# sourceMappingURL=operationalBucket.d.ts.map