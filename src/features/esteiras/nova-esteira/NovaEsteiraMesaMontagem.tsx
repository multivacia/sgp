import { useMemo, useState } from 'react'
import { formatMinutosHumanos } from '../../../lib/formatters'
import type {
  NovaEsteiraAreaDraft,
  NovaEsteiraEtapaDraft,
  NovaEsteiraOpcaoDraft,
  NovaEsteiraUiState,
} from '../../../mocks/nova-esteira-jornada-draft'
import { totaisOpcoes } from '../../../mocks/nova-esteira-opcoes-helpers'
import {
  listAreasReferenciaCatalogo,
  listEtapasReferenciaCatalogo,
  listOpcoesReferenciaCatalogo,
  type OpcaoReferenciaCatalogo,
} from '../../../mocks/nova-esteira-reaproveitamento-catalog'

type Props = {
  opcoes: NovaEsteiraOpcaoDraft[]
  ui: NovaEsteiraUiState
  disabled?: boolean
  onSelectOpcao: (id: string | null) => void
  onAddOpcaoManual: () => void
  onAddOpcaoCatalogo: (ref: OpcaoReferenciaCatalogo) => void
  onRemoveOpcao: (id: string) => void
  onMoveOpcao: (id: string, dir: -1 | 1) => void
  onDuplicateOpcao: (id: string) => void
  onUpdateOpcaoTitulo: (opcaoId: string, titulo: string) => void
  onAddAreaManual: (opcaoId: string) => void
  onAddAreaCatalogo: (
    opcaoId: string,
    ref: NovaEsteiraAreaDraft & { catalogoId?: string },
  ) => void
  onRemoveArea: (opcaoId: string, areaId: string) => void
  onMoveArea: (opcaoId: string, areaId: string, dir: -1 | 1) => void
  onUpdateAreaTitulo: (opcaoId: string, areaId: string, titulo: string) => void
  onAddEtapaManual: (opcaoId: string, areaId: string) => void
  onAddEtapaCatalogo: (
    opcaoId: string,
    areaId: string,
    ref: NovaEsteiraEtapaDraft,
  ) => void
  onRemoveEtapa: (opcaoId: string, areaId: string, etapaId: string) => void
  onMoveEtapa: (
    opcaoId: string,
    areaId: string,
    etapaId: string,
    dir: -1 | 1,
  ) => void
  onUpdateEtapaTitulo: (
    opcaoId: string,
    areaId: string,
    etapaId: string,
    titulo: string,
  ) => void
  onUpdateEtapaTempo: (
    opcaoId: string,
    areaId: string,
    etapaId: string,
    min: number,
  ) => void
}

