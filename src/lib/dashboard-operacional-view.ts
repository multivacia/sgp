/**
 * Modo de leitura do Dashboard Operacional — só altera renderização; a fonte continua
 * sendo o snapshot `DashboardOperacional` já filtrado (`aplicarFiltrosDashboard`).
 */
export type DashboardOperacionalViewMode = 'cards' | 'graficos'

export const DASHBOARD_VIEW_MODES: DashboardOperacionalViewMode[] = [
  'cards',
  'graficos',
]
