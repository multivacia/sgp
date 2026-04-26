export type CriarMatrizEtapaId = 'dados' | 'estrutura' | 'revisao'

const CHIPS: { id: CriarMatrizEtapaId; label: string }[] = [
  { id: 'dados', label: '1. Dados básicos' },
  { id: 'estrutura', label: '2. Estrutura' },
  { id: 'revisao', label: '3. Revisão' },
]

type Props = {
  etapa: CriarMatrizEtapaId
  /** Menos margem e chips mais densos — etapa Estrutura (modo editor). */
  compact?: boolean
}

export function CriarMatrizWizardChips({ etapa, compact }: Props) {
  return (
    <div
      className={`flex max-w-5xl flex-wrap gap-2 font-semibold ${
        compact ? 'mt-2 text-[11px] gap-1.5' : 'mt-6 text-xs gap-2'
      }`}
    >
      {CHIPS.map((c) => (
        <span
          key={c.id}
          className={`rounded-lg ${
            compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
          } ${
            etapa === c.id
              ? 'bg-sgp-gold/20 text-sgp-gold'
              : 'bg-white/[0.05] text-slate-500'
          }`}
        >
          {c.label}
        </span>
      ))}
    </div>
  )
}
