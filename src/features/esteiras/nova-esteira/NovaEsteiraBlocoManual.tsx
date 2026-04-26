import { useMemo, useState } from 'react'
import { formatMinutosHumanos } from '../../../lib/formatters'
import {
  blocosOperacionaisPorGrupo,
  getBlocoOperacionalDef,
  nomeExibicaoBlocoOperacional,
} from '../../../mocks/blocos-operacionais-catalog'
import { listBasesTarefa } from '../../../mocks/bases-tarefa-catalog'
import {
  listarAtividadesOrdenadasDaReferencia,
  referenciaDeclaradaSemAtividades,
} from '../../../mocks/nova-esteira-referencia-operacional'
import {
  humanizarResumoLinhaBloco,
  linhaBlocoEstaConfigurada,
} from '../../../mocks/nova-esteira-materialize'
import type {
  LinhaBlocoOperacionalDraft,
  ModoMontagemBloco,
} from '../../../mocks/nova-esteira-domain'

type Props = {
  linhas: LinhaBlocoOperacionalDraft[]
  disabled?: boolean
  onToggleBloco: (catalogoId: string) => void
  onSubopcao: (instanceId: string, subopcaoId: string) => void
  onModo: (instanceId: string, modo: ModoMontagemBloco) => void
  onReferencia: (instanceId: string, referenciaId: string) => void
  onObservacaoManual: (instanceId: string, texto: string) => void
  onMove: (instanceId: string, dir: -1 | 1) => void
}

const BTN_MODO: Record<ModoMontagemBloco, string> = {
  REFERENCIA: 'Usar referência',
  MANUAL: 'Manual',
  BASICO: 'Usar básico',
}

function estadoEtapa1(
  defId: string,
  linhas: LinhaBlocoOperacionalDraft[],
): 'nao' | 'pendente' | 'ok' {
  const linha = linhas.find((l) => l.catalogoId === defId)
  if (!linha) return 'nao'
  return linhaBlocoEstaConfigurada(linha) ? 'ok' : 'pendente'
}

/** Só destaca o que entrou no pedido; fora fica neutro (sem badge). */
function BadgeEtapa1Incluso({ tipo }: { tipo: 'pendente' | 'ok' }) {
  if (tipo === 'pendente') {
    return (
      <span className="shrink-0 rounded border border-amber-500/35 bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-100">
        Pendente
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded border border-emerald-500/35 bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-100">
      Configurado
    </span>
  )
}

function BadgeEtapa2({ tipo }: { tipo: 'pendente' | 'ok' }) {
  if (tipo === 'pendente') {
    return (
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/20"
        title="Pendente"
        aria-label="Pendente"
      >
        !
      </span>
    )
  }
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/20"
      title="Configurado"
      aria-label="Configurado"
    >
      ✓
    </span>
  )
}

