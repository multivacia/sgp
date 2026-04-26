import type { NovaEsteiraCreationMode } from './novaEsteiraCreationMode'
import { NOVA_ESTEIRA_MODE_LABEL } from './novaEsteiraCreationMode'

type Props = {
  value: NovaEsteiraCreationMode | null
  onChange: (mode: NovaEsteiraCreationMode) => void
  disabled?: boolean
}

const ORDER: NovaEsteiraCreationMode[] = [
  'full_matrix',
  'matrix_plus_extras',
  'manual',
]

export function NovaEsteiraModoEscolha({ value, onChange, disabled }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Como esta esteira será montada?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Primeiro escolha o modo oficial. Na etapa seguinte você informa os dados
          da OS; só depois entramos na composição (matriz ou manual).
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {ORDER.map((mode) => {
          const active = value === mode
          const copy = NOVA_ESTEIRA_MODE_LABEL[mode]
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => onChange(mode)}
              className={`rounded-2xl border p-5 text-left transition ${
                active
                  ? 'border-sgp-gold/55 bg-sgp-gold/[0.08] ring-2 ring-sgp-gold/35'
                  : 'border-white/[0.08] bg-white/[0.03] ring-1 ring-white/[0.05] hover:border-sgp-gold/25 hover:bg-white/[0.05]'
              } disabled:pointer-events-none disabled:opacity-45`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sgp-gold/90">
                Modo {mode === 'full_matrix' ? '1' : mode === 'matrix_plus_extras' ? '2' : '3'}
              </p>
              <p className="mt-2 font-heading text-base font-bold text-slate-50">
                {copy.title}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {copy.description}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
