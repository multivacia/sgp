import type { ReactNode } from 'react'
import { MatrixActionsMenuProvider } from './MatrixContextActionsMenu'

export type OperationMatrixEditorWorkbenchProps = {
  /** Quando falso, não envolve em `MatrixActionsMenuProvider` (raro). */
  wrapWithMatrixActionsMenu?: boolean
  metricsStrip: ReactNode
  stripEnd?: ReactNode
  /** Quando falso, o campo «Buscar» não é renderizado (ex.: busca embutida num painel). */
  showSearchInput?: boolean
  searchValue: string
  onSearchChange: (value: string) => void
  searchAriaLabel?: string
  leftColumn: ReactNode
  rightColumn: ReactNode
  /**
   * `classic` = árvore flex + aside fixo (Editar matriz).
   * `wideRight` = catálogo ~40% + rascunho ~60% com altura partilhada (etapa Estrutura da nova matriz).
   */
  columnLayout?: 'classic' | 'wideRight'
}

/**
 * Casca visual central partilhada entre Editar Matriz (API-first) e Nova Matriz / Estrutura (draft).
 * Espelha o layout de `OperationMatrixEditorPage` (faixa métricas + ações, busca, duas colunas).
 */
export function OperationMatrixEditorWorkbench({
  wrapWithMatrixActionsMenu = true,
  metricsStrip,
  stripEnd,
  showSearchInput = true,
  searchValue,
  onSearchChange,
  searchAriaLabel = 'Buscar na composição',
  leftColumn,
  rightColumn,
  columnLayout = 'classic',
}: OperationMatrixEditorWorkbenchProps) {
  const isWideRight = columnLayout === 'wideRight'

  const inner = (
    <div
      className={`flex flex-col gap-6 lg:flex-row lg:gap-6 xl:gap-8 ${
        isWideRight ? 'lg:items-stretch' : 'lg:items-start'
      }`}
    >
      <section
        className={
          isWideRight
            ? 'flex min-h-0 w-full min-w-0 flex-col space-y-3 pb-1 pt-0 max-h-[min(70dvh,calc(100dvh-10rem))] lg:max-h-[min(78dvh,calc(100dvh-6rem))] lg:w-[40%] lg:max-w-[40%] lg:shrink-0'
            : 'min-w-0 flex-1 space-y-3 pb-1 pt-0'
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">{metricsStrip}</div>
          {stripEnd ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pt-0.5">
              {stripEnd}
            </div>
          ) : null}
        </div>
        {showSearchInput ? (
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar…"
            aria-label={searchAriaLabel}
            autoComplete="off"
            className="sgp-input-app w-full rounded-xl border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        ) : null}
        <div
          className={
            isWideRight
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'contents'
          }
        >
          {leftColumn}
        </div>
      </section>
      <aside
        className={
          isWideRight
            ? 'flex min-h-0 w-full min-w-0 flex-col max-h-[min(70dvh,calc(100dvh-10rem))] lg:max-h-[min(78dvh,calc(100dvh-6rem))] lg:w-[60%] lg:max-w-none lg:flex-1'
            : 'w-full max-w-full shrink-0 lg:sticky lg:top-2 lg:w-[26rem] lg:max-w-[min(26rem,100%)] xl:w-[30rem] xl:max-w-[min(30rem,100%)]'
        }
      >
        <div
          className={
            isWideRight
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'contents'
          }
        >
          {rightColumn}
        </div>
      </aside>
    </div>
  )

  if (wrapWithMatrixActionsMenu) {
    return <MatrixActionsMenuProvider>{inner}</MatrixActionsMenuProvider>
  }

  return inner
}
