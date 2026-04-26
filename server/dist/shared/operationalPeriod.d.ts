/**
 * Recortes temporais padronizados (V1.5). Intervalo [from, to] com `to` inclusivo
 * para consultas SQL (`entry_at <= to`).
 *
 * `month` = desde o início do mês civil em UTC até `now`.
 */
export type OperationalPeriodPreset = '7d' | '15d' | '30d' | 'month' | 'custom';
export type ResolvedOperationalPeriod = {
    from: Date;
    to: Date;
    preset: OperationalPeriodPreset;
};
/**
 * Resolve o intervalo usado em histórico / “minutos apontados (período)”.
 */
export declare function resolveOperationalPeriod(args: {
    preset: OperationalPeriodPreset;
    /** Obrigatório se `preset === 'custom'`. */
    customFrom?: Date;
    customTo?: Date;
    now?: Date;
}): ResolvedOperationalPeriod;
//# sourceMappingURL=operationalPeriod.d.ts.map