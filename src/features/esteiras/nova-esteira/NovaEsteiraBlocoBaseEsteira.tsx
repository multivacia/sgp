import { useMemo, useState } from 'react'
import { formatMinutosHumanos } from '../../../lib/formatters'
import {
  BASE_ESTEIRA_TAGS_FILTRO,
  BASE_ESTEIRA_TIPOS_FILTRO,
  BASE_ESTEIRA_VEICULOS_FILTRO,
  estimativaBaseTotalMin,
  filterBasesEsteira,
  listBasesEsteira,
  setoresBaseEsteira,
  totalAtividadesBaseEsteira,
  type BaseEsteiraCatalogItem,
} from '../../../mocks/bases-esteira-catalog'
import type { TarefaBlocoDraft } from '../../../mocks/nova-esteira-domain'

type Props = {
  tarefas: TarefaBlocoDraft[]
  selecionadaId: string | null
  aplicadaId: string | null
  onSelecionar: (id: string | null) => void
  onAplicar: (be: BaseEsteiraCatalogItem) => void
  onRemoveTarefa: (id: string) => void
  onMoveTarefa: (id: string, dir: -1 | 1) => void
  disabled?: boolean
}

export function NovaEsteiraBlocoBaseEsteira({
  tarefas,
  selecionadaId,
  aplicadaId,
  onSelecionar,
  onAplicar,
  onRemoveTarefa,
  onMoveTarefa,
  disabled,
}: Props) {
  const [busca, setBusca] = useState('')
  const [veiculo, setVeiculo] = useState('')
  const [tipo, setTipo] = useState('')
  const [tag, setTag] = useState('')

  const lista = useMemo(
    () =>
      filterBasesEsteira(listBasesEsteira(), {
        busca,
        veiculo,
        tipo,
        tag,
      }),
    [busca, veiculo, tipo, tag],
  )

  const preview =
    selecionadaId != null
      ? lista.find((b) => b.id === selecionadaId) ??
        listBasesEsteira().find((b) => b.id === selecionadaId)
      : null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Base de Esteira
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Escolha um modelo completo e aplique como ponto de partida. Você pode
          reordenar ou remover tarefas antes de criar a esteira.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="sgp-panel !p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Busca e filtros
          </p>
          <input
            value={busca}
            disabled={disabled}
            onChange={(e) => setBusca(e.target.value)}
            className="sgp-input-app mt-3 w-full px-3 py-2 text-sm"
            placeholder="Buscar por nome, tag ou contexto…"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select
              value={veiculo}
              disabled={disabled}
              onChange={(e) => setVeiculo(e.target.value)}
              className="sgp-input-app w-full px-2 py-2 text-xs"
            >
              <option value="">Veículo (todos)</option>
              {BASE_ESTEIRA_VEICULOS_FILTRO.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={tipo}
              disabled={disabled}
              onChange={(e) => setTipo(e.target.value)}
              className="sgp-input-app w-full px-2 py-2 text-xs"
            >
              <option value="">Tipo (todos)</option>
              {BASE_ESTEIRA_TIPOS_FILTRO.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={tag}
              disabled={disabled}
              onChange={(e) => setTag(e.target.value)}
              className="sgp-input-app w-full px-2 py-2 text-xs"
            >
              <option value="">Tag (todas)</option>
              {BASE_ESTEIRA_TAGS_FILTRO.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <ul className="mt-4 max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1">
            {lista.map((be) => {
              const sel = selecionadaId === be.id
              return (
                <li key={be.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelecionar(be.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      sel
                        ? 'border-sgp-gold/45 bg-sgp-gold/[0.07]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/15'
                    }`}
                  >
                    <p className="font-heading text-sm font-bold text-slate-50">
                      {be.nome}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {be.veiculoContexto} · {be.tipo}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {be.tags.map((tg) => (
                        <span
                          key={tg}
                          className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400"
                        >
                          {tg}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="sgp-panel !p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Preview da base
            </p>
            {!preview ? (
              <p className="mt-4 text-sm text-slate-500">
                Selecione uma base à esquerda para ver tarefas, ordem e
                estimativa.
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <p className="font-heading font-bold text-slate-100">
                  {preview.nome}
                </p>
                <p className="text-xs text-slate-500">{preview.descricaoCurta}</p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <dt className="text-slate-500">Atividades</dt>
                  <dd className="text-right font-medium text-slate-200">
                    {totalAtividadesBaseEsteira(preview)}
                  </dd>
                  <dt className="text-slate-500">Estimativa base</dt>
                  <dd className="text-right font-medium text-slate-200">
                    {formatMinutosHumanos(estimativaBaseTotalMin(preview))}
                  </dd>
                  <dt className="text-slate-500">Setores</dt>
                  <dd className="text-right text-slate-300">
                    {setoresBaseEsteira(preview).join(' · ')}
                  </dd>
                </dl>
                <ol className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                  {preview.tarefas
                    .slice()
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((t) => (
                      <li
                        key={t.id}
                        className="flex gap-2 text-xs text-slate-400"
                      >
                        <span className="font-mono text-sgp-gold">
                          {t.ordem}.
                        </span>
                        <span>{t.nome}</span>
                      </li>
                    ))}
                </ol>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAplicar(preview)}
                  className="sgp-cta-primary mt-4 w-full"
                >
                  Usar esta base como ponto de partida
                </button>
                {aplicadaId === preview.id && (
                  <p className="mt-2 text-center text-[11px] font-semibold text-emerald-400/90">
                    Base aplicada — ajuste a lista abaixo se necessário.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {tarefas.length > 0 && (
        <div className="sgp-panel !p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Estrutura ajustável
          </p>
          <ul className="mt-4 space-y-2">
            {tarefas.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
              >
                <span className="text-sm text-slate-200">
                  <span className="mr-2 font-mono text-[11px] text-sgp-gold">
                    #{t.ordem}
                  </span>
                  {t.nome}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onMoveTarefa(t.id, -1)}
                    className="rounded border border-white/12 px-2 py-0.5 text-xs"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onMoveTarefa(t.id, 1)}
                    className="rounded border border-white/12 px-2 py-0.5 text-xs"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemoveTarefa(t.id)}
                    className="rounded border border-rose-500/30 px-2 py-0.5 text-xs text-rose-200"
                  >
                    Remover
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
