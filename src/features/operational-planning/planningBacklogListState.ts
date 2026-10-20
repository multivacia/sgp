/**
 * Mensagem do backlog do planejamento quando não há cartões visíveis.
 *
 * O fim da lista é decidido só por `hasMore` (cursor nulo): se as páginas carregadas
 * estão todas no plano local mas há continuação, a mensagem não é definitiva e
 * "Carregar mais" continua disponível.
 */
export function resolvePlanningBacklogEmptyMessage(input: {
  visibleCount: number
  loadedCount: number
  query: string
  hasMore: boolean
  loading: boolean
  loadError: string | null
}): string | null {
  if (input.visibleCount > 0 || input.loading) return null
  if (input.loadError) return input.loadError
  if (input.loadedCount > 0) {
    return input.hasMore
      ? 'As atividades carregadas já foram planejadas nesta semana. Use “Carregar mais” para ver as próximas.'
      : 'Todas as atividades carregadas no backlog já foram planejadas nesta semana.'
  }
  if (input.hasMore) return null
  if (input.query.trim()) {
    return 'Nenhuma atividade encontrada para a busca.'
  }
  return 'Nenhuma atividade disponível no backlog operacional. Esteiras com Plano Operacional enviado à fábrica aparecem em Aguardando encaixe.'
}