export function NovaEsteiraBlocoManual({
  linhas,
  disabled,
  onToggleBloco,
  onSubopcao,
  onModo,
  onReferencia,
  onObservacaoManual,
  onMove,
}: Props) {
  const grupos = blocosOperacionaisPorGrupo()
  const refs = listBasesTarefa()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const { nConfig, nPend } = useMemo(() => {
    let c = 0
    for (const l of linhas) {
      if (linhaBlocoEstaConfigurada(l)) c += 1
    }
    return { nConfig: c, nPend: linhas.length - c }
  }, [linhas])

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-heading text-base font-bold text-slate-100">
          Montagem do pedido
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Marque as partes e configure cada uma — fluxo compacto, sem formulário
          pesado.
        </p>
      </div>

      <div className="sgp-panel !p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Etapa 1 · Partes do serviço
        </p>
        <div className="mt-3 space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo.tipo}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {grupo.label}
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.itens.map((def) => {
                  const incluido = linhas.some((l) => l.catalogoId === def.id)
                  const est = estadoEtapa1(def.id, linhas)
                  const badgeTipo: 'pendente' | 'ok' =
                    est === 'ok' ? 'ok' : 'pendente'
                  return (
                    <label
                      key={def.id}
                      className={`flex cursor-pointer items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                        incluido
                          ? 'border-sgp-gold/30 bg-sgp-gold/[0.05]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/12'
                      } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <input
                          type="checkbox"
                          checked={incluido}
                          disabled={disabled}
                          onChange={() => onToggleBloco(def.id)}
                          className="mt-0.5 shrink-0 rounded border-white/20 bg-white/[0.06] text-sgp-gold focus:ring-sgp-gold/40"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-100">
                            {def.nomeLista}
                          </span>
                          {def.operacional?.intencao ? (
                            <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                              {def.operacional.intencao}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {incluido ? <BadgeEtapa1Incluso tipo={badgeTipo} /> : null}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Etapa 2 · Como montar cada bloco
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Toque na linha para abrir ou fechar. ↑↓ só mudam a ordem.
            </p>
          </div>
          {linhas.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
              <span>
                Selecionados:{' '}
                <strong className="text-slate-200">{linhas.length}</strong>
              </span>
              <span>
                Configurados:{' '}
                <strong className="text-emerald-300/95">{nConfig}</strong>
              </span>
              <span>
                Pendentes:{' '}
                <strong className="text-amber-200/90">{nPend}</strong>
              </span>
            </div>
          )}
        </div>

        {linhas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-8 text-center text-xs text-slate-500">
            Nenhum bloco selecionado na etapa 1.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {linhas.map((linha) => {
              const def = getBlocoOperacionalDef(linha.catalogoId)
              if (!def) return null
              const ok = linhaBlocoEstaConfigurada(linha)
              const aberto = expanded[linha.instanceId] ?? false
              const nomeExib = nomeExibicaoBlocoOperacional(
                linha.catalogoId,
                linha.subopcaoId,
              )

              return (
                <li
                  key={linha.instanceId}
                  className="overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.03]"
                >
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleExpand(linha.instanceId)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left transition hover:bg-white/[0.04] md:px-3"
                    >
                      <BadgeEtapa2 tipo={ok ? 'ok' : 'pendente'} />
                      <span className="truncate text-xs leading-snug text-slate-200">
                        {humanizarResumoLinhaBloco(linha, refs)}
                      </span>
                    </button>
                    <div
                      className="flex shrink-0 items-center gap-0.5 border-l border-white/[0.06] px-1.5 py-1"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onMove(linha.instanceId, -1)}
                        className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-white/20"
                        aria-label="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onMove(linha.instanceId, 1)}
                        className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-white/20"
                        aria-label="Descer"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleExpand(linha.instanceId)}
                        className="ml-0.5 rounded border border-sgp-gold/35 bg-sgp-gold/10 px-2 py-0.5 text-[10px] font-bold text-sgp-gold hover:bg-sgp-gold/18"
                      >
                        {aberto ? 'Fechar' : ok ? 'Editar' : 'Configurar'}
                      </button>
                    </div>
                  </div>

                  {aberto && (
                    <div className="space-y-3 border-t border-white/[0.06] bg-black/10 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {nomeExib}
                      </p>

                      {def.subopcoes && def.subopcoes.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-600">
                            Detalhe
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {def.subopcoes.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                disabled={disabled}
                                onClick={() =>
                                  onSubopcao(linha.instanceId, s.id)
                                }
                                className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition ${
                                  linha.subopcaoId === s.id
                                    ? 'border-sgp-gold/45 bg-sgp-gold/12 text-sgp-gold'
                                    : 'border-white/10 text-slate-400 hover:border-white/18'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-[9px] font-bold uppercase text-slate-600">
                          Modo
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(['REFERENCIA', 'MANUAL', 'BASICO'] as const).map(
                            (m) => (
                              <button
                                key={m}
                                type="button"
                                disabled={disabled}
                                onClick={() => onModo(linha.instanceId, m)}
                                className={`rounded border px-2 py-1 text-[10px] font-bold transition ${
                                  linha.modo === m
                                    ? 'border-sgp-gold/45 bg-sgp-gold/12 text-sgp-gold'
                                    : 'border-white/10 text-slate-400 hover:border-white/18'
                                }`}
                              >
                                {BTN_MODO[m]}
                              </button>
                            ),
                          )}
                        </div>
                      </div>

                      {linha.modo === 'REFERENCIA' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] font-bold uppercase text-slate-600">
                              Referência
                            </label>
                            <select
                              value={linha.referenciaId ?? ''}
                              disabled={disabled}
                              onChange={(e) =>
                                onReferencia(linha.instanceId, e.target.value)
                              }
                              className="sgp-input-app mt-1 w-full max-w-lg px-2 py-1.5 text-xs"
                            >
                              <option value="">Escolher…</option>
                              {refs.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                          {linha.referenciaId ? (
                            referenciaDeclaradaSemAtividades(linha.referenciaId) ? (
                              <p
                                className="rounded border border-amber-500/35 bg-amber-500/10 px-2 py-2 text-[11px] leading-snug text-amber-100/95"
                                role="status"
                              >
                                Este pacote declara zero atividades na fonte — nada é inventado
                                para preencher a lista.
                              </p>
                            ) : (
                              <div>
                                <p className="text-[9px] font-bold uppercase text-slate-600">
                                  Atividades carregadas da referência (ordem do catálogo)
                                </p>
                                <ul className="mt-1.5 max-h-[min(220px,40vh)] space-y-1 overflow-y-auto rounded border border-white/[0.07] bg-black/25 px-2.5 py-2 text-[11px] text-slate-300">
                                  {listarAtividadesOrdenadasDaReferencia(
                                    linha.referenciaId,
                                  ).map((a) => (
                                    <li
                                      key={a.id}
                                      className="flex justify-between gap-2 border-b border-white/[0.05] py-1 last:border-0"
                                    >
                                      <span>
                                        <span className="text-slate-600">{a.ordem}.</span>{' '}
                                        {a.nome}
                                      </span>
                                      <span className="shrink-0 tabular-nums text-slate-500">
                                        {formatMinutosHumanos(a.estimativaMin)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-1.5 text-[10px] leading-snug text-slate-600">
                                  Setor por linha não vem da fonte; na materialização usa-se o
                                  setor do pacote/bloco.
                                </p>
                              </div>
                            )
                          ) : null}
                        </div>
                      )}

                      {linha.modo === 'MANUAL' && (
                        <div>
                          <label className="text-[9px] font-bold uppercase text-slate-600">
                            Instruções (opcional)
                          </label>
                          <textarea
                            value={linha.observacaoManual ?? ''}
                            disabled={disabled}
                            onChange={(e) =>
                              onObservacaoManual(linha.instanceId, e.target.value)
                            }
                            rows={2}
                            className="sgp-input-app mt-1 w-full resize-y px-2 py-1.5 text-xs"
                            placeholder="Orientações para o chão de fábrica…"
                          />
                        </div>
                      )}

                      {linha.modo === 'BASICO' && (
                        <p className="rounded border border-white/[0.06] bg-white/[0.04] px-2 py-1.5 text-[10px] text-slate-500">
                          Aplica o pacote básico simulado (setores, atividades e
                          tempo).
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
