/**
 * Triagem semântica de linhas documentais antes de promover a linha de serviço inferida.
 * Ordem: normalizar → ordinal colado (PDF) → marcador de lista → strip de prefixo → bloqueios fortes → score operacional.
 */
export type DocumentLineCategory = 'service_line' | 'metadata' | 'label' | 'disclaimer' | 'noise' | 'free_observation';
export type ClassifyDocumentLineResult = {
    category: DocumentLineCategory;
    /** Texto após normalização (e sem prefixo de lista, quando aplicável ao uso). */
    normalized: string;
    /** 0..1; após bloqueio forte fica 0. */
    operationalScore: number;
    blockReason?: string;
};
/** Promover a service_line só acima disto (salvo reforço explícito de lista). */
export declare const SERVICE_LINE_SCORE_THRESHOLD = 0.42;
/**
 * Normalização para classificação (não altera o extrator de PDF).
 */
export declare function normalizeDocumentLine(raw: string): string;
/**
 * PDFs costumem emitir ordinal colado à palavra seguinte ("1Courvin").
 * Insere espaço após 1–2 dígitos iniciais quando o próximo caractere é letra,
 * antes de qualquer score ou reforço operacional.
 */
export declare function splitGluedOrdinalPrefix(line: string): string;
/**
 * Remove prefixo numérico / marcador de lista para avaliar o conteúdo semântico.
 */
export declare function stripListPrefix(line: string): string;
/**
 * Classifica uma linha bruta do documento.
 * Use `stripListPrefix` no título persistido; a classificação usa o mesmo conteúdo sem prefixo.
 */
export declare function classifyDocumentLine(rawLine: string): ClassifyDocumentLineResult;
/**
 * Indica se a linha deve virar linha de serviço inferida (step).
 */
export declare function shouldPromoteToServiceLine(result: ClassifyDocumentLineResult): boolean;
//# sourceMappingURL=classifyDocumentLine.d.ts.map