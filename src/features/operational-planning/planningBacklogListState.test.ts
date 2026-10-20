import { describe, expect, it } from 'vitest'
import { buildVisiblePlanningBacklogItems } from './buildVisiblePlanningBacklogItems'
import { resolvePlanningBacklogEmptyMessage } from './planningBacklogListState'

const base = { query: '', loading: false, loadError: null }

describe('resolvePlanningBacklogEmptyMessage', () => {
  it('1ª página toda no plano local com continuação: não é vazio definitivo', () => {
    const loaded = Array.from({ length: 100 }, (_, i) => ({ activityNodeId: `a${i}` }))
    const planned = loaded.map((b) => ({ activityNodeId: b.activityNodeId }))
    const visible = buildVisiblePlanningBacklogItems(loaded, planned)
    expect(visible).toHaveLength(0)

    const msg = resolvePlanningBacklogEmptyMessage({
      ...base,
      visibleCount: visible.length,
      loadedCount: loaded.length,
      hasMore: true,
    })
    expect(msg).toContain('Carregar mais')
    expect(
      resolvePlanningBacklogEmptyMessage({ ...base, visibleCount: 0, loadedCount: 100, hasMore: false }),
    ).toBe('Todas as atividades carregadas no backlog já foram planejadas nesta semana.')
  })

  it('itens visíveis ou carregando: sem mensagem', () => {
    expect(resolvePlanningBacklogEmptyMessage({ ...base, visibleCount: 3, loadedCount: 3, hasMore: true })).toBeNull()
    expect(
      resolvePlanningBacklogEmptyMessage({ ...base, loading: true, visibleCount: 0, loadedCount: 0, hasMore: false }),
    ).toBeNull()
  })

  it('vazio real, busca sem resultado e erro de carregamento', () => {
    expect(resolvePlanningBacklogEmptyMessage({ ...base, visibleCount: 0, loadedCount: 0, hasMore: false })).toContain(
      'Nenhuma atividade disponível',
    )
    expect(
      resolvePlanningBacklogEmptyMessage({ ...base, query: '7467', visibleCount: 0, loadedCount: 0, hasMore: false }),
    ).toBe('Nenhuma atividade encontrada para a busca.')
    expect(
      resolvePlanningBacklogEmptyMessage({
        ...base,
        loadError: 'Não foi possível carregar o backlog.',
        visibleCount: 0,
        loadedCount: 0,
        hasMore: false,
      }),
    ).toBe('Não foi possível carregar o backlog.')
  })
})
