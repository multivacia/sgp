export function buildWeeklyAgendaBacklogEmptyMessage(params: {
  visibleCount: number
  loadedCount: number
  searchQuery: string
}): string | null {
  const { visibleCount, loadedCount, searchQuery } = params
  if (visibleCount > 0) return null
  if (loadedCount > 0) {
    return 'Todas as atividades carregadas no backlog já foram planejadas nesta semana.'
  }
  if (searchQuery.trim()) {
    return 'Nenhuma atividade encontrada para a busca.'
  }
  return 'Nenhuma atividade disponível no backlog operacional. Esteiras com Plano Operacional enviado à fábrica aparecem em Aguardando encaixe.'
}
