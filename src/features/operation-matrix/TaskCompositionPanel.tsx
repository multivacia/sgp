import { useMemo } from 'react'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { getBranchStats } from './matrixTreeAggregates'
import { HighlightName } from './matrixTreeHighlight'
import { ActivityRowCompact } from './ActivityRowCompact'
import { MatrixContextActionsMenu } from './MatrixContextActionsMenu'

type Props = {
  task: MatrixNodeTreeApi
  aggregateMaps: MatrixTreeAggregateMaps
  collaboratorIdToName: ReadonlyMap<string, string>
  selectedId: string | null
  activePathIds: ReadonlySet<string>
  onSelectNode: (id: string) => void
  searchQuery: string
  matchIds: ReadonlySet<string>
  /** Quando falso, omite o título "Composição" (uso com cabeçalho externo). */
  showHeading?: boolean
  /** Ações por área (nível SECTOR) na composição. */
  onDuplicateSector?: (sectorId: string) => void | Promise<void>
  onRemoveSector?: (sectorId: string) => void | Promise<void>
  sectorActionsBusy?: boolean
  onAddActivityToSector?: (sectorId: string) => void | Promise<void>
  onReorderActivityInSector?: (
    sectorId: string,
    dir: 'up' | 'down',
  ) => void | Promise<void>
  onDuplicateActivity?: (activityId: string) => void | Promise<void>
  onRemoveActivity?: (activityId: string) => void | Promise<void>
  /** Abre edição da etapa no painel (não confundir com seleção na linha). */
  onEditActivity?: (activityId: string) => void
}

