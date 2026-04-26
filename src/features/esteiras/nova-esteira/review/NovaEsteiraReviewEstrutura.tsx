import { formatMinutosHumanos } from '../../../../lib/formatters'
import type { NovaEsteiraOpcaoDraft } from '../../../../mocks/nova-esteira-jornada-draft'
import { ordenarOpcoes } from '../../../../mocks/nova-esteira-opcoes-helpers'
import { totaisOpcoes } from '../../../../mocks/nova-esteira-opcoes-helpers'

type Props = {
  opcoes: NovaEsteiraOpcaoDraft[]
  disabled?: boolean
  onAjustarMontagem: () => void
}

export function NovaEsteiraReviewEstrutura({
  opcoes,
  disabled,
  onAjustarMontagem,
}: Props) {
  const ord = ordenarOpcoes(opcoes)
  const t = totaisOpcoes(opcoes)

  return (
    <section
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 ring-1 ring-white/[0.05]"
      aria-labelledby="review-estrutura"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3
            id="review-estrutura"
            className="font-heading text-base font-bold text-slate-100"
          >
            Estrutura final
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Opção → área → etapa, na ordem que será registrada.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onAjustarMontagem}
          className="sgp-cta-secondary shrink-0 self-start text-sm"
        >
          Ajustar montagem
        </button>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-4">
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-500">Opções</dt>
          <dd className="mt-0.5 font-heading text-lg font-bold text-slate-100">
            {ord.length}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-500">Áreas</dt>
          <dd className="mt-0.5 font-heading text-lg font-bold text-slate-100">
            {t.areas}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-500">Etapas</dt>
          <dd className="mt-0.5 font-heading text-lg font-bold text-slate-100">
            {t.etapas}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-500">Tempo total</dt>
          <dd className="mt-0.5 font-heading text-lg font-bold text-sgp-gold">
            {formatMinutosHumanos(t.minutos)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 space-y-5">
        {ord.map((op) => (
          <div
            key={op.id}
            className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-sgp-gold/90">
              Opção {op.ordem}
            </p>
            <p className="mt-1 font-heading text-sm font-bold text-slate-50">
              {op.titulo.trim() || '(sem título)'}
            </p>
            <ul className="mt-4 space-y-4">
              {[...op.areas]
                .sort((a, b) => a.ordem - b.ordem)
                .map((ar) => (
                  <li key={ar.id} className="border-l-2 border-white/10 pl-3">
                    <p className="text-xs font-semibold text-slate-200">{ar.titulo}</p>
                    <ul className="mt-2 space-y-1.5">
                      {[...ar.etapas]
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((et) => (
                          <li
                            key={et.id}
                            className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-400"
                          >
                            <span>{et.titulo}</span>
                            <span className="font-mono text-slate-500">
                              {formatMinutosHumanos(et.tempoEstimadoMin)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
