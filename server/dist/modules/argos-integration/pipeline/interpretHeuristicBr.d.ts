/**
 * Interpretação heurística BR para OS / oficina — sem UI, só domínio.
 * Confianças em [0,1] para composição com o draft e warnings.
 */
export type ServiceLineGuess = {
    orderIndex: number;
    title: string;
    confidence: number;
};
export type HeuristicInterpretation = {
    osNumber?: string;
    licensePlate?: string;
    clientName?: string;
    vehicleDescription?: string;
    modelVersion?: string;
    notes?: string;
    serviceLines: ServiceLineGuess[];
    suggestedEsteiraTitle?: string;
    suggestedEsteiraDescription?: string;
    priorityHint?: 'alta' | 'media' | 'baixa';
    /** Confiança por campo lógico (chaves alinhadas a suggestedDados do draft). */
    fieldConfidence: Record<string, number>;
};
/**
 * Interpreta texto livre (pós-extração) e nome de ficheiro.
 */
export declare function interpretHeuristicBr(params: {
    text: string;
    fileName: string;
}): HeuristicInterpretation;
//# sourceMappingURL=interpretHeuristicBr.d.ts.map