// Import direto da lib: o `index.js` do pacote executa um bloco de debug quando
// `!module.parent`, o que falha sob Vitest/ESM (tenta ler `test/data/*.pdf`).
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
function looksPdfMagic(buf) {
    const head = buf.subarray(0, 5).toString('ascii');
    return head.startsWith('%PDF-');
}
function tryDecodeUtf8(buf) {
    const s = buf.toString('utf8');
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s)) {
        return buf.toString('latin1');
    }
    return s;
}
/**
 * Extrai texto para interpretação heurística (PDF ou texto).
 * Não persiste nada; falhas de PDF inválido geram fallback controlado + avisos.
 */
export async function extractDocumentText(params) {
    const { buffer, mimeType } = params;
    const mime = (mimeType ?? '').toLowerCase();
    const warnings = [];
    if (mime.startsWith('text/') || mime === 'application/json') {
        return {
            text: tryDecodeUtf8(buffer).replace(/\uFEFF/g, '').trim(),
            source: 'text',
            extractWarnings: warnings,
        };
    }
    const asPdf = mime === 'application/pdf' || (!mime && looksPdfMagic(buffer)) || looksPdfMagic(buffer);
    if (asPdf) {
        try {
            const parsed = await pdfParse(buffer);
            const text = (parsed.text ?? '').trim();
            return {
                text,
                pageCount: typeof parsed.numpages === 'number' ? parsed.numpages : undefined,
                source: 'pdf',
                extractWarnings: warnings,
            };
        }
        catch {
            warnings.push({
                code: 'extract.pdf_structure_invalid',
                message: 'Não foi possível ler a estrutura do PDF; texto obtido por fallback pode ser incompleto.',
            });
            const fallback = tryDecodeUtf8(buffer)
                .replace(/[^\S\r\n]+/g, ' ')
                .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
                .trim();
            return {
                text: fallback,
                source: 'binary_fallback',
                extractWarnings: warnings,
            };
        }
    }
    const text = tryDecodeUtf8(buffer).trim();
    if (!text) {
        warnings.push({
            code: 'extract.empty',
            message: 'Nenhum texto legível extraído do ficheiro.',
        });
    }
    return {
        text,
        source: 'binary_fallback',
        extractWarnings: warnings,
    };
}
//# sourceMappingURL=extractDocumentText.js.map