export function computeCoberturaTempo(realizadoMinutos, previstoMinutos) {
    const p = previstoMinutos;
    const r = realizadoMinutos;
    if (p <= 0 || !Number.isFinite(p) || !Number.isFinite(r)) {
        return { ratio: null, previstoMinutos: p, realizadoMinutos: r };
    }
    return {
        ratio: r / p,
        previstoMinutos: p,
        realizadoMinutos: r,
    };
}
//# sourceMappingURL=coberturaTempo.js.map