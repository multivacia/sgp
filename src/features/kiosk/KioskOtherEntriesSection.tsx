import { useState } from 'react'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'
import { KioskExtraEsteiraFlow } from './KioskExtraEsteiraFlow'
import { KioskOutraAtividadeFlow } from './KioskOutraAtividadeFlow'

type ActiveFlow = 'extra' | 'other' | null

type Props = {
  collaborator: ProductionCollaboratorSummary
}

export function KioskOtherEntriesSection({ collaborator }: Props) {
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>(null)

  return (
    <>
      <section className="shrink-0 border-t border-amber-400/25 bg-amber-500/[0.04] px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-200">
              Outros apontamentos
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Use somente para horas fora da sua fila de atividades.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[26rem]">
            <button
              type="button"
              onClick={() => setActiveFlow('extra')}
              className="min-h-12 rounded-xl border border-sgp-gold/45 bg-sgp-gold/10 px-4 text-sm font-bold text-sgp-gold transition active:scale-[0.98]"
            >
              Extra esteira
            </button>
            <button
              type="button"
              onClick={() => setActiveFlow('other')}
              className="min-h-12 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 text-sm font-bold text-amber-100 transition active:scale-[0.98]"
            >
              Outra atividade
            </button>
          </div>
        </div>
      </section>

      {activeFlow === 'extra' ? (
        <KioskExtraEsteiraFlow
          collaborator={collaborator}
          onClose={() => setActiveFlow(null)}
        />
      ) : null}
      {activeFlow === 'other' ? (
        <KioskOutraAtividadeFlow
          collaborator={collaborator}
          onClose={() => setActiveFlow(null)}
        />
      ) : null}
    </>
  )
}
