import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SgpInlineBanner } from '../../../components/ui/SgpToast'
import type { CreateConveyorDados, CreateConveyorStepAssigneeInput } from '../../../domain/conveyors/conveyor.types'
import type { MatrixNodeApi, MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { formatUserError, isBlockingSeverity, reportClientError } from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import { createConveyor } from '../../../services/conveyors/conveyorsApiService'
import { getMatrixTree, listMatrixItems } from '../../../services/operation-matrix/operationMatrixApiService'
import { buildDadosParaApi, type WizardExtras } from '../conveyorBasicDataExtras'
import {
  buildManualConveyorInput,
  manualAssigneeRowsToApi,
  validateManualStepAssignees,
  validateManualStructure,
} from '../nova-esteira/matrixToConveyorCreateInput'
import { ConfigureMatrixModal } from './ConfigureMatrixModal'
import { EditBasicDataModal } from './EditBasicDataModal'
import { LaboratorioShell } from './LaboratorioShell'
import { LaboratorySummaryBar } from './LaboratorySummaryBar'
import { MatrixCatalog } from './MatrixCatalog'
import { MountedStructureReview } from './MountedStructureReview'
import type { AppliedMatrixBlock, LabBasicDataDraft, LabPhase } from './laboratorioEsteiras.types'
import {
  buildAppliedMatrixBlock,
  mergeBlocksToAllocations,
  mergeBlocksToManualRoots,
  summarizeAppliedBlocks,
} from './laboratorioEsteirasState'

function emptyBasicData(): LabBasicDataDraft {
  return { cliente: '', descricao: '', quantidade: '', prazo: '' }
}

function basicDataToDados(data: LabBasicDataDraft): CreateConveyorDados {
  const obsParts: string[] = []
  if (data.quantidade.trim()) obsParts.push(`Quantidade: ${data.quantidade.trim()}`)
  return {
    nome: data.descricao.trim() || 'Nova esteira',
    cliente: data.cliente.trim(),
    veiculo: '',
    modeloVersao: '',
    placa: '',
    observacoes: obsParts.join('\n'),
    responsavel: '',
    prazoEstimado: data.prazo.trim(),
    prioridade: 'media',
    colaboradorId: null,
  }
}

export function LaboratorioEsteirasPage() {
  const navigate = useNavigate()
  const { presentBlocking } = useSgpErrorSurface()

  const [phase, setPhase] = useState<LabPhase>('catalog')
  const [search, setSearch] = useState('')
  const [matrizes, setMatrizes] = useState<MatrixNodeApi[]>([])
  const [matrizesLoading, setMatrizesLoading] = useState(true)
  const [matrizesError, setMatrizesError] = useState<string | null>(null)
  const [treeByMatrixId, setTreeByMatrixId] = useState<Record<string, MatrixNodeTreeApi | undefined>>({})
  const [treesLoading, setTreesLoading] = useState(false)

  const [appliedBlocks, setAppliedBlocks] = useState<AppliedMatrixBlock[]>([])
  const [basicData, setBasicData] = useState<LabBasicDataDraft>(emptyBasicData)
  const [basicDataOpen, setBasicDataOpen] = useState(false)

  const [configMatrixId, setConfigMatrixId] = useState<string | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const summary = useMemo(() => summarizeAppliedBlocks(appliedBlocks), [appliedBlocks])

  const configuringMatrix = configMatrixId
    ? matrizes.find((m) => m.id === configMatrixId) ?? null
    : null
  const editingBlock = editingBlockId
    ? appliedBlocks.find((b) => b.blockId === editingBlockId) ?? null
    : null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setMatrizesLoading(true)
      setMatrizesError(null)
      try {
        const rows = await listMatrixItems({ isActive: true })
        if (!cancelled) setMatrizes(rows)
      } catch (e) {
        if (!cancelled) {
          const n = reportClientError(e, {
            module: 'esteiras',
            action: 'laboratorio_load_matrizes',
            route: '/app/gestao/esteiras/laboratorio',
          })
          if (isBlockingSeverity(n.severity)) presentBlocking(n)
          else setMatrizesError(formatUserError(n))
        }
      } finally {
        if (!cancelled) setMatrizesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [presentBlocking])

  useEffect(() => {
    if (matrizes.length === 0) return
    let cancelled = false
    ;(async () => {
      setTreesLoading(true)
      try {
        const pairs = await Promise.all(
          matrizes.map(async (m) => [m.id, await getMatrixTree(m.id)] as const),
        )
        if (!cancelled) setTreeByMatrixId(Object.fromEntries(pairs))
      } catch (e) {
        if (!cancelled) {
          const n = reportClientError(e, {
            module: 'esteiras',
            action: 'laboratorio_prefetch_trees',
            route: '/app/gestao/esteiras/laboratorio',
          })
          if (isBlockingSeverity(n.severity)) presentBlocking(n)
        }
      } finally {
        if (!cancelled) setTreesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [matrizes, presentBlocking])

  const openConfigure = useCallback((matrixId: string, blockId?: string) => {
    setConfigMatrixId(matrixId)
    setEditingBlockId(blockId ?? null)
  }, [])

  const closeConfigure = useCallback(() => {
    setConfigMatrixId(null)
    setEditingBlockId(null)
  }, [])

  const handleApplyMatrix = useCallback(
    (block: AppliedMatrixBlock) => {
      if (editingBlockId) {
        setAppliedBlocks((prev) =>
          prev.map((b) => (b.blockId === editingBlockId ? { ...block, blockId: editingBlockId } : b)),
        )
      } else {
        setAppliedBlocks((prev) => [...prev, block])
      }
      closeConfigure()
      setPhase('review')
    },
    [closeConfigure, editingBlockId],
  )

  const handleSave = useCallback(async () => {
    const roots = mergeBlocksToManualRoots(appliedBlocks)
    const aloc = mergeBlocksToAllocations(appliedBlocks)
    const structErr = validateManualStructure(roots)
    const alocErr = validateManualStepAssignees(roots, aloc)
    if (structErr || alocErr) {
      setSubmitError(structErr ?? alocErr)
      return
    }
    if (!basicData.descricao.trim()) {
      setSubmitError('Informe a descrição da esteira em dados básicos.')
      setBasicDataOpen(true)
      return
    }

    const assignMap: Record<string, CreateConveyorStepAssigneeInput[]> = {}
    for (const op of roots) {
      for (const ar of op.areas) {
        for (const st of ar.steps) {
          const rows = aloc[st.key] ?? []
          if (rows.length > 0) assignMap[st.key] = manualAssigneeRowsToApi(rows)
        }
      }
    }

    const extras: WizardExtras = { inicioPrevisto: '', fimPrevisto: '' }
    const dadosApi = buildDadosParaApi(basicDataToDados(basicData), extras)

    setSubmitError(null)
    setSubmitting(true)
    try {
      const created = await createConveyor(buildManualConveyorInput(dadosApi, roots, assignMap))
      navigate(`/app/esteiras/${encodeURIComponent(created.id)}`, {
        replace: true,
        state: { sgpToast: 'Esteira criada com sucesso.', fromNovaEsteira: true },
      })
    } catch (e) {
      const n = reportClientError(e, {
        module: 'esteiras',
        action: 'laboratorio_create_conveyor',
        route: '/app/gestao/esteiras/laboratorio',
      })
      if (isBlockingSeverity(n.severity)) presentBlocking(n)
      else setSubmitError(formatUserError(n))
    } finally {
      setSubmitting(false)
    }
  }, [appliedBlocks, basicData, navigate, presentBlocking])

  const footer = (
    <>
      {summary.matrixCount > 0 ? (
        <LaboratorySummaryBar
          matrixCount={summary.matrixCount}
          activityCount={summary.activityCount}
          totalMinutes={summary.totalMinutes}
        />
      ) : null}
      {phase === 'review' ? (
        <>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting || appliedBlocks.length === 0}
            className="sgp-cta-primary flex min-h-14 w-full items-center justify-center gap-2 text-base disabled:opacity-45"
          >
            {submitting ? 'Salvando…' : 'Salvar esteira'}
          </button>
          <button
            type="button"
            onClick={() => setPhase('catalog')}
            className="w-full py-2 text-sm font-semibold text-slate-400 hover:text-slate-200"
          >
            ← Voltar
          </button>
        </>
      ) : appliedBlocks.length > 0 ? (
        <button
          type="button"
          onClick={() => setPhase('review')}
          className="sgp-cta-primary min-h-12 w-full text-sm"
        >
          Revisar esteira ({summary.matrixCount})
        </button>
      ) : null}
      <Link
        to="/app/nova-esteira"
        className="block w-full py-2 text-center text-sm text-slate-500 hover:text-slate-300"
      >
        Criação clássica de esteira
      </Link>
    </>
  )

  return (
    <>
      <LaboratorioShell
        eyebrow="SGP • LABORATÓRIO DE ESTEIRAS"
        title={phase === 'catalog' ? 'Escolha as matrizes' : 'Revise sua esteira'}
        subtitle={
          phase === 'catalog'
            ? 'Monte a estrutura usando modelos prontos'
            : 'Ajuste os blocos montados antes de salvar'
        }
        footer={footer}
      >
        {submitError ? (
          <div className="mb-4">
            <SgpInlineBanner variant="error" message={submitError} />
          </div>
        ) : null}

        {phase === 'catalog' ? (
          <MatrixCatalog
            matrices={matrizes}
            treeByMatrixId={treeByMatrixId}
            loading={matrizesLoading || treesLoading}
            error={matrizesError}
            search={search}
            onSearchChange={setSearch}
            onSelectMatrix={(id) => openConfigure(id)}
          />
        ) : (
          <MountedStructureReview
            blocks={appliedBlocks}
            basicData={basicData}
            onEditBasicData={() => setBasicDataOpen(true)}
            onEditBlock={(blockId) => {
              const block = appliedBlocks.find((b) => b.blockId === blockId)
              if (block) openConfigure(block.matrixId, blockId)
            }}
            onRemoveBlock={(blockId) => {
              setAppliedBlocks((prev) => prev.filter((b) => b.blockId !== blockId))
            }}
            onAddMatrix={() => setPhase('catalog')}
          />
        )}
      </LaboratorioShell>

      {configuringMatrix ? (
        <ConfigureMatrixModal
          key={`${configuringMatrix.id}-${editingBlockId ?? 'new'}`}
          open
          matrixId={configuringMatrix.id}
          matrixName={configuringMatrix.name}
          tree={treeByMatrixId[configuringMatrix.id]}
          initialSelectedIds={editingBlock?.selectedActivityIds}
          editingBlockId={editingBlockId}
          onClose={closeConfigure}
          onApply={handleApplyMatrix}
        />
      ) : null}

      <EditBasicDataModal
        open={basicDataOpen}
        data={basicData}
        onChange={(patch) => setBasicData((prev) => ({ ...prev, ...patch }))}
        onClose={() => setBasicDataOpen(false)}
        onSave={() => setBasicDataOpen(false)}
      />
    </>
  )
}
