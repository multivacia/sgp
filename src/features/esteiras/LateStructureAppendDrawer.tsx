import { useMemo, useState } from 'react'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import type { Team } from '../../domain/teams/team.types'
import type {
  ConveyorStructure,
  CreateConveyorAreaInput,
  CreateConveyorOptionInput,
  CreateConveyorStepAssigneeInput,
  CreateConveyorStepInput,
  PostConveyorStructureItemBody,
} from '../../domain/conveyors/conveyor.types'
import type {
  MatrixNodeApi,
  MatrixNodeTreeApi,
} from '../../domain/operation-matrix/operation-matrix.types'
import { SgpInlineBanner } from '../../components/ui/SgpToast'
import {
  buildManualConveyorInput,
  manualAssigneeRowsToApi,
  validateManualStepAssignees,
  validateManualStructure,
  type ManualAreaDraft,
  type ManualOptionDraft,
  type ManualStepDraft,
  type NovaEsteiraAlocacaoLinha,
} from './nova-esteira/matrixToConveyorCreateInput'
import {
  createInitialManualOption,
  NovaEsteiraComposicaoManual,
} from './nova-esteira/NovaEsteiraComposicaoManual'
import {
  collectTaskNodesFromItemTree,
  matrixTaskSubtreeToManualDraft,
} from './nova-esteira/novaEsteiraDraftFromMatrix'

type AppendIntent = 'MATRIX_TASK' | 'MANUAL_TASK' | 'AREA' | 'STEP'

type Props = {
  open: boolean
  busy: boolean
  error?: string | null
  structure: ConveyorStructure
  matrices: MatrixNodeApi[]
  matricesLoading: boolean
  matricesError: string | null
  treeByMatrixId: Record<string, MatrixNodeTreeApi | undefined>
  treesLoading: boolean
  treesError: string | null
  colabList: Collaborator[]
  colabLoading: boolean
  colabError: string | null
  teamList: Team[]
  teamLoading: boolean
  teamError: string | null
  onCancel: () => void
  onConfirm: (body: PostConveyorStructureItemBody) => void
}

const STRUCTURE_HINT = 'Preencha os dados da tarefa, do setor e da atividade.'

const INTENT_OPTIONS: Array<{ id: AppendIntent; title: string; hint: string }> = [
  {
    id: 'MATRIX_TASK',
    title: 'Tarefa da Matriz',
    hint: 'Inclui uma tarefa completa a partir do catálogo.',
  },
  {
    id: 'MANUAL_TASK',
    title: 'Tarefa manual',
    hint: 'Monta uma nova tarefa (setor + atividades) na mão.',
  },
  {
    id: 'AREA',
    title: 'Setor em tarefa existente',
    hint: 'Acrescenta um setor sob uma tarefa já existente.',
  },
  {
    id: 'STEP',
    title: 'Atividade em setor existente',
    hint: 'Acrescenta uma atividade sob um setor já existente.',
  },
]

function newKey() {
  return crypto.randomUUID()
}

function emptyStep(): ManualStepDraft {
  return { key: newKey(), titulo: '', plannedMinutes: 60, plannedQuantity: 1 }
}

function emptyArea(): ManualAreaDraft {
  return { key: newKey(), titulo: '', steps: [emptyStep()] }
}

function createAreaOnlyRoots(): ManualOptionDraft[] {
  return [
    {
      key: newKey(),
      titulo: 'Novo setor',
      areas: [emptyArea()],
    },
  ]
}

function createStepOnlyRoots(): ManualOptionDraft[] {
  return [
    {
      key: newKey(),
      titulo: 'Nova atividade',
      areas: [{ key: newKey(), titulo: 'Setor alvo', steps: [emptyStep()] }],
    },
  ]
}

function mapOriginFromMatrix(edited: boolean): 'BASE' | 'HYBRID' {
  return edited ? 'HYBRID' : 'BASE'
}

function withBaseSourceOrigin(option: CreateConveyorOptionInput): CreateConveyorOptionInput {
  return {
    ...option,
    sourceOrigin: 'base',
    areas: option.areas.map((ar) => ({
      ...ar,
      sourceOrigin: 'base',
      steps: ar.steps.map((st) => ({ ...st, sourceOrigin: 'base' })),
    })),
  }
}

