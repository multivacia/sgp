/**
 * Helpers usados em testes e cenários legados.
 * O select **Responsável / Gestor** na Nova Esteira usa `getCollaboratorsService()`
 * (mock/real/auto) — ver `useNovaEsteiraResponsaveisOptions`.
 */

import { listColaboradoresOperacionaisAtivosParaSelecao } from './colaboradores-operacionais-repository'

/** Nomes para dropdown de nova esteira — sempre espelha a fonte no momento da chamada. */
export function getNovaEsteiraResponsaveisNomes(): string[] {
  return listColaboradoresOperacionaisAtivosParaSelecao()
    .map((c) => c.nome)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/**
 * Inclui o valor atual se estiver fora da lista (ex.: colaborador inativado), para não perder o estado do rascunho.
 */
export function getNovaEsteiraResponsaveisNomesComLegado(
  responsavelAtual?: string,
): string[] {
  const base = new Set(getNovaEsteiraResponsaveisNomes())
  const t = responsavelAtual?.trim()
  if (t && !base.has(t)) base.add(t)
  return [...base].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
