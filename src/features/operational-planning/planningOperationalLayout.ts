/**
 * Contratos estáveis do layout operacional (testids / classes).
 * Usados no JSX e nos testes unitários de contrato.
 */

export const PLANNING_LAYOUT_TEST_IDS = {
  pageRoot: 'planning-page-root',
  operationalWorkspace: 'planning-operational-workspace',
  backlogScrollArea: 'planning-backlog-scroll-area',
  collaboratorsScrollArea: 'planning-collaborators-scroll-area',
  backlogColumn: 'planning-backlog-column',
  collaboratorsColumn: 'planning-collaborators-column',
} as const

/**
 * Root da página: crescimento natural para o `main` do AppShell rolar.
 * Não usar altura fixa + max-h + overflow-hidden aqui.
 */
export const PLANNING_PAGE_ROOT_CLASS =
  'mx-auto flex max-w-[1600px] flex-col gap-6 pb-8 lg:min-h-[calc(100dvh-7.5rem)]'

/** Classes legadas que prendiam o scroll da página — não devem aparecer no root. */
export const PLANNING_PAGE_ROOT_FORBIDDEN_CLASSES = [
  'lg:h-[calc(100dvh-7.5rem)]',
  'lg:max-h-[calc(100dvh-7.5rem)]',
  'lg:overflow-hidden',
] as const

/** Cabeçalho / KPIs / filtros: altura natural. */
export const PLANNING_UPPER_SECTION_CLASS = 'space-y-6'

/**
 * Workspace operacional: no desktop, altura útil limitada para scroll interno
 * equivalente nas colunas, sem prender a página inteira.
 */
export const PLANNING_OPERATIONAL_WORKSPACE_CLASS =
  'flex flex-col gap-6 lg:grid lg:h-[min(70dvh,48rem)] lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-stretch lg:gap-8 lg:overflow-hidden'

export const PLANNING_BACKLOG_COLUMN_CLASS =
  'flex min-h-[18rem] flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 lg:min-h-0'

export const PLANNING_COLLABORATORS_COLUMN_CLASS =
  'flex min-h-[18rem] flex-col overflow-hidden lg:min-h-0'

/**
 * Scroll do backlog: overflow-y-auto + min-h-0.
 * Sem overscroll-contain para encadear rolagem ao main ao atingir o limite.
 */
export const PLANNING_BACKLOG_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-y-auto max-h-[min(55dvh,26rem)] lg:max-h-none'

/**
 * Scroll dos colaboradores: overflow-auto (Y + X do quadro) + min-h-0.
 * Sem overscroll-contain.
 */
export const PLANNING_COLLABORATORS_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-auto max-h-[min(60dvh,32rem)] lg:max-h-none'

/** DnDContext envolve backlog + colaboradores (contrato documental). */
export const PLANNING_DND_WRAPS_BOTH_COLUMNS = true
