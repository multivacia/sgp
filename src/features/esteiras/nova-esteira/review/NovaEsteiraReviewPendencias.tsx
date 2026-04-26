import type { NovaEsteiraResumoLeitura } from '../../../../mocks/nova-esteira-jornada-draft'

type Props = {
  resumo: NovaEsteiraResumoLeitura
  podeRegistrar: boolean
}

export function NovaEsteiraReviewPendencias({ resumo, podeRegistrar }: Props) {
  const forte = resumo.impeditivoPrincipal.trim()

  return (
    <section
      className={`rounded-2xl border p-5 ring-1 ${
        podeRegistrar
          ? 'border-emerald-500/25 bg-emerald-500/[0.06] ring-emerald-500/15'
          : 'border-amber-500/30 bg-amber-500/[0.08] ring-amber-500/20'
      }`}
      aria-labelledby="review-pendencias"
    >
      <h3
        id="review-pendencias"
        className="font-heading text-base font-bold text-slate-100"
      >
        Pendências para registro
      </h3>

      {podeRegistrar ? (
        <p className="mt-3 text-sm text-emerald-100/95">
          Nenhum impeditivo pendente — você pode registrar a esteira quando estiver
          alinhado com a operação.
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-slate-500">
            Corrija os itens abaixo antes de registrar. O principal bloqueio aparece em
            destaque.
          </p>
          {forte ? (
            <div className="mt-4 rounded-xl border border-amber-500/35 bg-black/20 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90">
                Impeditivo principal
              </p>
              <p className="mt-2 text-sm font-medium leading-snug text-amber-50">
                {forte}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-300">
              Revise a montagem e os dados iniciais — ainda há requisitos não atendidos.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Situação: <span className="text-slate-300">{resumo.situacao}</span>
          </p>
        </>
      )}
    </section>
  )
}