/**
 * Drawer de inclusão tardia multinível:
 * 1) escolhe o que incluir; 2) monta o payload discriminado (OPTION/AREA/STEP).
 */
export function LateStructureAppendDrawer({
  open,
  busy,
  error = null,
  structure,
  matrices,
  matricesLoading,
  matricesError,
  treeByMatrixId,
  treesLoading,
  treesError,
  colabList,
  colabLoading,
  colabError,
  teamList,
  teamLoading,
  teamError,
  onCancel,
  onConfirm,
}: Props) {
  const [intent, setIntent] = useState<AppendIntent | null>(null)
  const [roots, setRoots] = useState<ManualOptionDraft[]>(() => [createInitialManualOption(1)])
  const [aloc, setAloc] = useState<Record<string, NovaEsteiraAlocacaoLinha[]>>({})
  const [reason, setReason] = useState('')
  const [structureTouched, setStructureTouched] = useState(false)
  const [composicaoKey, setComposicaoKey] = useState(0)
  const [matrixRootItemId, setMatrixRootItemId] = useState<string | null>(null)
  const [selectedMatrixTaskId, setSelectedMatrixTaskId] = useState<string | null>(null)
  const [targetOptionId, setTargetOptionId] = useState<string>('')
  const [targetAreaId, setTargetAreaId] = useState<string>('')
  const [matrixEdited, setMatrixEdited] = useState(false)

  const reasonTrim = reason.trim()
  const reasonOk = reasonTrim.length >= 3 && reasonTrim.length <= 500

  const matrixTasks = useMemo(() => {
    const out: Array<{ matrixItemId: string; matrixName: string; task: MatrixNodeTreeApi }> = []
    for (const m of matrices) {
      const tree = treeByMatrixId[m.id]
      if (!tree) continue
      for (const { task } of collectTaskNodesFromItemTree(tree, m.id)) {
        out.push({ matrixItemId: m.id, matrixName: m.name, task })
      }
    }
    return out
  }, [matrices, treeByMatrixId])

  const selectedOption = structure.options.find((o) => o.id === targetOptionId) ?? null
  const selectedArea =
    selectedOption?.areas.find((a) => a.id === targetAreaId) ?? null

  const structureError = useMemo(() => {
    if (!intent) return null
    if (intent === 'MATRIX_TASK' && !selectedMatrixTaskId) {
      return 'Selecione uma tarefa da matriz.'
    }
    if (intent === 'AREA' && !targetOptionId) {
      return 'Selecione a tarefa (OPTION) de destino.'
    }
    if (intent === 'STEP') {
      if (!targetOptionId) return 'Selecione a tarefa (OPTION) de destino.'
      if (!targetAreaId) return 'Selecione o setor (AREA) de destino.'
    }
    if (intent === 'AREA') {
      const area = roots[0]?.areas[0]
      if (!area) return 'Informe o setor a incluir.'
      if ((roots[0]?.areas.length ?? 0) !== 1) {
        return 'Inclua exatamente um setor neste rascunho.'
      }
      if (!area.titulo.trim()) return 'Informe o título do setor.'
      if (area.steps.length < 1) return 'O setor precisa de pelo menos uma atividade.'
      for (const st of area.steps) {
        if (!st.titulo.trim()) return 'Informe o título de cada atividade.'
      }
      return validateManualStepAssignees(roots, aloc)
    }
    if (intent === 'STEP') {
      const step = roots[0]?.areas[0]?.steps[0]
      if (!step) return 'Informe a atividade a incluir.'
      if ((roots[0]?.areas.length ?? 0) !== 1 || (roots[0]?.areas[0]?.steps.length ?? 0) !== 1) {
        return 'Inclua exatamente uma atividade neste rascunho.'
      }
      if (!step.titulo.trim()) return 'Informe o título da atividade.'
      return validateManualStepAssignees(roots, aloc)
    }
    if (roots.length !== 1) return 'Inclua exatamente uma nova tarefa (OPTION).'
    return validateManualStructure(roots) ?? validateManualStepAssignees(roots, aloc)
  }, [
    intent,
    selectedMatrixTaskId,
    targetOptionId,
    targetAreaId,
    roots,
    aloc,
  ])

  const canSubmit = !busy && intent != null && structureError === null && reasonOk

  if (!open) return null

  function resetDraftForIntent(next: AppendIntent) {
    setIntent(next)
    setStructureTouched(false)
    setMatrixEdited(false)
    setMatrixRootItemId(null)
    setSelectedMatrixTaskId(null)
    setTargetOptionId('')
    setTargetAreaId('')
    setAloc({})
    setComposicaoKey((k) => k + 1)
    if (next === 'MANUAL_TASK') {
      setRoots([createInitialManualOption(1)])
    } else if (next === 'MATRIX_TASK') {
      setRoots([createInitialManualOption(1)])
    } else if (next === 'AREA') {
      setRoots(createAreaOnlyRoots())
    } else {
      setRoots(createStepOnlyRoots())
    }
  }

  function resetDraftStructure() {
    if (intent === 'AREA') {
      setRoots(createAreaOnlyRoots())
    } else if (intent === 'STEP') {
      setRoots(createStepOnlyRoots())
    } else if (intent === 'MATRIX_TASK') {
      setRoots([createInitialManualOption(1)])
      setSelectedMatrixTaskId(null)
      setMatrixRootItemId(null)
      setMatrixEdited(false)
    } else {
      setRoots([createInitialManualOption(1)])
    }
    setAloc({})
    setStructureTouched(false)
    setComposicaoKey((k) => k + 1)
  }

  function handleRootsChange(next: ManualOptionDraft[]) {
    setStructureTouched(true)
    if (intent === 'MATRIX_TASK') setMatrixEdited(true)
    if (next.length === 0) {
      resetDraftStructure()
      return
    }
    if (intent === 'AREA' || intent === 'STEP') {
      setRoots(next.slice(0, 1))
      return
    }
    setRoots(next.slice(0, 1))
  }

  function handleAlocChange(
    next:
      | Record<string, NovaEsteiraAlocacaoLinha[]>
      | ((prev: Record<string, NovaEsteiraAlocacaoLinha[]>) => Record<string, NovaEsteiraAlocacaoLinha[]>),
  ) {
    setStructureTouched(true)
    if (intent === 'MATRIX_TASK') setMatrixEdited(true)
    setAloc(next)
  }

  function applyMatrixTask(matrixItemId: string, task: MatrixNodeTreeApi) {
    const bundle = matrixTaskSubtreeToManualDraft(task, `t:${task.id}`)
    if (!bundle) return
    setSelectedMatrixTaskId(task.id)
    setMatrixRootItemId(matrixItemId)
    setRoots([bundle.option])
    setAloc(bundle.initialAllocations)
    setStructureTouched(true)
    setMatrixEdited(false)
    setComposicaoKey((k) => k + 1)
  }

  function buildAssignMap(): Record<string, CreateConveyorStepAssigneeInput[]> {
    const assignMap: Record<string, CreateConveyorStepAssigneeInput[]> = {}
    for (const op of roots) {
      for (const ar of op.areas) {
        for (const st of ar.steps) {
          const rows = aloc[st.key] ?? []
          if (rows.length > 0) assignMap[st.key] = manualAssigneeRowsToApi(rows)
        }
      }
    }
    return assignMap
  }

  function buildOptionFromRoots(): CreateConveyorOptionInput {
    const built = buildManualConveyorInput(
      {
        nome: 'late-append',
        cliente: '',
        veiculo: '',
        modeloVersao: '',
        placa: '',
        observacoes: '',
        responsavel: '',
        prazoEstimado: '',
        prioridade: 'media',
        colaboradorId: null,
      },
      roots,
      buildAssignMap(),
    )
    return built.options[0] as CreateConveyorOptionInput
  }

  function buildAreaFromRoots(): CreateConveyorAreaInput {
    const option = buildOptionFromRoots()
    return option.areas[0]!
  }

  function buildStepFromRoots(): CreateConveyorStepInput {
    const area = buildAreaFromRoots()
    return area.steps[0]!
  }

  function handleConfirm() {
    if (!canSubmit || !intent) return
    if (intent === 'MATRIX_TASK') {
      const option = withBaseSourceOrigin(buildOptionFromRoots())
      onConfirm({
        appendKind: 'OPTION',
        targetParentNodeId: null,
        reason: reasonTrim,
        originType: mapOriginFromMatrix(matrixEdited),
        matrixRootItemId,
        option,
      })
      return
    }
    if (intent === 'MANUAL_TASK') {
      onConfirm({
        appendKind: 'OPTION',
        targetParentNodeId: null,
        reason: reasonTrim,
        originType: 'MANUAL',
        matrixRootItemId: null,
        option: buildOptionFromRoots(),
      })
      return
    }
    if (intent === 'AREA') {
      onConfirm({
        appendKind: 'AREA',
        targetParentNodeId: targetOptionId,
        reason: reasonTrim,
        originType: 'MANUAL',
        matrixRootItemId: null,
        area: buildAreaFromRoots(),
      })
      return
    }
    onConfirm({
      appendKind: 'STEP',
      targetParentNodeId: targetAreaId,
      reason: reasonTrim,
      originType: 'MANUAL',
      matrixRootItemId: null,
      step: buildStepFromRoots(),
    })
  }

  const showComposicao =
    intent === 'MANUAL_TASK' ||
    (intent === 'MATRIX_TASK' && selectedMatrixTaskId != null) ||
    intent === 'AREA' ||
    intent === 'STEP'

  const optionRemoveLabel = 'Descartar item'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="late-structure-append-title"
    >
      <div
        data-testid="late-structure-append-panel"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-sgp-border bg-sgp-app-panel text-[color:var(--semantic-base-fg)] shadow-2xl"
      >
        <header className="border-b border-sgp-border px-4 py-3">
          <h2
            id="late-structure-append-title"
            className="font-heading text-base font-semibold text-[color:var(--semantic-base-fg)]"
          >
            Incluir novo item
          </h2>
          <p className="mt-1 text-xs text-sgp-muted">
            A estrutura existente permanece intacta. Itens novos entram no Backlog do Planejamento
            Semanal quando geram atividades.
          </p>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-sgp-muted">
              Motivo da inclusão <span className="text-sgp-gold">*</span>
            </span>
            <textarea
              className="sgp-input-app min-h-[88px] w-full resize-y"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo (3 a 500 caracteres)"
              maxLength={500}
              disabled={busy}
            />
            <span className="block text-[11px] text-sgp-muted">
              {reasonTrim.length}/500
              {!reasonOk && reasonTrim.length > 0 ? ' — mínimo 3 caracteres' : null}
            </span>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-semibold uppercase tracking-wide text-sgp-muted">
              O que você deseja incluir?
            </legend>
            <div
              data-testid="late-append-intent-options"
              className="grid gap-2 sm:grid-cols-2"
            >
              {INTENT_OPTIONS.map((opt) => {
                const selected = intent === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`late-append-intent-${opt.id}`}
                    disabled={busy}
                    onClick={() => resetDraftForIntent(opt.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition ${
                      selected
                        ? 'border-sgp-gold bg-sgp-surface-muted'
                        : 'border-sgp-border-subtle bg-sgp-surface-muted/50 hover:border-sgp-border'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-[color:var(--semantic-base-fg)]">
                      {opt.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-sgp-muted">{opt.hint}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {intent === 'MATRIX_TASK' ? (
            <div className="space-y-2 rounded-xl border border-sgp-border-subtle bg-sgp-surface-muted p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sgp-muted">
                Tarefa da Matriz
              </p>
              {matricesLoading || treesLoading ? (
                <p className="text-sm text-sgp-muted">Carregando catálogo…</p>
              ) : null}
              {matricesError || treesError ? (
                <SgpInlineBanner message={matricesError ?? treesError ?? ''} variant="error" />
              ) : null}
              {!matricesLoading && !treesLoading && matrixTasks.length === 0 ? (
                <p className="text-sm text-sgp-muted">Nenhuma tarefa disponível no catálogo.</p>
              ) : null}
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {matrixTasks.map(({ matrixItemId, matrixName, task }) => {
                  const selected = selectedMatrixTaskId === task.id
                  return (
                    <button
                      key={`${matrixItemId}:${task.id}`}
                      type="button"
                      disabled={busy}
                      onClick={() => applyMatrixTask(matrixItemId, task)}
                      className={`block w-full rounded-lg border px-2.5 py-2 text-left text-sm ${
                        selected
                          ? 'border-sgp-gold bg-sgp-app-panel'
                          : 'border-sgp-border-subtle hover:border-sgp-border'
                      }`}
                    >
                      <span className="font-medium text-[color:var(--semantic-base-fg)]">
                        {task.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-sgp-muted">{matrixName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {intent === 'AREA' || intent === 'STEP' ? (
            <div className="space-y-3 rounded-xl border border-sgp-border-subtle bg-sgp-surface-muted p-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-sgp-muted">
                  Tarefa de destino
                </span>
                <select
                  className="sgp-input-app w-full"
                  value={targetOptionId}
                  disabled={busy}
                  onChange={(e) => {
                    const id = e.target.value
                    setTargetOptionId(id)
                    setTargetAreaId('')
                    setStructureTouched(true)
                    const opt = structure.options.find((o) => o.id === id)
                    if (intent === 'AREA' && opt) {
                      setRoots((prev) =>
                        prev.map((r, i) => (i === 0 ? { ...r, titulo: opt.name } : r)),
                      )
                    }
                    if (intent === 'STEP' && opt) {
                      setRoots((prev) =>
                        prev.map((r, i) => (i === 0 ? { ...r, titulo: opt.name } : r)),
                      )
                    }
                  }}
                >
                  <option value="">Selecione…</option>
                  {structure.options.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
                </select>
              </label>
              {intent === 'STEP' ? (
                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-sgp-muted">
                    Setor de destino
                  </span>
                  <select
                    className="sgp-input-app w-full"
                    value={targetAreaId}
                    disabled={busy || !selectedOption}
                    onChange={(e) => {
                      const id = e.target.value
                      setTargetAreaId(id)
                      setStructureTouched(true)
                      const ar = selectedOption?.areas.find((a) => a.id === id)
                      if (ar) {
                        setRoots((prev) =>
                          prev.map((r, i) =>
                            i === 0
                              ? {
                                  ...r,
                                  areas: r.areas.map((area, ai) =>
                                    ai === 0 ? { ...area, titulo: ar.name } : area,
                                  ),
                                }
                              : r,
                          ),
                        )
                      }
                    }}
                  >
                    <option value="">Selecione…</option>
                    {(selectedOption?.areas ?? []).map((ar) => (
                      <option key={ar.id} value={ar.id}>
                        {ar.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {intent === 'STEP' && selectedArea ? (
                <p className="text-[11px] text-sgp-muted">
                  A nova atividade será acrescentada ao final de «{selectedArea.name}».
                </p>
              ) : null}
              {intent === 'AREA' && selectedOption ? (
                <p className="text-[11px] text-sgp-muted">
                  O novo setor será acrescentado ao final de «{selectedOption.name}».
                </p>
              ) : null}
            </div>
          ) : null}

          {showComposicao ? (
            <div className="rounded-xl border border-sgp-border-subtle bg-sgp-surface-muted p-3">
              <NovaEsteiraComposicaoManual
                key={composicaoKey}
                roots={roots}
                onChangeRoots={handleRootsChange}
                alocacoes={aloc}
                onChangeAlocacoes={handleAlocChange}
                colabList={colabList}
                colabLoading={colabLoading}
                colabError={colabError}
                teamList={teamList}
                teamLoading={teamLoading}
                teamError={teamError}
                variant="totem"
                initiallyExpanded
                optionRemoveLabel={optionRemoveLabel}
              />
            </div>
          ) : null}

          {intent === 'MANUAL_TASK' && !structureTouched ? (
            <p data-testid="late-structure-hint" className="text-sm text-sgp-muted">
              {STRUCTURE_HINT}
            </p>
          ) : null}
          {intent != null && structureTouched && structureError ? (
            <SgpInlineBanner message={structureError} variant="neutral" />
          ) : null}
          {error ? <SgpInlineBanner message={error} variant="error" /> : null}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-sgp-border px-4 py-3">
          <button type="button" className="sgp-cta-secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="sgp-cta-primary disabled:opacity-40"
            disabled={!canSubmit}
            onClick={handleConfirm}
          >
            {busy ? 'Incluindo…' : 'Incluir item'}
          </button>
        </footer>
      </div>
    </div>
  )
}
