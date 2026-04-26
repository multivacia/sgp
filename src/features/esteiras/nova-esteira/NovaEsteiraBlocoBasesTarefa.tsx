import { useMemo, useState } from 'react'
import { formatMinutosHumanos } from '../../../lib/formatters'
import {
  BASE_TAREFA_TAGS_FILTRO,
  BASE_TAREFA_TIPOS_FILTRO,
  BASE_TAREFA_VEICULOS_FILTRO,
  filterBasesTarefa,
  listBasesTarefa,
  type BaseTarefaCatalogItem,
} from '../../../mocks/bases-tarefa-catalog'
import {
  listarAtividadesOrdenadasDaReferencia,
  referenciaDeclaradaSemAtividades,
} from '../../../mocks/nova-esteira-referencia-operacional'
import type { TarefaBlocoDraft } from '../../../mocks/nova-esteira-domain'

type Props = {
  tarefas: TarefaBlocoDraft[]
  focoCatalogoId: string | null
  onFocoCatalogo: (id: string | null) => void
  onAdicionar: (bt: BaseTarefaCatalogItem) => void
  onRemove: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  detalhe: BaseTarefaCatalogItem | null
  disabled?: boolean
}

export function NovaEsteiraBlocoBasesTarefa({
  tarefas,
  focoCatalogoId,
  onFocoCatalogo,
  onAdicionar,
  onRemove,
  onMove,
  detalhe,
  disabled,
}: Props) {
  const [busca, setBusca] = useState('')
  const [veiculo, setVeiculo] = useState('')
  const [tipo, setTipo] = useState('')
  const [tag, setTag] = useState('')

  const lista = useMemo(
    () =>
      filterBasesTarefa(listBasesTarefa(), {
        busca,
        veiculo,
        tipo,
        tag,
      }),
    [busca, veiculo, tipo, tag],
  )

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Composição por blocos de referência
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Monte a esteira com blocos da biblioteca. Cada item mantém identidade e
          referência de origem.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="sgp-panel !p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Catálogo
            </p>
            <input
              value={busca}
              disabled={disabled}
              onChange={(e) => setBusca(e.target.value)}
              className="sgp-input-app mt-2 w-full px-3 py-2 text-sm"
              placeholder="Buscar blocos…"
            />
            <div className="mt-2 grid gap-2">
              <select
                value={veiculo}
                disabled={disabled}
                onChange={(e) => setVeiculo(e.target.value)}
                className="sgp-input-app w-full px-2 py-1.5 text-xs"
              >
                <option value="">Veículo</option>
                {BASE_TAREFA_VEICULOS_FILTRO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={tipo}
                disabled={disabled}
                onChange={(e) => setTipo(e.target.value)}
                className="sgp-input-app w-full px-2 py-1.5 text-xs"
              >
                <option value="">Tipo</option>
                {BASE_TAREFA_TIPOS_FILTRO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={tag}
                disabled={disabled}
                onChange={(e) => setTag(e.target.value)}
                className="sgp-input-app w-full px-2 py-1.5 text-xs"
              >
                <option value="">Tag</option>
                {BASE_TAREFA_TAGS_FILTRO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <ul className="mt-3 max-h-[min(380px,45vh)] space-y-2 overflow-y-auto">
              {lista.map((bt) => {
                const foco = focoCatalogoId === bt.id
                return (
                  <li key={bt.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onFocoCatalogo(bt.id)}
                      className={`w-full rounded-lg border p-3 text-left text-xs transition ${
                        foco
                          ? 'border-sgp-gold/45 bg-sgp-gold/[0.07]'
                          : 'border-white/[0.08] hover:border-white/15'
                      }`}
                    >
                      <p className="font-heading font-semibold text-slate-100">
                        {bt.nome}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {bt.tipo} · {formatMinutosHumanos(bt.tempoBaseMin)}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="sgp-panel !p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Nova esteira (montagem)
            </p>
            {tarefas.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500">
                Adicione blocos da biblioteca ao focar e clicar em “Incluir na
                esteira”.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {tarefas.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-sgp-gold">
                        #{t.ordem}
                      </span>
                      <p className="truncate text-sm font-medium text-slate-100">
                        {t.nome}
                      </p>
                      {t.sourceBaseTarefaId && (
                        <p className="text-[10px] text-slate-500">
                          ref. {t.sourceBaseTarefaId}
                        </p>
                      )}
                      {t.sourceBaseTarefaId ? (
                        referenciaDeclaradaSemAtividades(t.sourceBaseTarefaId) ? (
                          <p className="mt-0.5 text-[10px] text-amber-200/90">
                            Fonte sem atividades — lista vazia (sem preenchimento artificial).
                          </p>
                        ) : (
                          <ul className="mt-1.5 max-h-24 space-y-0.5 overflow-y-auto text-[10px] text-slate-400">
                            {listarAtividadesOrdenadasDaReferencia(
                              t.sourceBaseTarefaId,
                            ).map((a) => (
                              <li key={a.id}>
                                {a.ordem}. {a.nome}{' '}
                                <span className="text-slate-600">
                                  ({formatMinutosHumanos(a.estimativaMin)})
                                </span>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onMove(t.id, -1)}
                        className="rounded border border-white/12 px-2 py-0.5 text-xs"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onMove(t.id, 1)}
                        className="rounded border border-white/12 px-2 py-0.5 text-xs"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onRemove(t.id)}
                        className="rounded border border-rose-500/30 px-2 py-0.5 text-xs text-rose-200"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="sgp-panel !p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Detalhe do bloco (catálogo)
            </p>
            {!detalhe ? (
              <p className="mt-6 text-sm text-slate-500">
                Selecione um item no catálogo para ver setores, atividades e
                referência.
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <p className="font-heading font-bold text-slate-50">
                  {detalhe.nome}
                </p>
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">Setores:</span>{' '}
                  {detalhe.setores.join(' · ')}
                </p>
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">
                    Tempo base:
                  </span>{' '}
                  {formatMinutosHumanos(detalhe.tempoBaseMin)}
                </p>
                <p className="text-xs leading-relaxed text-slate-400">
                  {detalhe.observacoes}
                </p>
                <p className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-400">
                    Referência:
                  </span>{' '}
                  {detalhe.referenciaOrigem}
                </p>
                <ul className="border-t border-white/[0.06] pt-3 text-xs text-slate-400">
                  {detalhe.atividades.map((a) => (
                    <li key={a.id} className="py-1">
                      · {a.nome}{' '}
                      <span className="text-slate-600">
                        ({formatMinutosHumanos(a.estimativaMin)})
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAdicionar(detalhe)}
                  className="sgp-cta-primary w-full"
                >
                  Incluir na esteira
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
