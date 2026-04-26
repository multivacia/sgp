/**
 * Triagem semântica de linhas documentais antes de promover a linha de serviço inferida.
 * Ordem: normalizar → ordinal colado (PDF) → marcador de lista → strip de prefixo → bloqueios fortes → score operacional.
 */
const MAX_LINE_LEN = 240;
/** Linhas muito curtas raramente são serviço útil; 2 chars pode ser lixo de PDF. */
const MIN_CONTENT_LEN = 2;
/** Promover a service_line só acima disto (salvo reforço explícito de lista). */
export const SERVICE_LINE_SCORE_THRESHOLD = 0.42;
const RE_CNPJ = /\b\d{2}\.\d{3}\.\d{3}\s*\/\s*\d{4}-\d{2}\b|\b\d{14}\b/;
const RE_CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
/** Lexico leve de oficina / tapeçaria — evita matar serviços curtos operacionais. */
const RE_OPERATIONAL_LEXICON = /\b(porta[\s-]?malas|costura|costuras|espuma|lateral|laterais|bancos?|couro|revestimento|reformas?|reforma|trocas?|troca|refor[cç]o|aplica[cç][aã]o|sint[eé]ticos?|pe[cç]as?|tapetes?|carpetes?|limpezas?|polimento|aparente|costura|estofados?|laterais?|portas?|forros?|capas?)\b/i;
/** Frase nominal curta com hífen (ex.: "Porta-malas"). */
const RE_HYPHENATED_NOUN = /^[a-záéíóúãõç]+(-[a-záéíóúãõç]+)+$/i;
/**
 * Marcadores de item de lista (serviço explícito).
 * Inclui ordinal colado já separado por `splitGluedOrdinalPrefix` (ex.: "1 Courvin…").
 */
const RE_LIST_MARKER = /^\d{1,2}[\).\-]\s+|^\d{1,2}\s+(?=\p{L})|^[-•*]\s+/u;
const RE_ONLY_PUNCT_OR_DIGITS = /^[\d\s.,;:/\\|_\-–—]+$/i;
/**
 * Normalização para classificação (não altera o extrator de PDF).
 */
