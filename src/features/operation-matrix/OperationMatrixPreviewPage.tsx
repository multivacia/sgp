import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import {
  SgpToast,
  type SgpToastVariant,
} from '../../components/ui/SgpToast'
import { OperationMatrixMacroView } from './OperationMatrixMacroView'
import { matrixPreviewModelHasInformativeActivityGaps } from './operationMatrixPreviewEdits'
import { useOperationMatrixPreview } from './useOperationMatrixPreview'
import { useShellFunction } from '../../lib/shell/shell-function-context'
import { useRegisterTransientContext } from '../../lib/shell/transient-context'

type ToastState = { message: string; variant: SgpToastVariant } | null

export function OperationMatrixPreviewPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const [searchParams] = useSearchParams()
  const draftToken = searchParams.get('draft')
  const { requestNavigateWithTransientGuard } = useShellFunction()

  const {
    treeState,
    model,
    isDirty,
    applyActivityPatch,
    resetPreviewEdits,
    savePreviewEdits,
    saveState,
    saveErrorMessage,
    collaborators,
    collaboratorsLoadFailed,
  } = useOperationMatrixPreview({
    itemId,
    draftToken,
  })

  const [toast, setToast] = useState<ToastState>(null)

  const handleSavePreview = useCallback(async () => {
    const ok = await savePreviewEdits()
    if (ok) {
      setToast({ message: 'Alterações salvas com sucesso.', variant: 'success' })
    }
  }, [savePreviewEdits])

  useRegisterTransientContext({
    id: 'operation-matrix-preview-edits',
    isDirty: () => isDirty,
    onReset: resetPreviewEdits,
  })

  const backPath = itemId
    ? `/app/matrizes-operacao/${encodeURIComponent(itemId)}`
    : '/app/matrizes-operacao'

  const showEditChrome = treeState.status === 'ready' && model != null

  const showPreviewInformativeTip = useMemo(() => {
    if (!showEditChrome || !model) return false
    return matrixPreviewModelHasInformativeActivityGaps(model)
  }, [model, showEditChrome])

  return (
    <PageCanvas>
      {toast ? (
        <SgpToast
          fixed
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <Link
          to={backPath}
          onClick={(e) => {
            e.preventDefault()
            requestNavigateWithTransientGuard(backPath)
          }}
          className="text-sm font-medium text-sgp-gold/95 no-underline hover:underline"
        >
          ← Voltar para alterar matriz
        </Link>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-white/12 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05]"
        >
          Fechar aba
        </button>
      </div>

      {showPreviewInformativeTip ? (
        <div
          role="status"
          className="mt-3 rounded-lg border border-amber-300/80 bg-[#FFFBEB] px-3 py-2 text-xs leading-snug text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100/90"
        >
          Algumas atividades estão sem tempo previsto ou sem responsável padrão. Você pode
          salvar assim e completar depois.
        </div>
      ) : null}

      {showEditChrome && (isDirty || saveState === 'error') ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={!isDirty || saveState === 'saving'}
            onClick={resetPreviewEdits}
            className="rounded-lg border border-white/12 px-3 py-1 text-xs font-medium text-slate-400 transition hover:border-white/18 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancelar alterações
          </button>
          <button
            type="button"
            disabled={!isDirty || saveState === 'saving'}
            onClick={() => void handleSavePreview()}
            className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-3 py-1 text-xs font-semibold text-sgp-gold/95 transition hover:border-sgp-gold/50 hover:bg-sgp-gold/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveState === 'saving' ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      ) : null}

      {saveErrorMessage ? (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100/90"
        >
          {saveErrorMessage}
        </div>
      ) : null}

      {treeState.status === 'loading' ? (
        <p className="text-sm text-slate-500">Carregando pré-visualização…</p>
      ) : null}

      {treeState.status === 'error' ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-100/90"
        >
          {treeState.message}
        </div>
      ) : null}

      {treeState.status === 'ready' && model ? (
        <OperationMatrixMacroView
          model={model}
          edit={{
            collaborators: collaborators.map((c) => ({
              id: c.id,
              fullName: c.fullName,
            })),
            collaboratorsListFailed: collaboratorsLoadFailed,
            onPatchActivity: applyActivityPatch,
          }}
        />
      ) : null}
    </PageCanvas>
  )
}
