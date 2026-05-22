import { useMemo } from 'react'
import type {
  OperationalPlanningFactoryIntakeItem,
  OperationalPlanningPlanItem,
} from '../../domain/operational-planning/operational-planning.types'
import { buildVisibleFactoryIntakeItems } from './buildVisibleFactoryIntakeItems'
import type { FactoryIntakeDraftRef } from './buildVisibleFactoryIntakeItems'
import {
  buildVisibleFactoryIntakeQueueGroups,
  enrichFactoryIntakeQueueGroups,
  type FactoryIntakeQueueGroup,
} from './factoryIntakeQueue'
import {
  groupFactoryIntakeItemsByConveyor,
  isFactoryIntakeFiltersActive,
  summarizeFactoryIntakeTotals,
  type FactoryIntakeFilters,
  type FactoryIntakeWeekContext,
} from './factoryIntakeGrouping'
import { formatPlanningMinutes } from './planningBoardHelpers'

export function formatFactoryIntakeKpiLine(totals: {
  conveyorCount: number
  itemCount: number
  waitingMinutes: number
}): string {
  const parts = [
    `${totals.conveyorCount} ${totals.conveyorCount === 1 ? 'esteira' : 'esteiras'}`,
    `${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'itens'}`,
    `${formatPlanningMinutes(totals.waitingMinutes)} aguardando encaixe`,
  ]
  return parts.join(' · ')
}

export function useFactoryIntakePanelData<TDraft extends FactoryIntakeDraftRef>(props: {
  intakeItems: readonly OperationalPlanningFactoryIntakeItem[]
  draftItems: readonly TDraft[]
  filters: FactoryIntakeFilters
  week: FactoryIntakeWeekContext
  weekPlanItems: readonly Pick<
    OperationalPlanningPlanItem,
    'conveyorId' | 'conveyorOperationalPlanItemId' | 'syncStatus'
  >[]
}) {
  const visibleGroups = useMemo(
    () =>
      buildVisibleFactoryIntakeQueueGroups(
        props.intakeItems,
        props.draftItems,
        props.filters,
        props.week,
        props.weekPlanItems,
      ),
    [props.intakeItems, props.draftItems, props.filters, props.week, props.weekPlanItems],
  )

  const visibleTotals = useMemo(
    () => summarizeFactoryIntakeTotals(visibleGroups),
    [visibleGroups],
  )

  const unfilteredVisibleGroups = useMemo((): FactoryIntakeQueueGroup[] => {
    const visible = buildVisibleFactoryIntakeItems(props.intakeItems, props.draftItems)
    const grouped = groupFactoryIntakeItemsByConveyor(visible)
    return enrichFactoryIntakeQueueGroups(grouped, {
      intakeItems: props.intakeItems,
      draftItems: props.draftItems,
      weekPlanItems: props.weekPlanItems,
    })
  }, [props.intakeItems, props.draftItems, props.weekPlanItems])

  const unfilteredTotals = useMemo(
    () => summarizeFactoryIntakeTotals(unfilteredVisibleGroups),
    [unfilteredVisibleGroups],
  )

  const filtersActive = isFactoryIntakeFiltersActive(props.filters)

  const emptyMessage = useMemo(() => {
    if (visibleGroups.length > 0) return null
    if (unfilteredTotals.itemCount === 0 && props.intakeItems.length === 0) {
      return 'Nenhuma esteira aguardando encaixe no momento.'
    }
    if (unfilteredTotals.itemCount === 0 && props.intakeItems.length > 0) {
      return 'Todos os itens aguardando encaixe já estão no rascunho desta semana.'
    }
    if (filtersActive) {
      return 'Nenhuma esteira encontrada para os filtros atuais.'
    }
    if (props.intakeItems.length > 0 && unfilteredTotals.conveyorCount === 0) {
      return 'Plano aguardando a fábrica, mas sem itens ativos para encaixe nesta visão.'
    }
    return 'Nenhuma esteira aguardando encaixe no momento.'
  }, [
    visibleGroups.length,
    unfilteredTotals.itemCount,
    unfilteredTotals.conveyorCount,
    props.intakeItems.length,
    filtersActive,
  ])

  return {
    visibleGroups,
    visibleTotals,
    unfilteredTotals,
    filtersActive,
    emptyMessage,
  }
}
