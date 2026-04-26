import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { OperationMatrixMacroView } from './OperationMatrixMacroView'
import { useOperationMatrixPreview } from './useOperationMatrixPreview'

export function OperationMatrixPreviewPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const [searchParams] = useSearchParams()
  const draftToken = searchParams.get('draft')

  const { treeState, model, source } = useOperationMatrixPreview({
    itemId,
    draftToken,
  })

  return (
    <PageCanvas>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <Link
          to={itemId ? `/app/matrizes-operacao/${itemId}` : '/app/matrizes-operacao'}
          className="text-sm font-medium text-sgp-gold/95 no-underline hover:underline"
        >
          ← Voltar ao editor
        </Link>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-white/12 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05]"
        >
          Fechar aba
        </button>
      </div>

      {source === 'draft_fallback_api' ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50/95"
        >
          Pré-visualização temporária não encontrada ou expirada. Exibindo a última
          versão salva da matriz.
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
        <OperationMatrixMacroView model={model} />
      ) : null}
    </PageCanvas>
  )
}
