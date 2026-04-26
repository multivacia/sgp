import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { sortMatrixChildNodes } from './cloneCatalogTaskSubtreeForDraft'
import { parseMatrixActivitySupportIds } from './matrixActivityCollaboratorsMeta'

type Props = {
  taskRoot: MatrixNodeTreeApi
  resolveCollaboratorLabel: (id: string) => string
}

function formatMinutes(m: number | null | undefined): string {
  if (m == null || Number.isNaN(m)) return '—'
  return `${m} min`
}

function ActivityReadonly({
  node,
  resolveCollaboratorLabel,
}: {
  node: MatrixNodeTreeApi
  resolveCollaboratorLabel: (id: string) => string
}) {
  const primary = node.default_responsible_id
  const support = parseMatrixActivitySupportIds(node.metadata_json)
  const primaryLabel = primary ? resolveCollaboratorLabel(primary) : '—'
  const supportLabels = support
    .filter((id) => id !== primary)
    .map((id) => resolveCollaboratorLabel(id))

  return (
    <div className="rounded-md border border-white/[0.06] bg-black/20 px-2 py-1.5">
      <p className="text-[11px] font-medium text-slate-200">{node.name}</p>
      <dl className="mt-1 grid gap-0.5 text-[10px] text-slate-500">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-slate-600">Tempo</dt>
          <dd>{formatMinutes(node.planned_minutes)}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-slate-600">Responsável</dt>
          <dd>{primaryLabel}</dd>
        </div>
        {supportLabels.length > 0 ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-slate-600">Apoio</dt>
            <dd>{supportLabels.join(', ')}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

function SectorReadonly({
  sector,
  resolveCollaboratorLabel,
}: {
  sector: MatrixNodeTreeApi
  resolveCollaboratorLabel: (id: string) => string
}) {
  const activities = sortMatrixChildNodes(sector).filter(
    (c) => c.node_type === 'ACTIVITY',
  )
  return (
    <div className="border-l border-white/10 pl-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Setor
      </p>
      <p className="text-xs text-slate-200">{sector.name}</p>
      {activities.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {activities.map((a) => (
            <li key={a.id}>
              <p className="mb-0.5 text-[10px] font-medium uppercase text-slate-600">
                Atividade
              </p>
              <ActivityReadonly
                node={a}
                resolveCollaboratorLabel={resolveCollaboratorLabel}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[10px] text-slate-600">Sem atividades.</p>
      )}
    </div>
  )
}

/**
 * Estrutura readonly de uma tarefa (TASK) do catálogo — setores e atividades.
 */
export function MatrixCatalogReadonlyDetails({
  taskRoot,
  resolveCollaboratorLabel,
}: Props) {
  const sectors = sortMatrixChildNodes(taskRoot).filter(
    (c) => c.node_type === 'SECTOR',
  )

  return (
    <div className="space-y-3 pt-1">
      <div className="rounded-lg border border-white/[0.05] bg-black/25 px-2 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Tarefa
        </p>
        <p className="text-sm text-slate-100">{taskRoot.name}</p>
        {taskRoot.description ? (
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {taskRoot.description}
          </p>
        ) : null}
      </div>
      {sectors.length === 0 ? (
        <p className="text-[11px] text-slate-600">
          Sem setores cadastrados nesta tarefa.
        </p>
      ) : (
        <ul className="space-y-3">
          {sectors.map((s) => (
            <li key={s.id}>
              <SectorReadonly
                sector={s}
                resolveCollaboratorLabel={resolveCollaboratorLabel}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