export function TaskCompositionPanel({
  task,
  aggregateMaps,
  collaboratorIdToName,
  selectedId,
  activePathIds,
  onSelectNode,
  searchQuery,
  matchIds,
  showHeading = true,
  onDuplicateSector,
  onRemoveSector,
  sectorActionsBusy = false,
  onAddActivityToSector,
  onReorderActivityInSector,
  onDuplicateActivity,
  onRemoveActivity,
  onEditActivity,
}: Props) {
  const sectors = useMemo(
    () =>
      task.children
        .filter((c) => c.node_type === 'SECTOR')
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
    [task.children],
  )

  return (
    <div className="space-y-3">
      {showHeading ? (
        <h2 className="px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Composição
        </h2>
      ) : null}
      <div className="space-y-3 pr-0.5">
        {sectors.length === 0 ? (
          <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-500">
            Nenhuma área nesta opção.
          </p>
        ) : (
          sectors.map((sector) => {
            const st = getBranchStats(aggregateMaps, sector.id)
            const sectorSelected = selectedId === sector.id
            const isSectorBranch =
              !sectorSelected &&
              selectedId != null &&
              activePathIds.has(sector.id)
            const isSearchMatch =
              !!searchQuery.trim() && matchIds.has(sector.id) && !sectorSelected
            const warnBranch = st.activitiesWithoutResponsibleInBranch > 0

            const frameSelected =
              sectorSelected &&
              'border-sgp-gold/50 bg-sgp-gold/[0.07] ring-2 ring-sgp-gold/30'
            const frameBranch =
              !sectorSelected &&
              isSectorBranch &&
              'border-sgp-gold/25 bg-sgp-gold/[0.04] ring-1 ring-sgp-gold/20'
            const frameIdle =
              !sectorSelected &&
              !isSectorBranch &&
              'border-white/[0.08] bg-white/[0.02] ring-1 ring-white/[0.04] hover:border-sgp-gold/22 hover:bg-white/[0.04]'

            const cardFrame = frameSelected || frameBranch || frameIdle
            const searchRing = isSearchMatch ? 'ring-1 ring-amber-400/35' : ''
            const warnEdge = warnBranch ? 'border-l-[3px] border-l-amber-500/55' : ''

            const metricsLine = `${st.activityCount} etapas · ${st.plannedMinutesSum} min`

            const showSectorActionsColumn = onDuplicateSector && onRemoveSector

            const orderedActivities = sector.children
              .filter((c) => c.node_type === 'ACTIVITY')
              .slice()
              .sort((a, b) => a.order_index - b.order_index)

            const focusActivityInSector =
              selectedId != null &&
              orderedActivities.some((a) => a.id === selectedId)
                ? selectedId
                : null

            const focusIdx = focusActivityInSector
              ? orderedActivities.findIndex((a) => a.id === focusActivityInSector)
              : -1

            const activityReorderUpDisabled =
              focusActivityInSector == null ||
              focusIdx <= 0 ||
              !onReorderActivityInSector
            const activityReorderDownDisabled =
              focusActivityInSector == null ||
              focusIdx < 0 ||
              focusIdx >= orderedActivities.length - 1 ||
              !onReorderActivityInSector

            const showEtapasToolbar =
              onAddActivityToSector && onReorderActivityInSector

            const showActivityRowActions =
              onDuplicateActivity && onRemoveActivity

            return (
              <div
                key={sector.id}
                data-matrix-panel-focus={sector.id}
                className="scroll-mt-3"
              >
                <article
                  className={[
                    'flex min-h-[5.25rem] flex-col overflow-hidden rounded-xl border text-left transition duration-200',
                    cardFrame,
                    searchRing,
                    warnEdge,
                  ].join(' ')}
                  title={
                    warnBranch
                      ? 'Há etapas sem responsável definido nesta área'
                      : undefined
                  }
                >
                  <div className="flex min-h-[5.25rem] flex-1 flex-row">
                    <button
                      type="button"
                      onClick={() => onSelectNode(sector.id)}
                      className={
                        showSectorActionsColumn
                          ? 'flex min-h-[5.25rem] min-w-0 flex-1 flex-col rounded-none rounded-tl-xl rounded-tr-none p-2.5 text-left sm:p-3'
                          : 'flex min-h-[5.25rem] min-w-0 flex-1 flex-col rounded-t-xl rounded-b-none p-2.5 text-left sm:p-3'
                      }
                    >
                      <div className="flex min-h-0 flex-1 flex-col">
                        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          Área
                        </span>
                        <p className="mt-0.5 line-clamp-2 font-heading text-sm font-bold leading-snug tracking-tight text-slate-50">
                          <HighlightName
                            name={sector.name}
                            query={searchQuery}
                            className=""
                          />
                        </p>
                        <p className="mt-auto pt-1.5 text-[10px] leading-snug text-slate-400 tabular-nums">
                          <span className="line-clamp-1 font-medium">
                            {metricsLine}
                          </span>
                        </p>
                      </div>
                    </button>
                    {showSectorActionsColumn ? (
                      <div className="flex shrink-0 flex-col justify-start rounded-tr-xl border-l border-white/[0.08] py-1.5 pl-1 pr-1.5">
                        <MatrixContextActionsMenu
                          menuKey={`matrix-sector-${sector.id}`}
                          disabled={sectorActionsBusy}
                          items={[
                            {
                              label: 'Editar',
                              onClick: () => onSelectNode(sector.id),
                            },
                            {
                              label: 'Duplicar',
                              onClick: () =>
                                void onDuplicateSector!(sector.id),
                            },
                            {
                              label: 'Remover',
                              destructive: true,
                              onClick: () => void onRemoveSector!(sector.id),
                            },
                          ]}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-b-xl border-t border-white/[0.06] bg-black/10">
                    {showEtapasToolbar ? (
                      <div className="border-b border-white/[0.06] bg-black/[0.08] px-2 py-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <h3 className="shrink-0 px-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            Etapas
                          </h3>
                          <div
                            className="flex min-w-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto sm:ml-auto [scrollbar-width:thin]"
                            role="toolbar"
                            aria-label="Ações das etapas desta área"
                          >
                            <button
                              type="button"
                              disabled={sectorActionsBusy}
                              onClick={() => void onAddActivityToSector(sector.id)}
                              className="shrink-0 rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-2.5 py-1 text-[11px] font-semibold text-sgp-gold-warm disabled:opacity-50"
                            >
                              + Adicionar etapa
                            </button>
                            <button
                              type="button"
                              disabled={
                                sectorActionsBusy || activityReorderUpDisabled
                              }
                              onClick={() =>
                                void onReorderActivityInSector(sector.id, 'up')
                              }
                              className="shrink-0 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90 disabled:opacity-40"
                            >
                              Subir
                            </button>
                            <button
                              type="button"
                              disabled={
                                sectorActionsBusy || activityReorderDownDisabled
                              }
                              onClick={() =>
                                void onReorderActivityInSector(sector.id, 'down')
                              }
                              className="shrink-0 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/90 disabled:opacity-40"
                            >
                              Descer
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="space-y-1.5 px-2 py-2.5">
                      {orderedActivities.length === 0 ? (
                        <p className="px-1 text-[10px] text-slate-600">Sem etapas.</p>
                      ) : (
                        orderedActivities.map((act) => {
                          const active = act.id === selectedId
                          const onPath = activePathIds.has(act.id)
                          const dr = act.default_responsible_id?.trim() ?? ''
                          const isMatch =
                            !!searchQuery.trim() &&
                            (matchIds.has(act.id) ||
                              matchIds.has(sector.id) ||
                              matchIds.has(task.id))
                          let responsibleLabel: string | null = null
                          let warnOrphan = false
                          if (!dr) {
                            responsibleLabel = null
                          } else {
                            const name = collaboratorIdToName.get(dr)
                            if (name) responsibleLabel = name
                            else {
                              responsibleLabel = 'Não vinc.'
                              warnOrphan = true
                            }
                          }
                          return (
                            <ActivityRowCompact
                              key={act.id}
                              node={act}
                              selected={active}
                              onPath={onPath}
                              onSelect={() => onSelectNode(act.id)}
                              searchQuery={searchQuery}
                              isMatch={isMatch}
                              responsibleLabel={responsibleLabel}
                              warnNoResponsible={!dr}
                              warnOrphan={warnOrphan}
                              panelFocusId={act.id}
                              showTypeBadge={false}
                              inlineActions={
                                showActivityRowActions
                                  ? {
                                      onEdit: () =>
                                        onEditActivity
                                          ? onEditActivity(act.id)
                                          : onSelectNode(act.id),
                                      onDuplicate: () =>
                                        void onDuplicateActivity(act.id),
                                      onRemove: () =>
                                        void onRemoveActivity(act.id),
                                      busy: sectorActionsBusy,
                                    }
                                  : undefined
                              }
                            />
                          )
                        })
                      )}
                    </div>
                  </div>
                </article>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
