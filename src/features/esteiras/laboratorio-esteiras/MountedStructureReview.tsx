import type { AppliedMatrixBlock, LabBasicDataDraft } from './laboratorioEsteiras.types'
import { MountedMatrixBlock } from './MountedMatrixBlock'

type Props = {
  blocks: AppliedMatrixBlock[]
  basicData: LabBasicDataDraft
  onEditBasicData: () => void
  onEditBlock: (blockId: string) => void
  onRemoveBlock: (blockId: string) => void
  onAddMatrix: () => void
}

export function MountedStructureReview({
  blocks,
  basicData,
  onEditBasicData,
  onEditBlock,
  onRemoveBlock,
  onAddMatrix,
}: Props) {
  return (
    <div className="space-y-5">
      {blocks.length > 0 ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-100">
          <span className="mr-1.5" aria-hidden>
            ✓
          </span>
          {blocks.length}{' '}
          {blocks.length === 1 ? 'matriz aplicada' : 'matrizes aplicadas'} com sucesso
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/[0.08] bg-semantic-surface-panel-raised p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-sm font-bold text-white">Dados básicos</h2>
          <button
            type="button"
            onClick={onEditBasicData}
            className="text-xs font-semibold text-sgp-gold hover:underline"
          >
            Editar dados básicos
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cliente</dt>
            <dd className="mt-0.5 text-slate-200">{basicData.cliente.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Descrição</dt>
            <dd className="mt-0.5 text-slate-200">{basicData.descricao.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quantidade</dt>
            <dd className="mt-0.5 text-slate-200">{basicData.quantidade.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prazo</dt>
            <dd className="mt-0.5 text-slate-200">{basicData.prazo.trim() || '—'}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sgp-gold">
          Estrutura montada
        </h2>
        <div className="mt-3 space-y-3">
          {blocks.map((block) => (
            <MountedMatrixBlock
              key={block.blockId}
              block={block}
              onEdit={() => onEditBlock(block.blockId)}
              onRemove={() => onRemoveBlock(block.blockId)}
            />
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onAddMatrix}
        className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-sgp-gold/40 bg-sgp-gold/[0.06] text-sm font-semibold text-sgp-gold hover:bg-sgp-gold/[0.1]"
      >
        + Adicionar outra matriz
      </button>
    </div>
  )
}
