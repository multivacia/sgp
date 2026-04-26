/**
 * Recortes temporais padronizados (V1.5). Intervalo [from, to] com `to` inclusivo
 * para consultas SQL (`entry_at <= to`).
 *
 * `month` = desde o início do mês civil em UTC até `now`.
 */
function startOfUtcMonth(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
function addDays(d, days) {
    return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}
/**
 * Resolve o intervalo usado em histórico / “minutos apontados (período)”.
 */
export function resolveOperationalPeriod(args) {
    const now = args.now ?? new Date();
    if (args.preset === 'custom') {
        const from = args.customFrom;
        const to = args.customTo;
        if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            throw new Error('resolveOperationalPeriod: custom requer customFrom e customTo válidos.');
        }
        return { from, to, preset: 'custom' };
    }
    const to = now;
    let from;
    switch (args.preset) {
        case '15d':
            from = addDays(to, -15);
            break;
        case '30d':
            from = addDays(to, -30);
            break;
        case 'month':
            from = startOfUtcMonth(to);
            break;
        case '7d':
            from = addDays(to, -7);
            break;
        default:
            from = addDays(to, -7);
            break;
    }
    return { from, to, preset: args.preset };
}
//# sourceMappingURL=operationalPeriod.js.map