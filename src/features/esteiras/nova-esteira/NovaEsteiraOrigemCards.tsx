import type { NovaEsteiraEstruturaOrigem } from '../../../mocks/nova-esteira-domain'

const OPTIONS: {
  id: NovaEsteiraEstruturaOrigem
  title: string
  description: string
}[] = [
  {
    id: 'MANUAL',
    title: 'Criar do zero',
    description:
      'Monte como um pedido: escolha blocos operacionais e defina como cada parte é montada — sem modelo completo de esteira.',
  },
  {
    id: 'BASE_ESTEIRA',
    title: 'Usar Base de Esteira',
    description:
      'Use uma estrutura completa já consolidada como ponto de partida.',
  },
  {
    id: 'BASE_TAREFA',
    title: 'Montar por blocos de referência',
    description:
      'Combine blocos da biblioteca de referências já consolidadas na ordem que precisar.',
  },
]

type Props = {
  value: NovaEsteiraEstruturaOrigem | null
  onChange: (o: NovaEsteiraEstruturaOrigem) => void
  disabled?: boolean
}

export function NovaEsteiraOrigemCards({ value, onChange, disabled }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Origem da estrutura
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Escolha como deseja montar a esteira. Você pode trocar a origem até
          começar a confirmar — a seleção atual fica destacada no resumo.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {OPTIONS.map((opt) => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                active
                  ? 'border-sgp-gold/55 bg-sgp-gold/[0.08] ring-2 ring-sgp-gold/35'
                  : 'border-white/[0.08] bg-white/[0.03] ring-1 ring-white/[0.05] hover:border-sgp-gold/25 hover:bg-white/[0.05]'
              } disabled:pointer-events-none disabled:opacity-45`}
            >
              <p className="font-heading text-sm font-bold text-slate-50">
                {opt.title}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {opt.description}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
