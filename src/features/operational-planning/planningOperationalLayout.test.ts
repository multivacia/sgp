import { describe, expect, it } from 'vitest'
import {
  SHOW_PLANNING_PRINCIPAL_DEVIATIONS,
  SHOW_PLANNING_SECONDARY_TABS,
} from './planningUiFlags'
import {
  PLANNING_BACKLOG_COLUMN_CLASS,
  PLANNING_BACKLOG_SCROLL_CLASS,
  PLANNING_COLLABORATORS_COLUMN_CLASS,
  PLANNING_COLLABORATORS_SCROLL_CLASS,
  PLANNING_DND_WRAPS_BOTH_COLUMNS,
  PLANNING_LAYOUT_TEST_IDS,
  PLANNING_OPERATIONAL_WORKSPACE_CLASS,
  PLANNING_PAGE_ROOT_CLASS,
  PLANNING_PAGE_ROOT_FORBIDDEN_CLASSES,
  PLANNING_UPPER_SECTION_CLASS,
} from './planningOperationalLayout'

export { PLANNING_LAYOUT_TEST_IDS }

describe('planning operational layout contract', () => {
  it('mantém testids estáveis para página, área operacional e scrolls', () => {
    expect(PLANNING_LAYOUT_TEST_IDS.pageRoot).toBe('planning-page-root')
    expect(PLANNING_LAYOUT_TEST_IDS.operationalWorkspace).toBe('planning-operational-workspace')
    expect(PLANNING_LAYOUT_TEST_IDS.backlogScrollArea).toBe('planning-backlog-scroll-area')
    expect(PLANNING_LAYOUT_TEST_IDS.collaboratorsScrollArea).toBe(
      'planning-collaborators-scroll-area',
    )
    expect(PLANNING_LAYOUT_TEST_IDS.backlogColumn).toBe('planning-backlog-column')
    expect(PLANNING_LAYOUT_TEST_IDS.collaboratorsColumn).toBe('planning-collaborators-column')
  })

  it('root da página não usa combo altura fixa + overflow-hidden que bloqueia o main', () => {
    for (const forbidden of PLANNING_PAGE_ROOT_FORBIDDEN_CLASSES) {
      expect(PLANNING_PAGE_ROOT_CLASS).not.toContain(forbidden)
    }
    expect(PLANNING_PAGE_ROOT_CLASS).not.toMatch(/\blg:overflow-hidden\b/)
    expect(PLANNING_PAGE_ROOT_CLASS).not.toMatch(/\blg:h-\[calc\(100dvh/)
    expect(PLANNING_UPPER_SECTION_CLASS).toBe('space-y-6')
  })

  it('workspace desktop tem altura limitada e grid de duas colunas', () => {
    expect(PLANNING_OPERATIONAL_WORKSPACE_CLASS).toContain('lg:h-[min(70dvh,48rem)]')
    expect(PLANNING_OPERATIONAL_WORKSPACE_CLASS).toContain(
      'lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]',
    )
    expect(PLANNING_OPERATIONAL_WORKSPACE_CLASS).toMatch(/\blg:grid\b/)
  })

  it('backlog tem scroll vertical próprio sem overscroll-contain', () => {
    expect(PLANNING_BACKLOG_SCROLL_CLASS).toContain('overflow-y-auto')
    expect(PLANNING_BACKLOG_SCROLL_CLASS).toContain('min-h-0')
    expect(PLANNING_BACKLOG_SCROLL_CLASS).not.toContain('overscroll-contain')
  })

  it('colaboradores têm scroll próprio com eixo X (overflow-auto) sem overscroll-contain', () => {
    expect(PLANNING_COLLABORATORS_SCROLL_CLASS).toContain('overflow-auto')
    expect(PLANNING_COLLABORATORS_SCROLL_CLASS).toContain('min-h-0')
    expect(PLANNING_COLLABORATORS_SCROLL_CLASS).not.toContain('overscroll-contain')
  })

  it('colunas backlog e quadro preservam overflow-hidden interno', () => {
    expect(PLANNING_BACKLOG_COLUMN_CLASS).toContain('overflow-hidden')
    expect(PLANNING_COLLABORATORS_COLUMN_CLASS).toContain('overflow-hidden')
  })

  it('DnD envolve as duas áreas (contrato documental)', () => {
    expect(PLANNING_DND_WRAPS_BOTH_COLUMNS).toBe(true)
  })

  it('preserva abas secundárias e Principais desvios ocultos', () => {
    expect(SHOW_PLANNING_SECONDARY_TABS).toBe(false)
    expect(SHOW_PLANNING_PRINCIPAL_DEVIATIONS).toBe(false)
  })
})
