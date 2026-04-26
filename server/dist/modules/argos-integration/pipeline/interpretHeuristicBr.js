/**
 * Interpretação heurística BR para OS / oficina — sem UI, só domínio.
 * Confianças em [0,1] para composição com o draft e warnings.
 */
import { classifyDocumentLine, shouldPromoteToServiceLine, } from './classifyDocumentLine.js';
import { extractModelVersionStrongSignal, isPlausibleClientName, isPlausibleVehicleDescription, } from './documentFieldPlausibilityBr.js';
import { formatObservationFragment, normalizeObservationBlock, } from './observationTextFormatting.js';
const RE_OS = /(?:^|[\s\n])OS\s*[Nº°#:]*\s*(\d{3,8})\b/gi;
const RE_ORDEM = /ordem\s+de\s+servi[cç]o[^\d]{0,40}(\d{3,8})/gi;
/** Sem flag `g` em `.match`/`.exec` com grupo de captura. */
const RE_PLATE_OLD = /\b([A-Z]{3}[\s-]?\d{4})\b/i;
const RE_PLATE_MERCOSUL = /([A-Z]{3}\d[A-Z]\d{2})/i;
const RE_CLIENT = /(?:^|\n)\s*cliente\s*[:.\-]?\s*([^\n]{2,120})/i;
const RE_VEIC = /(?:ve[ií]culo|veiculo|carro)\s*[:.\-]?\s*([^\n]{2,120})/i;
const RE_OBS = /(?:observa[cç][aõo]s?|obs\.?)\s*[:.\-]?\s*([\s\S]{2,2000}?)(?=\n\s*(?:total|assin|servi[cç]o|$))/i;
function pickBestOs(text) {
    const candidates = [];
    let m;
    const r1 = new RegExp(RE_OS);
    while ((m = r1.exec(text)) !== null)
        candidates.push(m[1]);
    const r2 = new RegExp(RE_ORDEM);
    while ((m = r2.exec(text)) !== null)
        candidates.push(m[1]);
    if (candidates.length === 0)
        return undefined;
    return candidates.sort((a, b) => b.length - a.length)[0];
}
function pickPlate(text) {
    const compact = text.replace(/\s/g, '').toUpperCase();
    const merc = RE_PLATE_MERCOSUL.exec(compact);
    if (merc?.[1]) {
        return merc[1];
    }
    const spaced = text.toUpperCase();
    const old = RE_PLATE_OLD.exec(spaced);
    if (old?.[1]) {
        return old[1].replace(/\s+/g, '').replace(/(\w{3})(\d{4})/, '$1-$2');
    }
    return undefined;
}
function confidenceFromOperationalScore(operationalScore) {
    return clamp01(0.34 + operationalScore * 0.52);
}
function extractServiceLines(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out = [];
    const supplementalNoteFragments = [];
    let idx = 0;
    for (const line of lines) {
        const classified = classifyDocumentLine(line);
        if (classified.category === 'free_observation' &&
            classified.normalized.length >= 6) {
            supplementalNoteFragments.push(formatObservationFragment(line));
        }
        if (!shouldPromoteToServiceLine(classified))
            continue;
        idx += 1;
        out.push({
            orderIndex: idx,
            title: classified.normalized.slice(0, 500),
            confidence: confidenceFromOperationalScore(classified.operationalScore),
        });
        if (idx >= 40)
            break;
    }
    return { serviceLines: out.slice(0, 25), supplementalNoteFragments };
}
function mergeObservationText(base, fragments) {
    const seen = new Set();
    const parts = [];
    const baseTrim = base?.trim();
    if (baseTrim) {
        parts.push(baseTrim);
        seen.add(baseTrim.toLowerCase());
    }
    for (const f of fragments) {
        const t = f.trim();
        if (t.length < 6)
            continue;
        const low = t.toLowerCase();
        if (seen.has(low))
            continue;
        if (baseTrim && baseTrim.toLowerCase().includes(low))
            continue;
        seen.add(low);
        parts.push(t);
    }
    if (parts.length === 0)
        return undefined;
    return normalizeObservationBlock(parts.join('\n')) || undefined;
}
function clamp01(n) {
    return Math.min(1, Math.max(0, n));
}
/**
 * Interpreta texto livre (pós-extração) e nome de ficheiro.
 */
export function interpretHeuristicBr(params) {
    const text = params.text.replace(/\u00a0/g, ' ');
    const baseName = params.fileName.replace(/\.[^.]+$/, '').trim();
    const fc = {};
    const os = pickBestOs(text);
    if (os)
        fc.osNumber = 0.78;
    const plate = pickPlate(text);
    if (plate)
        fc.licensePlate = plate.length >= 7 ? 0.85 : 0.55;
    const cm = text.match(RE_CLIENT);
    const clientRaw = cm?.[1]?.trim();
    const clientName = clientRaw && isPlausibleClientName(clientRaw) ? clientRaw : undefined;
    if (clientName)
        fc.clientName = 0.65;
    const vm = text.match(RE_VEIC);
    const vehicleRaw = vm?.[1]?.trim();
    const vehicleDescription = vehicleRaw && isPlausibleVehicleDescription(vehicleRaw)
        ? vehicleRaw
        : undefined;
    const modelVersion = extractModelVersionStrongSignal(text);
    if (modelVersion)
        fc.modelVersion = 0.55;
    const om = text.match(RE_OBS);
    const obsBlock = om?.[1]?.trim();
    const notesFromObs = obsBlock
        ? normalizeObservationBlock(obsBlock) || undefined
        : undefined;
    const { serviceLines, supplementalNoteFragments } = extractServiceLines(text);
    const notes = mergeObservationText(notesFromObs, supplementalNoteFragments);
    for (const sl of serviceLines) {
        fc[`serviceLine.${sl.orderIndex}`] = sl.confidence;
    }
    let suggestedEsteiraTitle;
    let suggestedEsteiraDescription;
    if (os && plate) {
        suggestedEsteiraTitle = `OS ${os} — ${plate}`;
        fc.suggestedEsteiraTitle = 0.7;
    }
    else if (os) {
        suggestedEsteiraTitle = `OS ${os}`;
        fc.suggestedEsteiraTitle = 0.62;
    }
    else if (baseName.length > 2) {
        suggestedEsteiraTitle = baseName;
        fc.suggestedEsteiraTitle = 0.35;
    }
    if (vehicleDescription || clientName) {
        suggestedEsteiraDescription = [clientName && `Cliente: ${clientName}`, vehicleDescription]
            .filter(Boolean)
            .join(' · ');
        fc.suggestedEsteiraDescription = 0.55;
    }
    else if (notes && notes.length < 400) {
        suggestedEsteiraDescription = notes.slice(0, 400);
        fc.suggestedEsteiraDescription = 0.4;
    }
    let priorityHint;
    if (/\burgente\b/i.test(text) || /\bprioridade\s*[:.]?\s*alta\b/i.test(text)) {
        priorityHint = 'alta';
        fc.priorityHint = 0.5;
    }
    else if (/\brotina\b/i.test(text)) {
        priorityHint = 'baixa';
        fc.priorityHint = 0.35;
    }
    return {
        osNumber: os,
        licensePlate: plate,
        clientName,
        vehicleDescription,
        modelVersion,
        notes,
        serviceLines,
        suggestedEsteiraTitle,
        suggestedEsteiraDescription,
        priorityHint,
        fieldConfidence: Object.fromEntries(Object.entries(fc).map(([k, v]) => [k, clamp01(v)])),
    };
}
//# sourceMappingURL=interpretHeuristicBr.js.map