import { memo, useMemo } from 'react'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { getBranchStats } from './matrixTreeAggregates'
import { HighlightName } from './matrixTreeHighlight'
import { ActivityRowCompact } from './ActivityRowCompact'

export type SectorAccordionProps = {
  sector: MatrixNodeTreeApi
  open: boolean
  onOpenChange: (open: boolean) => void
  aggregateMaps: MatrixTreeAggregateMaps
  collaboratorIdToName: ReadonlyMap<string, string>
  selectedId: string | null
  activePathIds: ReadonlySet<string>
  onSelect: (id: string) => void
  searchQuery: string
  matchIds: ReadonlySet<string>
}

export const SectorAccordion = memo(function SectorAccordion({
  sector,
  open,
  onOpenChange,
  aggregateMaps,
  collaboratorIdToName,
  selectedId,
  activePathIds,
  onSelect,
  searchQuery,
  matchIds,
}: SectorAccordionProps) {
  const st = useMemo(() => getBranchStats(aggregateMaps, sector.id), [aggregateMaps, sector.id])
  const hasChildren = sector.children.length > 0

  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] opacity-[0.92]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.03]"
      >
        <span className="mt-0.5 flex h-5 w-4 shrink-0 items-center justify-center text-[9px] text-slate-600">
          {hasChildren ? (open ? '▼' : '▶') : '·'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="shrink-0 rounded border border-white/[0.07] bg-white/[0.03] px-1 py-px text-[8px] font-bold uppercase tracking-wide text-slate-500">
              Área
            </span>
            <span className="text-[10px] tabular-nums text-slate-600">
              {st.activityCount} etapas · {st.plannedMinutesSum} min
            </span>
          </div>
          <div className="mt-0.5 text-[11px] font-medium leading-tight text-slate-300">
            <HighlightName name={sector.name} query={searchQuery} className="" />
          </div>
        </div>
      </button>
      <div
        className={[
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-0.5 border-t border-white/[0.05] px-2 pb-2 pt-1">
            {open
              ? sector.children.map((act) => {
              const active = act.id === selectedId
              const onPath = activePathIds.has(act.id)
              const dr = act.default_responsible_id?.trim() ?? ''
              const isMatch = !!searchQuery.trim() && matchIds.has(act.id)
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
                  onSelect={() => onSelect(act.id)}
                  searchQuery={searchQuery}
                  isMatch={isMatch}
                  responsibleLabel={responsibleLabel}
                  warnNoResponsible={!dr}
                  warnOrphan={warnOrphan}
                />
              )
            })
              : null}
          </div>
        </div>
      </div>
    </div>
  )
})
