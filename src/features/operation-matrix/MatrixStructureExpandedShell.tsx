import type { ReactNode } from 'react'

export type MatrixStructureExpandedShellProps = {
  /** Quando ativo, exibe workspace tela cheia; quando inativo, repassa filhos sem wrapper de layout. */
  active: boolean
  /** Nome da oferta (raiz ITEM), quando disponível. */
  matrixName?: string
  /** Há alterações de formulário ou ordem local não persistidas. */
  hasDraftChanges: boolean
  busy: boolean
  onClose: () => void
  /**
   * Persistência imediata (edição de matriz). Em fluxos só-rascunho (Nova Matriz),
   * use `showHeaderSaveButton={false}` e omita este callback.
   */
  onSave?: () => void | Promise<void>
  /**
   * Quando falso, oculta «Salvar alterações» no cabeçalho (persistência ocorre noutro CTA da página).
   * @default true
   */
  showHeaderSaveButton?: boolean
  children: ReactNode
}

/**
 * Workspace focado para edição da estrutura. Com `active=false` usa `display: contents`
 * para não duplicar/remontar a árvore de edição ao alternar o modo expandido.
 */
export function MatrixStructureExpandedShell({
  active,
  matrixName,
  hasDraftChanges,
  busy,
  onClose,
  onSave,
  showHeaderSaveButton = true,
  children,
}: MatrixStructureExpandedShellProps) {
  const showSave = showHeaderSaveButton && typeof onSave === 'function'
  return (
    <div
      className={
        active
          ? 'fixed inset-0 z-[100] flex flex-col border-l border-white/[0.08] bg-sgp-void shadow-[0_0_0_1px_rgba(0,0,0,0.4)]'
          : 'contents'
      }
      role={active ? 'dialog' : undefined}
      aria-modal={active ? true : undefined}
      aria-labelledby={active ? 'matrix-structure-expanded-title' : undefined}
    >
      {active ? (
        <header className="flex shrink-0 flex-col gap-3 border-b border-white/[0.1] bg-sgp-app-panel-deep/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
          <div className="min-w-0">
            <h1
              id="matrix-structure-expanded-title"
              className="font-heading text-base font-bold tracking-tight text-slate-100"
            >
              Estrutura da matriz
            </h1>
            {matrixName?.trim() ? (
              <p className="mt-0.5 truncate text-sm text-slate-400" title={matrixName}>
                {matrixName.trim()}
              </p>
            ) : null}
            {hasDraftChanges ? (
              <p className="mt-1.5 text-[11px] text-amber-200/80">
                Alterações não salvas nesta sessão.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {showSave ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSave()}
                className="rounded-lg border border-sgp-gold/40 bg-sgp-gold/15 px-3 py-2 text-xs font-semibold text-sgp-gold-warm transition hover:border-sgp-gold/55 hover:bg-sgp-gold/20 disabled:opacity-50"
              >
                Salvar alterações
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-lg border border-white/14 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/85 transition hover:border-white/22 hover:bg-white/[0.07] disabled:opacity-50"
            >
              Fechar
            </button>
          </div>
        </header>
      ) : null}
      <div
        className={
          active
            ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4'
            : 'contents'
        }
      >
        {children}
      </div>
    </div>
  )
}
