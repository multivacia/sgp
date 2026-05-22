import type {
  OperationalPlanningFactoryIntakeItem,
  OperationalPlanningPlanItem,
} from '../../domain/operational-planning/operational-planning.types'
import type { FactoryIntakeDraftRef } from './buildVisibleFactoryIntakeItems'
import { FactoryIntakeConveyorGroup } from './FactoryIntakeConveyorGroup'
import { FactoryIntakeFiltersBar } from './FactoryIntakeFilters'
import {
  DEFAULT_FACTORY_INTAKE_FILTERS,
  type FactoryIntakeFilters,
  type FactoryIntakeWeekContext,
} from './factoryIntakeGrouping'
import {
  formatFactoryIntakeKpiLine,
  useFactoryIntakePanelData,
} from './factoryIntakePanelData'

export type FactoryIntakePanelProps<TDraft extends FactoryIntakeDraftRef> = {
  intakeItems: readonly OperationalPlanningFactoryIntakeItem[]
  draftItems: readonly TDraft[]
  filters: FactoryIntakeFilters
  onFiltersChange: (next: FactoryIntakeFilters) => void
  week: FactoryIntakeWeekContext
  weekPlanItems: readonly Pick<
    OperationalPlanningPlanItem,
    'conveyorId' | 'conveyorOperationalPlanItemId' | 'syncStatus'
  >[]
  plannedActivityIds: ReadonlySet<string>
  onAddItem: (item: OperationalPlanningFactoryIntakeItem) => void
}

export function FactoryIntakePanel<TDraft extends FactoryIntakeDraftRef>(
  props: FactoryIntakePanelProps<TDraft>,
) {
  const { visibleGroups, visibleTotals, filtersActive, emptyMessage } =
    useFactoryIntakePanelData(props)

  function clearFilters() {
    props.onFiltersChange({ ...DEFAULT_FACTORY_INTAKE_FILTERS })
  }

  return (
    <>
      <div>
        <h2 className="text-[15px] font-semibold text-slate-100">Esteiras aguardando encaixe</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          Fila por esteira/plano — priorize pendências, progresso de encaixe e itens ainda fora do
          rascunho da semana.
        </p>
        <p className="mt-2 text-[12px] font-medium text-violet-200/90">
          {formatFactoryIntakeKpiLine(visibleTotals)}
        </p>
      </div>

      <FactoryIntakeFiltersBar
        filters={props.filters}
        onChange={props.onFiltersChange}
        filtersActive={filtersActive}
        onClear={clearFilters}
      />

      <div className="space-y-4 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto lg:pr-1">
        {visibleGroups.map((group) => (
          <FactoryIntakeConveyorGroup
            key={`${group.conveyorId}|${group.conveyorOperationalPlanId}`}
            group={group}
            plannedActivityIds={props.plannedActivityIds}
            onAddItem={props.onAddItem}
          />
        ))}
        {emptyMessage ? (
          <p className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] px-3 py-4 text-center text-[13px] text-slate-500">
            {emptyMessage}
          </p>
        ) : null}
      </div>
    </>
  )
}
