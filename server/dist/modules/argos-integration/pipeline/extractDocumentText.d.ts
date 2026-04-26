export type ExtractDocumentTextResult = {
    text: string;
    pageCount?: number;
    source: 'pdf' | 'text' | 'binary_fallback';
    /** Avisos do extrator (ex.: PDF inválido mas texto recuperado por fallback). */
    extractWarnings: Array<{
        code: string;
        message: string;
    }>;
};
/**
 * Extrai texto para interpretação heurística (PDF ou texto).
 * Não persiste nada; falhas de PDF inválido geram fallback controlado + avisos.
 */
export declare function extractDocumentText(params: {
    buffer: Buffer;
    mimeType: string | undefined;
    fileName: string;
}): Promise<ExtractDocumentTextResult>;
//# sourceMappingURL=extractDocumentText.d.ts.map