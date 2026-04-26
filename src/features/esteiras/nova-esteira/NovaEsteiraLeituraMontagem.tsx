import type { NovaEsteiraEstruturaOrigem } from '../../../mocks/nova-esteira-domain'
import type { NovaEsteiraResumoLeitura } from '../../../mocks/nova-esteira-jornada-draft'
import { labelPontoPartidaLeitura } from '../../../mocks/nova-esteira-jornada-ui'

type Props = {
  nomeEsteira: string
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  resumo: NovaEsteiraResumoLeitura
}

export function NovaEsteiraLeituraMontagem({
  nomeEsteira,
  estruturaOrigem,
  resumo,
}: Props) {
  const nome = nomeEsteira.trim() || '—'
  const pp = labelPontoPartidaLeitura(estruturaOrigem)

  return (
    <section
      className="rounded-2xl border border-sgp-gold/20 bg-gradient-to-br from-sgp-gold/[0.06] to-transparent p-5 ring-1 ring-sgp-gold/10"
      aria-label="Leitura da montagem"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
        Leitura da montagem
      </p>
      <p className="mt-2 font-heading text-sm font-bold text-slate-50">
        Painel de prontidão
      </p>
      <p className="mt-1 text-xs text-slate-500">
        O que já foi montado, o que falta e se a esteira pode seguir para revisão.
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Nome da esteira
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-100">{nome}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Ponto de partida
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-100">{pp}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Opções / áreas / etapas
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-slate-100">
            {resumo.totalOpcoes} opção(ões) · {resumo.totalAreas} área(s) ·{' '}
            {resumo.totalEtapas} etapa(s)
          </dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Tempo estimado total
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-slate-100">
            {resumo.totalMinutos} min
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Situação
          </span>
          <span className="text-sm text-slate-200">{resumo.situacao}</span>
        </div>
        {resumo.impeditivoPrincipal ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90">
              Impeditivo principal
            </p>
            <p className="mt-1 text-sm text-amber-50/95">{resumo.impeditivoPrincipal}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              resumo.prontaParaRevisao
                ? 'bg-emerald-500/18 text-emerald-100 ring-1 ring-emerald-500/25'
                : 'bg-white/[0.08] text-slate-400 ring-1 ring-white/[0.08]'
            }`}
          >
            {resumo.prontaParaRevisao
              ? 'Pronta para revisão'
              : 'Revisão ainda bloqueada'}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              resumo.prontaParaRegistrar
                ? 'bg-emerald-500/18 text-emerald-100 ring-1 ring-emerald-500/25'
                : 'bg-white/[0.08] text-slate-400 ring-1 ring-white/[0.08]'
            }`}
          >
            {resumo.prontaParaRegistrar
              ? 'Pode registrar (após revisão)'
              : 'Registro bloqueado'}
          </span>
        </div>
      </div>
    </section>
  )
}