export function NovaEsteiraMesaMontagem({
  opcoes,
  ui,
  disabled,
  onSelectOpcao,
  onAddOpcaoManual,
  onAddOpcaoCatalogo,
  onRemoveOpcao,
  onMoveOpcao,
  onDuplicateOpcao,
  onUpdateOpcaoTitulo,
  onAddAreaManual,
  onAddAreaCatalogo,
  onRemoveArea,
  onMoveArea,
  onUpdateAreaTitulo,
  onAddEtapaManual,
  onAddEtapaCatalogo,
  onRemoveEtapa,
  onMoveEtapa,
  onUpdateEtapaTitulo,
  onUpdateEtapaTempo,
}: Props) {
  const [dialogOpcao, setDialogOpcao] = useState(false)
  const [dialogArea, setDialogArea] = useState<string | null>(null)
  const [dialogEtapa, setDialogEtapa] = useState<{ op: string; ar: string } | null>(
    null,
  )

  const totais = useMemo(() => totaisOpcoes(opcoes), [opcoes])

  const opcaoAtiva =
    opcoes.find((o) => o.id === ui.opcaoSelecionadaId) ?? opcoes[0] ?? null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Mesa de montagem
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Opções de pedido, áreas e etapas. À esquerda a lista de opções; à
          direita o detalhe da opção selecionada.
        </p>
        {opcoes.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {totais.areas} áreas · {totais.etapas} etapas ·{' '}
            {formatMinutosHumanos(totais.minutos)} estimados
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="sgp-panel !p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Opções
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setDialogOpcao(true)}
                className="rounded-lg border border-white/12 px-2 py-1 text-[11px] font-semibold text-slate-200"
              >
                Reaproveitar…
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onAddOpcaoManual}
                className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/[0.07] px-2 py-1 text-[11px] font-semibold text-sgp-gold"
              >
                Nova opção
              </button>
            </div>
          </div>

          {opcoes.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              Nenhuma opção ainda. Use <strong>Nova opção</strong> ou{' '}
              <strong>Reaproveitar</strong> para começar.
            </p>
          ) : (
            <ul className="mt-4 max-h-[min(420px,55vh)] space-y-2 overflow-y-auto pr-1">
              {[...opcoes]
                .sort((a, b) => a.ordem - b.ordem)
                .map((o) => {
                  const sel = opcaoAtiva?.id === o.id
                  return (
                    <li key={o.id}>
                      <div
                        className={`flex flex-col gap-2 rounded-xl border p-3 transition ${
                          sel
                            ? 'border-sgp-gold/45 bg-sgp-gold/[0.06]'
                            : 'border-white/[0.08] bg-white/[0.02]'
                        }`}
                      >
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onSelectOpcao(o.id)}
                          className="text-left"
                        >
                          <p className="font-heading text-sm font-bold text-slate-50">
                            {o.titulo.trim() || '(sem título)'}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {o.areas.length} área(s) · origem {o.origem}
                          </p>
                        </button>
                        <div className="flex flex-wrap gap-1 border-t border-white/[0.06] pt-2">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onMoveOpcao(o.id, -1)}
                            className="rounded border border-white/12 px-2 py-0.5 text-[10px]"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onMoveOpcao(o.id, 1)}
                            className="rounded border border-white/12 px-2 py-0.5 text-[10px]"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onDuplicateOpcao(o.id)}
                            className="rounded border border-white/12 px-2 py-0.5 text-[10px]"
                          >
                            Duplicar
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onRemoveOpcao(o.id)}
                            className="rounded border border-rose-500/30 px-2 py-0.5 text-[10px] text-rose-200"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
            </ul>
          )}
        </div>

        <div className="sgp-panel !p-5">
          {!opcaoAtiva ? (
            <p className="text-sm text-slate-500">
              Crie ou selecione uma opção para editar áreas e etapas.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nome da opção
                </label>
                <input
                  value={opcaoAtiva.titulo}
                  disabled={disabled}
                  onChange={(e) =>
                    onUpdateOpcaoTitulo(opcaoAtiva.id, e.target.value)
                  }
                  className="sgp-input-app mt-2 w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Áreas
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setDialogArea(opcaoAtiva.id)}
                    className="rounded-lg border border-white/12 px-2 py-1 text-[11px] font-semibold text-slate-200"
                  >
                    Área do catálogo…
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAddAreaManual(opcaoAtiva.id)}
                    className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/[0.07] px-2 py-1 text-[11px] font-semibold text-sgp-gold"
                  >
                    Nova área
                  </button>
                </div>
              </div>

              <ul className="space-y-4">
                {[...opcaoAtiva.areas]
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((ar) => (
                    <li
                      key={ar.id}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <input
                          value={ar.titulo}
                          disabled={disabled}
                          onChange={(e) =>
                            onUpdateAreaTitulo(opcaoAtiva.id, ar.id, e.target.value)
                          }
                          className="sgp-input-app min-w-[12rem] flex-1 px-2 py-1.5 text-sm font-medium"
                        />
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onMoveArea(opcaoAtiva.id, ar.id, -1)}
                            className="rounded border border-white/12 px-2 py-0.5 text-[10px]"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onMoveArea(opcaoAtiva.id, ar.id, 1)}
                            className="rounded border border-white/12 px-2 py-0.5 text-[10px]"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onRemoveArea(opcaoAtiva.id, ar.id)}
                            className="rounded border border-rose-500/30 px-2 py-0.5 text-[10px] text-rose-200"
                          >
                            Remover área
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Etapas
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              setDialogEtapa({ op: opcaoAtiva.id, ar: ar.id })
                            }
                            className="rounded border border-white/12 px-2 py-0.5 text-[10px]"
                          >
                            Catálogo…
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onAddEtapaManual(opcaoAtiva.id, ar.id)}
                            className="rounded border border-sgp-gold/30 px-2 py-0.5 text-[10px] text-sgp-gold"
                          >
                            + etapa
                          </button>
                        </div>
                      </div>

                      <ul className="mt-2 space-y-2">
                        {[...ar.etapas]
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((et) => (
                            <li
                              key={et.id}
                              className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-2 sm:flex-row sm:items-center"
                            >
                              <input
                                value={et.titulo}
                                disabled={disabled}
                                onChange={(e) =>
                                  onUpdateEtapaTitulo(
                                    opcaoAtiva.id,
                                    ar.id,
                                    et.id,
                                    e.target.value,
                                  )
                                }
                                className="sgp-input-app min-w-0 flex-1 px-2 py-1 text-xs"
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-1 text-[10px] text-slate-500">
                                  min
                                  <input
                                    type="number"
                                    min={0}
                                    step={15}
                                    value={et.tempoEstimadoMin}
                                    disabled={disabled}
                                    onChange={(e) =>
                                      onUpdateEtapaTempo(
                                        opcaoAtiva.id,
                                        ar.id,
                                        et.id,
                                        Number(e.target.value) || 0,
                                      )
                                    }
                                    className="sgp-input-app w-20 px-2 py-1 text-xs"
                                  />
                                </label>
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() =>
                                    onMoveEtapa(opcaoAtiva.id, ar.id, et.id, -1)
                                  }
                                  className="rounded border border-white/12 px-1.5 py-0.5 text-[10px]"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() =>
                                    onMoveEtapa(opcaoAtiva.id, ar.id, et.id, 1)
                                  }
                                  className="rounded border border-white/12 px-1.5 py-0.5 text-[10px]"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() =>
                                    onRemoveEtapa(opcaoAtiva.id, ar.id, et.id)
                                  }
                                  className="rounded border border-rose-500/25 px-1.5 py-0.5 text-[10px] text-rose-200"
                                >
                                  ×
                                </button>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {dialogOpcao && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDialogOpcao(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.1] bg-slate-950 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-heading text-base font-bold text-slate-100">
              Reaproveitar opção do catálogo
            </p>
            <ul className="mt-4 space-y-2">
              {listOpcoesReferenciaCatalogo().map((ref) => (
                <li key={ref.catalogoId}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-white/[0.08] p-3 text-left text-sm text-slate-200 hover:border-sgp-gold/35"
                    onClick={() => {
                      onAddOpcaoCatalogo(ref)
                      setDialogOpcao(false)
                    }}
                  >
                    <span className="font-medium">{ref.titulo}</span>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {ref.descricaoCurta}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-white/12 py-2 text-sm"
              onClick={() => setDialogOpcao(false)}
            >
              Fechar
            </button>
          </div>
        </dialog>
      )}

      {dialogArea && opcaoAtiva && dialogArea === opcaoAtiva.id && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDialogArea(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.1] bg-slate-950 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-heading text-base font-bold text-slate-100">
              Reaproveitar área
            </p>
            <ul className="mt-4 space-y-2">
              {listAreasReferenciaCatalogo().map((ref) => (
                <li key={ref.catalogoId}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-white/[0.08] p-3 text-left text-sm text-slate-200 hover:border-sgp-gold/35"
                    onClick={() => {
                      onAddAreaCatalogo(opcaoAtiva.id, ref)
                      setDialogArea(null)
                    }}
                  >
                    {ref.titulo}
                    <span className="ml-2 text-[11px] text-slate-500">
                      ({ref.etapas.length} etapas)
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-white/12 py-2 text-sm"
              onClick={() => setDialogArea(null)}
            >
              Fechar
            </button>
          </div>
        </dialog>
      )}

      {dialogEtapa && opcaoAtiva && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDialogEtapa(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.1] bg-slate-950 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-heading text-base font-bold text-slate-100">
              Reaproveitar etapa
            </p>
            <ul className="mt-4 space-y-2">
              {listEtapasReferenciaCatalogo().map((ref) => (
                <li key={ref.catalogoId}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-white/[0.08] p-3 text-left text-sm text-slate-200 hover:border-sgp-gold/35"
                    onClick={() => {
                      onAddEtapaCatalogo(dialogEtapa.op, dialogEtapa.ar, ref)
                      setDialogEtapa(null)
                    }}
                  >
                    {ref.titulo} · {formatMinutosHumanos(ref.tempoEstimadoMin)}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-white/12 py-2 text-sm"
              onClick={() => setDialogEtapa(null)}
            >
              Fechar
            </button>
          </div>
        </dialog>
      )}
    </section>
  )
}
