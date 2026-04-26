import { memo } from 'react'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import { MatrixContextActionsMenu } from './MatrixContextActionsMenu'
import { HighlightName } from './matrixTreeHighlight'

export type ActivityRowCompactProps = {
  node: MatrixNodeTreeApi
  selected: boolean
  onPath: boolean
  onSelect: () => void
  searchQuery: string
  isMatch: boolean
  responsibleLabel: string | null
  warnNoResponsible: boolean
  warnOrphan: boolean
  /** Alvo para scroll no painel (Matrizes). */
  panelFocusId?: string
  /** Quando falso, omite a badge “Etapa” (ex.: lista na Composição). Default: true. */
  showTypeBadge?: boolean
  /** Ações por etapa (Composição): coluna à direita com separador. */
  inlineActions?: {
    onEdit: () => void
    onDuplicate: () => void
    onRemove: () => void
    busy?: boolean
  }
}

export const ActivityRowCompact = memo(function ActivityRowCompact({
  node,
  selected,
  onPath,
  onSelect,
  searchQuery,
  isMatch,
  responsibleLabel,
  warnNoResponsible,
  warnOrphan,
  panelFocusId,
  showTypeBadge = true,
  inlineActions,
}: ActivityRowCompactProps) {
  const pm = node.planned_minutes
  const timeStr = pm != null ? `${pm}′` : '—'

  const textTone = !onPath
    ? 'text-slate-500'
    : selected
      ? 'text-white'
      : 'text-slate-200'

  const rowFrame = selected
    ? 'border-sgp-gold/55 bg-sgp-gold/[0.12] shadow-[inset_0_0_0_1px_rgba(201,162,39,0.2)]'
    : onPath && !selected
      ? 'border-sgp-gold/20 bg-sgp-gold/[0.04]'
      : 'border-transparent'

  const searchRing = isMatch && !selected ? 'ring-1 ring-amber-400/30' : ''

  const rowShell = [
    'flex w-full flex-row overflow-hidden rounded-lg border text-left transition-colors',
    rowFrame,
    searchRing,
    !selected && !onPath ? 'hover:border-white/[0.06] hover:bg-white/[0.04]' : '',
    'opacity-[0.97]',
  ].join(' ')

  const mainInner = (
    <>
      {showTypeBadge ? (
        <span className="mt-0.5 shrink-0 rounded-md border border-white/[0.1] bg-white/[0.04] px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-slate-500">
          Etapa
        </span>
      ) : null}
      {warnNoResponsible ? (
        <span
          className="mt-0.5 shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1 py-px text-[8px] font-semibold text-amber-200/85"
          title="Sem responsável padrão"
        >
          !
        </span>
      ) : null}
      {warnOrphan ? (
        <span
          className="mt-0.5 shrink-0 rounded border border-rose-500/30 bg-rose-500/10 px-1 py-px text-[8px] font-semibold text-rose-200/85"
          title="Responsável sem cadastro"
        >
          ?
        </span>
      ) : null}
      <span
        className={`min-w-0 flex-1 break-words text-[13px] leading-snug ${textTone}`}
      >
        <HighlightName name={node.name} query={searchQuery} className="font-medium" />
      </span>
      <span className="shrink-0 tabular-nums text-[10px] text-slate-500">{timeStr}</span>
      <span
        className="max-w-[38%] shrink-0 break-words text-right text-[10px] leading-snug text-slate-500"
        title={responsibleLabel ?? undefined}
      >
        {responsibleLabel ?? '—'}
      </span>
    </>
  )

  if (inlineActions) {
    const b = inlineActions.busy ?? false
    return (
      <div
        className={rowShell}
        {...(panelFocusId ? { 'data-matrix-panel-focus': panelFocusId } : {})}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 flex-row items-start gap-2 border-transparent bg-transparent px-2.5 py-2 text-left transition-colors"
        >
          {mainInner}
        </button>
        <div className="flex shrink-0 flex-col justify-center border-l border-white/[0.08] py-1 pl-1 pr-1.5">
          <MatrixContextActionsMenu
            menuKey={`matrix-activity-${node.id}`}
            disabled={b}
            items={[
              {
                label: 'Editar',
                onClick: () => inlineActions.onEdit(),
              },
              {
                label: 'Duplicar',
                onClick: () => void inlineActions.onDuplicate(),
              },
              {
                label: 'Remover',
                destructive: true,
                onClick: () => void inlineActions.onRemove(),
              },
            ]}
          />
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      {...(panelFocusId ? { 'data-matrix-panel-focus': panelFocusId } : {})}
      className={[
        rowShell,
        'flex items-start gap-2 px-2.5 py-2',
      ].join(' ')}
    >
      {mainInner}
    </button>
  )
})
