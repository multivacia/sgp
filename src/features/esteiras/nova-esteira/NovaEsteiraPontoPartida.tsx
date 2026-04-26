import type { NovaEsteiraEstruturaOrigem } from '../../../mocks/nova-esteira-domain'

type Props = {
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  disabled?: boolean
  onEscolherBase: () => void
  onEscolherMontagem: () => void
}

export function NovaEsteiraPontoPartida({
  estruturaOrigem,
  disabled,
  onEscolherBase,
  onEscolherMontagem,
}: Props) {
  const ativoBase = estruturaOrigem === 'BASE_ESTEIRA'
  const ativoMontagem =
    estruturaOrigem === 'MONTAGEM_UNIFICADA' ||
    estruturaOrigem === 'MANUAL' ||
    estruturaOrigem === 'BASE_TAREFA'

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Ponto de partida
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Escolha como iniciar a montagem. Você pode combinar blocos manuais e
          referências no mesmo fluxo após definir o ponto de partida.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onEscolherBase}
          className={`rounded-2xl border p-6 text-left transition md:min-h-[9rem] ${
            ativoBase
              ? 'border-sgp-gold/55 bg-sgp-gold/[0.08] ring-2 ring-sgp-gold/35'
              : 'border-white/[0.08] bg-white/[0.03] ring-1 ring-white/[0.05] hover:border-sgp-gold/25 hover:bg-white/[0.05]'
          } disabled:pointer-events-none disabled:opacity-45`}
        >
          <p className="font-heading text-base font-bold text-slate-50">
            Usar base de esteira
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Partir de uma estrutura completa já consolidada e ajustar tarefas na
            sequência.
          </p>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onEscolherMontagem}
          className={`rounded-2xl border p-6 text-left transition md:min-h-[9rem] ${
            ativoMontagem
              ? 'border-sgp-gold/55 bg-sgp-gold/[0.08] ring-2 ring-sgp-gold/35'
              : 'border-white/[0.08] bg-white/[0.03] ring-1 ring-white/[0.05] hover:border-sgp-gold/25 hover:bg-white/[0.05]'
          } disabled:pointer-events-none disabled:opacity-45`}
        >
          <p className="font-heading text-base font-bold text-slate-50">
            Montar estrutura operacional
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Monte pedido e referências juntos: blocos do catálogo e bases de
            tarefa na mesma experiência.
          </p>
        </button>
      </div>
    </section>
  )
}
