import { useState } from 'react'
import type { ConveyorStructure } from '../../../domain/conveyors/conveyor.types'
import type { ConveyorOperationalPlanItem } from '../../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import { groupItemsByPlannedDate } from '../../../domain/conveyor-operational-plan/conveyorPlanItemsGrouping'
import {
  ConveyorOperationalPlanItemRow,
  type ItemSaveInput,
} from './ConveyorOperationalPlanItemRow'

type Props = {
  items: ConveyorOperationalPlanItem[]
  structure: ConveyorStructure
  dailyCapacityMinutes: number
  planGeneratedAt: string | null
  canEditItems: boolean
  busy: boolean
  cancelledCount: number
  onSaveItem: (itemId: string, input: ItemSaveInput) => Promise<unknown>
}

export function ConveyorOperationalPlanItemsByDate({
  items,
  structure,
  dailyCapacityMinutes,
  planGeneratedAt,
  canEditItems,
  busy,
  cancelledCount,
  onSaveItem,
}: Props) {
  const [showCancelled, setShowCancelled] = useState(false)
  const groups = groupItemsByPlannedDate(items, { includeCancelled: showCancelled })

  if (groups.length === 0 && cancelledCount === 0) {
    return (
      <section className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center">
        <p className="text-sm text-slate-500">Nenhum item no plano ainda.</p>
      </section>
    )
  }

  return (
    <section className="space-y-5" aria-label="Itens por data planejada">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-slate-200">Linha do tempo do plano</h3>
        <div className="flex flex-wrap items-center gap-3">
          {cancelledCount > 0 && !showCancelled ? (
            <p className="text-[11px] text-slate-500">
              {cancelledCount} item(ns) cancelado(s) oculto(s)
            </p>
          ) : null}
          {cancelledCount > 0 ? (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
              <input
                type="checkbox"
                className="rounded border-white/20 bg-sgp-base"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
              />
              Mostrar itens cancelados
            </label>
          ) : null}
        </div>
      </header>

      {groups.length === 0 ? (
        <p className="text-[12px] text-slate-500">
          Nenhum item ativo. Ative &quot;Mostrar itens cancelados&quot; para ver itens cancelados.
        </p>
      ) : null}

      {groups.map((group) => (
        <article key={String(group.dateKey)} className="space-y-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {group.label}
          </h4>
          <ul className="space-y-2 border-l-2 border-white/[0.08] pl-3">
            {group.items.map((item) => (
              <ConveyorOperationalPlanItemRow
                key={item.id}
                item={item}
                structure={structure}
                dailyCapacityMinutes={dailyCapacityMinutes}
                planGeneratedAt={planGeneratedAt}
                canEditItems={canEditItems}
                showCancelled={showCancelled}
                busy={busy}
                onSave={onSaveItem}
              />
            ))}
          </ul>
        </article>
      ))}
    </section>
  )
}