export function normalizeDocumentLine(raw) {
    let s = raw.replace(/\u00a0/g, ' ').replace(/[\u200b\uFEFF]/g, '');
    s = s.replace(/[ \t\f\v]+/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
}
/**
 * PDFs costumem emitir ordinal colado à palavra seguinte ("1Courvin").
 * Insere espaço após 1–2 dígitos iniciais quando o próximo caractere é letra,
 * antes de qualquer score ou reforço operacional.
 */
export function splitGluedOrdinalPrefix(line) {
    return line.replace(/^(\d{1,2})(?=\p{L})/u, '$1 ');
}
/**
 * Remove prefixo numérico / marcador de lista para avaliar o conteúdo semântico.
 */
export function stripListPrefix(line) {
    return line
        .replace(/^\d{1,3}[\).\s\-–—]+\s*/, '')
        .replace(/^[-•*]\s+/, '')
        .replace(/^(servi[cç]o|descri[cç][aã]o|item)\s*:\s*/i, '')
        .trim();
}
const BLOCK_RULES = [
    {
        test: (s) => s.length === 0,
        category: 'noise',
        reason: 'empty',
    },
    {
        test: (s) => s.length > MAX_LINE_LEN,
        category: 'noise',
        reason: 'line_too_long',
    },
    {
        test: (s) => RE_CNPJ.test(s) || RE_CPF.test(s),
        category: 'metadata',
        reason: 'tax_id_pattern',
    },
    {
        test: (s) => /\bcnpj\b/i.test(s) && /\d/.test(s),
        category: 'metadata',
        reason: 'cnpj_label_with_digits',
    },
    {
        test: (s) => /\bcpf\b/i.test(s) && /\d/.test(s),
        category: 'metadata',
        reason: 'cpf_label_with_digits',
    },
    {
        test: (s) => /\b(LTDA\.?|EIRELI|E\.P\.P\.?|S\.A\.?|ME\.)\s*$/i.test(s) && s.length > 12,
        category: 'metadata',
        reason: 'company_suffix',
    },
    {
        test: (s) => /^(ordem\s+de\s+servi[çc]o|ordem\s+de\s+servi[çc]o\s*[-–—]\s*os)\b/i.test(s),
        category: 'label',
        reason: 'document_title_os',
    },
    {
        test: (s) => /^os\s*[-–—]\s*os\b/i.test(s),
        category: 'label',
        reason: 'os_header_noise',
    },
    {
        test: (s) => /documento\s+fict[ií]cio|simula[cç][aã]o|n[aã]o\s+correspondem\s+a|fins?\s+de\s+teste/i.test(s),
        category: 'disclaimer',
        reason: 'fictional_disclaimer',
    },
    {
        test: (s) => /^dados\s+do\s+cliente\b/i.test(s),
        category: 'label',
        reason: 'section_client',
    },
    {
        test: (s) => /^dados\s+do\s+ve[ií]culo\b(?:\s*:)?\s*$/i.test(s),
        category: 'label',
        reason: 'section_vehicle',
    },
    {
        test: (s) => /^escopo\s+solicitado\b(?:\s*:)?\s*$/i.test(s),
        category: 'label',
        reason: 'section_scope_requested',
    },
    {
        test: (s) => /^observa[cç][oõ]es\s+(?:comerciais\s+e\s+técnicas|comerciais|técnicas)\s*:?\s*$/i.test(s),
        category: 'label',
        reason: 'section_observations_heading',
    },
    {
        test: (s) => /^emiss[aã]o\s*:/i.test(s),
        category: 'metadata',
        reason: 'emission_date',
    },
    {
        test: (s) => /^prioridade\s*:/i.test(s) && s.length < 80,
        category: 'metadata',
        reason: 'priority_field',
    },
    {
        test: (s) => /^cliente\s*:/i.test(s),
        category: 'metadata',
        reason: 'client_field_line',
    },
    {
        test: (s) => /^(ve[ií]culo|veiculo|placa)\s*:/i.test(s),
        category: 'metadata',
        reason: 'vehicle_plate_field',
    },
    {
        test: (s) => /^placa\s+[A-Z]{3}[\s-]?\d{4}\s*$/i.test(s) ||
            /^placa\s+[A-Z]{3}\d[A-Z]\d{2}\s*$/i.test(s),
        category: 'metadata',
        reason: 'license_plate_plain_line',
    },
    {
        test: (s) => /^(servi[cç]o|pe[cç]a|item|descri[cç][aã]o|qtd|quantidade)\s*:?\s*$/i.test(s),
        category: 'label',
        reason: 'table_header_only',
    },
    {
        test: (s) => RE_ONLY_PUNCT_OR_DIGITS.test(s) && s.length < 24,
        category: 'noise',
        reason: 'only_separators_or_digits',
    },
];
function applyHardBlocks(content) {
    for (const rule of BLOCK_RULES) {
        if (rule.test(content)) {
            return { category: rule.category, reason: rule.reason };
        }
    }
    return null;
}
function computeOperationalScore(params) {
    const { content, hadListMarker, hasPriceToken } = params;
    const len = content.length;
    let score = 0;
    if (hadListMarker)
        score += 0.34;
    if (hasPriceToken)
        score += 0.28;
    if (/[a-záéíóúãõç]/i.test(content))
        score += 0.12;
    if (len >= 8 && len <= 160)
        score += 0.14;
    else if (len >= 4 && len <= 7)
        score += 0.06;
    else if (len > 160 && len <= MAX_LINE_LEN)
        score += 0.05;
    if (RE_OPERATIONAL_LEXICON.test(content))
        score += 0.26;
    if (RE_HYPHENATED_NOUN.test(content))
        score += 0.22;
    /** Nome composto curto sem verbo explícito (ex.: "Espuma lateral"). */
    if (len >= 6 && len <= 48 && /^[\p{L}\p{M}\s\-–]+$/u.test(content)) {
        const words = content.split(/\s+/).filter(Boolean);
        if (words.length >= 1 && words.length <= 5)
            score += 0.12;
    }
    return Math.min(1, score);
}
/**
 * Classifica uma linha bruta do documento.
 * Use `stripListPrefix` no título persistido; a classificação usa o mesmo conteúdo sem prefixo.
 */
export function classifyDocumentLine(rawLine) {
    const normalized = splitGluedOrdinalPrefix(normalizeDocumentLine(rawLine));
    const hadListMarker = RE_LIST_MARKER.test(normalized);
    const hasPriceToken = /R\$\s*[\d.,]+/.test(normalized);
    const content = stripListPrefix(normalized);
    if (content.length < MIN_CONTENT_LEN) {
        return {
            category: 'noise',
            normalized: content,
            operationalScore: 0,
            blockReason: 'too_short_after_strip',
        };
    }
    const blocked = applyHardBlocks(content);
    if (blocked) {
        return {
            category: blocked.category,
            normalized: content,
            operationalScore: 0,
            blockReason: blocked.reason,
        };
    }
    let operationalScore = computeOperationalScore({
        content,
        strippedFromRaw: content,
        hadListMarker,
        hasPriceToken,
    });
    /** Reforço: serviços curtos e plausíveis não morrem por threshold. */
    if (content.length >= 3 && content.length <= 42) {
        if (RE_OPERATIONAL_LEXICON.test(content) || RE_HYPHENATED_NOUN.test(content)) {
            operationalScore = Math.max(operationalScore, 0.58);
        }
    }
    if (hadListMarker) {
        operationalScore = Math.max(operationalScore, 0.52);
    }
    if (hasPriceToken) {
        operationalScore = Math.max(operationalScore, 0.5);
    }
    let category;
    if (operationalScore >= SERVICE_LINE_SCORE_THRESHOLD) {
        category = 'service_line';
    }
    else if (operationalScore >= 0.22) {
        category = 'free_observation';
    }
    else {
        category = 'noise';
    }
    return {
        category,
        normalized: content,
        operationalScore: Math.round(Math.min(1, operationalScore) * 1000) / 1000,
    };
}
/**
 * Indica se a linha deve virar linha de serviço inferida (step).
 */
export function shouldPromoteToServiceLine(result) {
    return result.category === 'service_line' && result.operationalScore >= SERVICE_LINE_SCORE_THRESHOLD;
}
//# sourceMappingURL=classifyDocumentLine.js.map