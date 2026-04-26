/**
 * Normaliza fragmento para observações: colagem ordinal+texto, prefixo de lista, espaços.
 * Sem reescrita semântica — só legibilidade e segmentação mecânica.
 */
export declare function formatObservationFragment(raw: string): string;
/** Une linhas já limpas; colapsa quebras excessivas sem reescrever o texto. */
export declare function normalizeObservationBlock(text: string): string;
//# sourceMappingURL=observationTextFormatting.d.ts.map