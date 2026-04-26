/**
 * Cobertura de tempo (V1.5): razão entre minutos apontados e previsto estrutural,
 * apenas em escopo fechado (mesmo universo de STEPs / previsto).
 *
 * Não devolver 0% quando o denominador é inválido — usar null (não aplicável).
 */
export type CoberturaTempoResult = {
  /** `realizado / previsto` quando previsto > 0; caso contrário null. */
  ratio: number | null
  previstoMinutos: number
  realizadoMinutos: number
}

export function computeCoberturaTempo(
  realizadoMinutos: number,
  previstoMinutos: number,
): CoberturaTempoResult {
  const p = previstoMinutos
  const r = realizadoMinutos
  if (p <= 0 || !Number.isFinite(p) || !Number.isFinite(r)) {
    return { ratio: null, previstoMinutos: p, realizadoMinutos: r }
  }
  return {
    ratio: r / p,
    previstoMinutos: p,
    realizadoMinutos: r,
  }
}
