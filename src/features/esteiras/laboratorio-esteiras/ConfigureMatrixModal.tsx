import { useEffect, useMemo, useState } from 'react'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { formatMinutesToHoursLabel } from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'
import type { AppliedMatrixBlock, LabActivityItem, LabActivityOverride } from './laboratorioEsteiras.types'
import {
  buildAppliedMatrixBlock,
  countActivitiesInTree,
  defaultSelectedActivityIds,
  extractSectorGroupsFromMatrix,
  sumMinutesForActivityIds,
} from './laboratorioEsteirasState'
import { MatrixSectorGroup } from './MatrixSectorGroup'

type Props = {
  open: boolean
  matrixName: string
  tree: MatrixNodeTreeApi | undefined
  matrixId: string
  initialSelectedIds?: string[]
  editingBlockId?: string | null
  onClose: () => void
  onApply: (block: AppliedMatrixBlock) => void
}

export function ConfigureMatrixModal({
  open,
  matrixName,
  tree,
  matrixId,
  initialSelectedIds,
  editingBlockId,
  onClose,
  onApply,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activityOverrides, setActivityOverrides] = useState<Record<string, LabActivityOverride>>({})
  const [editingActivity, setEditingActivity] = useState<LabActivityItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editMinutes, setEditMinutes] = useState(60)

  useEffect(() => {
    if (!open || !tree) return
    setSelectedIds(
      initialSelectedIds?.length
        ? new Set(initialSelectedIds)
        : defaultSelectedActivityIds(tree),
    )
    setActivityOverrides({})
    setEditingActivity(null)
  }, [open, tree, matrixId, initialSelectedIds])

  const sectors = useMemo(() => (tree ? extractSectorGroupsFromMatrix(tree) : []), [tree])
  const totalActivities = countActivitiesInTree(tree)

  if (!open || !tree) return null

  const selectedCount = sectors
    .flatMap((s) => s.activities)
    .filter((a) => selectedIds.has(a.id)).length

  const totalMinutes =
    sumMinutesForActivityIds(tree, selectedIds) +
    Object.entries(activityOverrides).reduce((n, [id, o]) => {
      if (!selectedIds.has(id) || o.plannedMinutes == null) return n
      const base = sectors.flatMap((s) => s.activities).find((a) => a.id === id)
      if (!base) return n
      return n + (o.plannedMinutes - base.plannedMinutes)
    }, 0)

  function toggleActivity(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openEdit(act: LabActivityItem) {
    setEditingActivity(act)
    setEditName(activityOverrides[act.id]?.name ?? act.name)
    setEditMinutes(activityOverrides[act.id]?.plannedMinutes ?? act.plannedMinutes)
  }

  function saveEdit() {
    if (!editingActivity) return
    setActivityOverrides((prev) => ({
      ...prev,
      [editingActivity.id]: {
        name: editName.trim() || editingActivity.name,
        plannedMinutes: Math.max(0, Math.floor(Number(editMinutes) || 0)),
      },
    }))
    setEditingActivity(null)
  }

  function handleApply() {
    if (!tree) return
    const block = buildAppliedMatrixBlock(
      tree,
      matrixId,
      matrixName,
      selectedIds,
      editingBlockId ?? undefined,
      activityOverrides,
    )
    if (!block) return
    onApply(block)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="configure-matrix-title"
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl border border-white/[0.08] bg-[#0b1018] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start gap-3 border-b border-white/[0.06] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sgp-gold/15 text-sgp-gold">
            ⚙
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="configure-matrix-title" className="font-heading text-lg font-bold text-white">
              Configurar matriz
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Selecione o que fará parte da esteira. Você pode editar os itens.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-sm">
            <span className="text-slate-400">Matriz: </span>
            <span className="font-semibold text-sgp-gold">{matrixName}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {totalActivities} atividades · {formatMinutesToHoursLabel(sumMinutesInTree(tree))}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {sectors.map((group, i) => (
            <MatrixSectorGroup
              key={group.sectorId}
              group={group}
              index={i + 1}
              selectedIds={selectedIds}
              activityOverrides={activityOverrides}
              onToggle={toggleActivity}
              onEdit={openEdit}
            />
          ))}
        </div>

        <div className="border-t border-white/[0.06] p-4">
          <div className="mb-4 flex flex-col gap-1 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {selectedCount} atividades selecionadas de {totalActivities} atividades totais
            </span>
            <span className="font-semibold text-sgp-gold">
              {formatMinutesToHoursLabel(totalMinutes)} tempo previsto total
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} className="sgp-cta-secondary min-h-12 text-sm">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={selectedCount === 0}
              className="sgp-cta-primary min-h-12 text-sm disabled:opacity-45"
            >
              Aplicar à esteira
            </button>
          </div>
        </div>
      </div>

      {editingActivity ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0f1623] p-5">
            <h3 className="font-heading text-base font-bold text-white">Editar atividade</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nome
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="sgp-input-app w-full px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tempo previsto (min)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(Number(e.target.value))}
                  className="sgp-input-app w-full px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="sgp-cta-secondary py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button type="button" onClick={saveEdit} className="sgp-cta-primary py-2.5 text-sm">
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function sumMinutesInTree(tree: MatrixNodeTreeApi): number {
  return extractSectorGroupsFromMatrix(tree)
    .flatMap((s) => s.activities)
    .reduce((n, a) => n + a.plannedMinutes, 0)
}
