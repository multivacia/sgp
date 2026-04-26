import { MSG_RODAPE } from '../../../../mocks/nova-esteira-mensagens'

type Props = {
  disabled?: boolean
  submitting?: boolean
  podeRegistrar: boolean
  motivoBloqueioCurto: string
  onCriarBacklog: () => void
  onCriarExecucao: () => void
}

export function NovaEsteiraReviewRegisterActions({
  disabled,
  submitting,
  podeRegistrar,
  motivoBloqueioCurto,
  onCriarBacklog,
  onCriarExecucao,
}: Props) {
  const block = disabled || submitting || !podeRegistrar
  const aria =
    !podeRegistrar && motivoBloqueioCurto
      ? motivoBloqueioCurto
      : submitting
        ? 'Registro em andamento'
        : 'Confirmar registro da esteira'

  return (
    <section
      className="rounded-2xl border border-sgp-gold/35 bg-gradient-to-br from-sgp-gold/[0.12] to-transparent p-5 ring-2 ring-sgp-gold/20 sm:p-6"
      aria-label="Registrar esta esteira"
    >
      <h3 className="font-heading text-lg font-bold text-slate-50">
        Registrar esta esteira
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        O registro grava um snapshot independente — alterações futuras em bases não
        afetam esta instância.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          disabled={block}
          onClick={onCriarBacklog}
          className="sgp-cta-secondary w-full min-h-[2.75rem] disabled:pointer-events-none disabled:opacity-45 sm:w-auto sm:min-w-[12rem]"
          aria-label={`${MSG_RODAPE.ctaCriarBacklog}. ${aria}`}
        >
          {submitting ? 'Registrando…' : MSG_RODAPE.ctaCriarBacklog}
        </button>
        <button
          type="button"
          disabled={block}
          onClick={onCriarExecucao}
          className="sgp-cta-primary w-full min-h-[2.75rem] disabled:pointer-events-none disabled:opacity-45 sm:w-auto sm:min-w-[14rem]"
          aria-label={`${MSG_RODAPE.ctaCriarExecucao}. ${aria}`}
        >
          {submitting ? 'Registrando…' : MSG_RODAPE.ctaCriarExecucao}
        </button>
      </div>
      {!podeRegistrar && motivoBloqueioCurto ? (
        <p className="mt-4 text-sm text-amber-100/95">{motivoBloqueioCurto}</p>
      ) : null}
    </section>
  )
}
