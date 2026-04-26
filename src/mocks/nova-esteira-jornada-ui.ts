import type { NovaEsteiraEstruturaOrigem } from './nova-esteira-domain'

export function labelPontoPartidaLeitura(
  o: NovaEsteiraEstruturaOrigem | null,
): string {
  if (o === 'BASE_ESTEIRA') return 'Usar base de esteira'
  if (
    o === 'MONTAGEM_UNIFICADA' ||
    o === 'MANUAL' ||
    o === 'BASE_TAREFA'
  ) {
    return 'Montar estrutura operacional'
  }
  return 'Ainda não definido'
}
