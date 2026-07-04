import { describe, expect, it } from 'vitest'
import { buildWeeklyAgendaBacklogEmptyMessage } from './weeklyAgendaBacklogEmptyMessage'

describe('buildWeeklyAgendaBacklogEmptyMessage', () => {
  it('returns null when visible items exist', () => {
    expect(
      buildWeeklyAgendaBacklogEmptyMessage({
        visibleCount: 2,
        loadedCount: 3,
        searchQuery: '',
      }),
    ).toBeNull()
  })

  it('returns planned message when loaded items are all in the plan', () => {
    expect(
      buildWeeklyAgendaBacklogEmptyMessage({
        visibleCount: 0,
        loadedCount: 4,
        searchQuery: '',
      }),
    ).toBe('Todas as atividades carregadas no backlog já foram planejadas nesta semana.')
  })

  it('returns search message when query has no matches', () => {
    expect(
      buildWeeklyAgendaBacklogEmptyMessage({
        visibleCount: 0,
        loadedCount: 0,
        searchQuery: 'xyz',
      }),
    ).toBe('Nenhuma atividade encontrada para a busca.')
  })

  it('returns default empty backlog message', () => {
    expect(
      buildWeeklyAgendaBacklogEmptyMessage({
        visibleCount: 0,
        loadedCount: 0,
        searchQuery: '',
      }),
    ).toBe(
      'Nenhuma atividade disponível no backlog operacional. Esteiras com Plano Operacional enviado à fábrica aparecem em Aguardando encaixe.',
    )
  })
})
