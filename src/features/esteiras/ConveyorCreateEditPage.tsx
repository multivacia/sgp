import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { SgpInlineBanner } from '../../components/ui/SgpToast'
import type {
  ConveyorDetail,
  ConveyorStructure,
  CreateConveyorDados,
  CreateConveyorStepAssigneeInput,
  PatchConveyorDadosBody,
} from '../../domain/conveyors/conveyor.types'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import type { Team } from '../../domain/teams/team.types'
import type { MatrixNodeApi, MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import { isBlockingSeverity, reportClientError } from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { useRegisterTransientContext } from '../../lib/shell/transient-context'
import {
  createConveyor,
  getConveyorById,
  patchConveyorDados,
  patchConveyorStructure,
} from '../../services/conveyors/conveyorsApiService'
import { createCollaboratorsApiService } from '../../services/collaborators/collaboratorsApiService'
import { listTeams } from '../../services/teams/teamsApiService'
import { getMatrixTree, listMatrixItems } from '../../services/operation-matrix/operationMatrixApiService'
import {
  buildManualConveyorInput,
  manualAssigneeRowsToApi,
  matrixHasRunnableStructure,
  validateManualStepAssignees,
  validateManualStructure,
  type ManualOptionDraft,
  type NovaEsteiraAlocacaoLinha,
} from './nova-esteira/matrixToConveyorCreateInput'
import { NovaEsteiraCatalogoPanel } from './nova-esteira/NovaEsteiraCatalogoPanel'
import { NovaEsteiraCreateTotemShell } from './nova-esteira/NovaEsteiraCreateTotemShell'
import { createInitialManualOption, NovaEsteiraComposicaoManual } from './nova-esteira/NovaEsteiraComposicaoManual'
import {
  draftHasMatrixRoot,
  draftHasTask,
  findTaskNodeInItemTree,
  matrixItemTreeToManualOptions,
  matrixTaskSubtreeToManualOption,
} from './nova-esteira/novaEsteiraDraftFromMatrix'
import {
  countSectorsInRoots,
  countStepsInRoots,
  matrixRootIdsFromManualRoots,
  pendenciasParaResumo,
} from './nova-esteira/novaEsteiraTotemUi'
import { NOVA_ESTEIRA_DRAG_MIME, parseDragPayload } from './nova-esteira/novaEsteiraDnD'
import { useNovaEsteiraResponsaveisOptions } from './nova-esteira/useNovaEsteiraResponsaveisOptions'

type Mode = 'create' | 'edit'
type Aba = 'dados' | 'estrutura' | 'revisao'
type WizardExtras = {
  inicioPrevisto: string
  fimPrevisto: string
  tempoTotalPrevistoMin: number | ''
}

const collaboratorsApi = createCollaboratorsApiService()

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">
      {children}
    </span>
  )
}

function dadosVazio(): CreateConveyorDados {
  return {
    nome: '',
    cliente: '',
    veiculo: '',
    modeloVersao: '',
    placa: '',
    observacoes: '',
    responsavel: '',
    prazoEstimado: '',
    prioridade: 'media',
    colaboradorId: null,
  }
}

function extrasVazio(): WizardExtras {
  return { inicioPrevisto: '', fimPrevisto: '', tempoTotalPrevistoMin: '' }
}

function detailToDados(d: ConveyorDetail): CreateConveyorDados {
  return {
    nome: d.name,
    cliente: d.clientName ?? '',
    veiculo: d.vehicle ?? '',
    modeloVersao: d.modelVersion ?? '',
    placa: d.plate ?? '',
    observacoes: d.initialNotes ?? '',
    responsavel: d.responsible ?? '',
    prazoEstimado: d.estimatedDeadline ?? '',
    prioridade: d.priority,
    colaboradorId: null,
  }
}

function structureToManualRoots(structure: ConveyorStructure): ManualOptionDraft[] {
  return [...structure.options]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((op) => ({
      key: crypto.randomUUID(),
      titulo: op.name,
      areas: [...op.areas]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((ar) => ({
          key: crypto.randomUUID(),
          titulo: ar.name,
          steps: [...ar.steps]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((st) => ({
              key: crypto.randomUUID(),
              titulo: st.name,
              plannedMinutes: Math.max(0, Math.floor(Number(st.plannedMinutes ?? 0))),
            })),
        })),
    }))
}

function serializeRoots(roots: ManualOptionDraft[]): string {
  return JSON.stringify(
    roots.map((o) => ({
      t: o.titulo.trim(),
      a: o.areas.map((ar) => ({
        t: ar.titulo.trim(),
        s: ar.steps.map((st) => ({
          t: st.titulo.trim(),
          m: Math.max(0, Math.floor(st.plannedMinutes)),
        })),
      })),
    })),
  )
}

function parseExtrasFromPersisted(dados: CreateConveyorDados): WizardExtras {
  const prazo = dados.prazoEstimado ?? ''
  const inicio = prazo.match(/Início previsto:\s*([^·]+)/)?.[1]?.trim() ?? ''
  const fim = prazo.match(/Fim previsto:\s*([^·]+)/)?.[1]?.trim() ?? ''
  const obs = dados.observacoes ?? ''
  const tempo = obs.match(/Tempo total previsto:\s*(\d+)\s*min/i)?.[1]
  return {
    inicioPrevisto: inicio,
    fimPrevisto: fim,
    tempoTotalPrevistoMin: tempo ? Number(tempo) : '',
  }
}

function buildDadosParaApi(dados: CreateConveyorDados, extras: WizardExtras): CreateConveyorDados {
  const prazoPartes: string[] = []
  if (extras.inicioPrevisto.trim()) prazoPartes.push(`Início previsto: ${extras.inicioPrevisto.trim()}`)
  if (extras.fimPrevisto.trim()) prazoPartes.push(`Fim previsto: ${extras.fimPrevisto.trim()}`)
  const prazoEstimado = prazoPartes.length > 0 ? prazoPartes.join(' · ') : dados.prazoEstimado

  let observacoes = dados.observacoes ?? ''
  if (typeof extras.tempoTotalPrevistoMin === 'number') {
    const line = `[Planeamento] Tempo total previsto: ${extras.tempoTotalPrevistoMin} min`
    observacoes = observacoes.trim() ? `${observacoes}\n\n${line}` : line
  }
  return { ...dados, prazoEstimado, observacoes }
}

function normalizeDados(d: CreateConveyorDados): CreateConveyorDados {
  return {
    nome: d.nome.trim(),
    cliente: (d.cliente ?? '').trim(),
    veiculo: (d.veiculo ?? '').trim(),
    modeloVersao: (d.modeloVersao ?? '').trim(),
    placa: (d.placa ?? '').trim(),
    observacoes: (d.observacoes ?? '').trim(),
    responsavel: (d.responsavel ?? '').trim(),
    prazoEstimado: (d.prazoEstimado ?? '').trim(),
    prioridade: d.prioridade || 'media',
    colaboradorId: d.colaboradorId ?? null,
  }
}

function buildPatchDados(baseline: CreateConveyorDados, draft: CreateConveyorDados): Record<string, unknown> {
  const a = normalizeDados(baseline)
  const b = normalizeDados(draft)
  const patch: Record<string, unknown> = {}
  if (a.nome !== b.nome) patch.nome = b.nome
  if (a.cliente !== b.cliente) patch.cliente = b.cliente
  if (a.veiculo !== b.veiculo) patch.veiculo = b.veiculo
  if (a.modeloVersao !== b.modeloVersao) patch.modeloVersao = b.modeloVersao
  if (a.placa !== b.placa) patch.placa = b.placa
  if (a.observacoes !== b.observacoes) patch.observacoes = b.observacoes
  if (a.responsavel !== b.responsavel) patch.responsavel = b.responsavel
  if (a.prazoEstimado !== b.prazoEstimado) patch.prazoEstimado = b.prazoEstimado
  if (a.prioridade !== b.prioridade) patch.prioridade = b.prioridade
  if (a.colaboradorId !== b.colaboradorId) patch.colaboradorId = b.colaboradorId
  return patch
}

function sumPlannedMinutes(roots: ManualOptionDraft[]): number {
  return roots.reduce(
    (s, o) => s + o.areas.reduce((a, ar) => a + ar.steps.reduce((t, st) => t + st.plannedMinutes, 0), 0),
    0,
  )
}

export function ConveyorCreateEditPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id } = useParams()
  const { presentBlocking } = useSgpErrorSurface()

  const [loadingEdit, setLoadingEdit] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba>('dados')
  const [catalogDrawerOpenEdit, setCatalogDrawerOpenEdit] = useState(false)
  const [dados, setDados] = useState<CreateConveyorDados>(dadosVazio)
  const [baselineDados, setBaselineDados] = useState<CreateConveyorDados | null>(null)
  const [extras, setExtras] = useState<WizardExtras>(extrasVazio)
  /** Recorte de planeamento inicial (início/fim/tempo) para detetar alterações — `dados` sozinho não reflete `extras`. */
  const [baselineExtras, setBaselineExtras] = useState<WizardExtras>(extrasVazio)
  const [detailId, setDetailId] = useState<string | null>(null)

  const [matrizes, setMatrizes] = useState<MatrixNodeApi[]>([])
  const [matrizesLoading, setMatrizesLoading] = useState(true)
  const [matrizesError, setMatrizesError] = useState<string | null>(null)
  const [treeByMatrixId, setTreeByMatrixId] = useState<Record<string, MatrixNodeTreeApi | undefined>>({})
  const [treesLoading, setTreesLoading] = useState(false)
  const [treesError, setTreesError] = useState<string | null>(null)

  const [colabList, setColabList] = useState<Collaborator[]>([])
  const [colabLoading, setColabLoading] = useState(true)
  const [colabError, setColabError] = useState<string | null>(null)
  const [teamList, setTeamList] = useState<Team[]>([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError] = useState<string | null>(null)

  const [manualRoots, setManualRoots] = useState<ManualOptionDraft[]>([])
  const [manualAloc, setManualAloc] = useState<Record<string, NovaEsteiraAlocacaoLinha[]>>({})
  const [baselineStructureSig, setBaselineStructureSig] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [dupHint, setDupHint] = useState<string | null>(null)
  const [estruturaHint, setEstruturaHint] = useState<string | null>(null)
  const manualRootsRef = useRef(manualRoots)
  manualRootsRef.current = manualRoots

  const responsaveis = useNovaEsteiraResponsaveisOptions({
    mockStoreVersion: 0,
    selectedCollaboratorId: dados.colaboradorId ?? undefined,
    fallbackNameForUnknownId: dados.responsavel,
  })

  const selectResponsavel = useMemo(() => {
    if (responsaveis.status !== 'ready') return ''
    const idLocal = dados.colaboradorId?.trim()
    if (idLocal && responsaveis.options.some((o) => o.value === idLocal)) return idLocal
    const name = dados.responsavel?.trim()
    if (!name) return ''
    return responsaveis.options.find((o) => o.label === name)?.value ?? ''
  }, [responsaveis, dados.colaboradorId, dados.responsavel])

  useEffect(() => {
    if (mode !== 'edit') return
    if (!id?.trim()) {
      setLoadError('Esteira inválida.')
      setLoadingEdit(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingEdit(true)
      setLoadError(null)
      try {
        const detail = await getConveyorById(id.trim())
        if (cancelled) return
        const dd = detailToDados(detail)
        const ex0 = parseExtrasFromPersisted(dd)
        setDados(dd)
        setBaselineDados(dd)
        setExtras(ex0)
        setBaselineExtras(ex0)
        setDetailId(detail.id)
        const roots = structureToManualRoots(detail.structure)
        setManualRoots(roots)
        setBaselineStructureSig(serializeRoots(roots))
      } catch (e) {
        const n = reportClientError(e, {
          module: 'esteiras',
          action: 'nova_esteira_edit_load',
          route: pathname,
          entityId: id,
        })
        if (isBlockingSeverity(n.severity)) presentBlocking(n)
        else setLoadError(n.userMessage)
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, mode, pathname, presentBlocking])

  useRegisterTransientContext({
    id: mode === 'create' ? 'nova-esteira-wizard' : 'alterar-esteira-wizard',
    isDirty: () =>
      dados.nome.trim().length > 0 ||
      manualRoots.length > 0 ||
      extras.inicioPrevisto.length > 0 ||
      extras.fimPrevisto.length > 0 ||
      extras.tempoTotalPrevistoMin !== '',
    onReset: () => {
      if (mode === 'edit') setAba('dados')
      setSubmitError(null)
    },
  })

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
          const n = reportClientError(e, { module: 'esteiras', action: 'nova_esteira_load_matrizes', route: pathname })
          if (isBlockingSeverity(n.severity)) presentBlocking(n)
          else setMatrizesError(n.userMessage)
        }
      } finally {
        if (!cancelled) setMatrizesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname, presentBlocking])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setTeamLoading(true)
      setTeamError(null)
      try {
        const rows = await listTeams({ isActive: 'true', limit: 200, offset: 0 })
        if (!cancelled) setTeamList(rows.items)
      } catch (e) {
        if (!cancelled) {
          const n = reportClientError(e, { module: 'esteiras', action: 'nova_esteira_load_times', route: pathname })
          if (isBlockingSeverity(n.severity)) presentBlocking(n)
          else setTeamError(n.userMessage)
        }
      } finally {
        if (!cancelled) setTeamLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname, presentBlocking])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setColabLoading(true)
      setColabError(null)
      try {
        const rows = await collaboratorsApi.listCollaborators({ status: 'active' })
        if (!cancelled) setColabList(rows)
      } catch (e) {
        if (!cancelled) {
          const n = reportClientError(e, { module: 'esteiras', action: 'nova_esteira_load_colaboradores', route: pathname })
          if (isBlockingSeverity(n.severity)) presentBlocking(n)
          else setColabError(n.userMessage)
        }
      } finally {
        if (!cancelled) setColabLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname, presentBlocking])

  useEffect(() => {
    if (matrizes.length === 0) return
    if (mode !== 'create' && aba !== 'estrutura') return
    let cancelled = false
    ;(async () => {
      setTreesLoading(true)
      setTreesError(null)
      try {
        const pairs = await Promise.all(matrizes.map(async (m) => [m.id, await getMatrixTree(m.id)] as const))
        if (!cancelled) setTreeByMatrixId(Object.fromEntries(pairs))
      } catch (e) {
        if (!cancelled) {
          const n = reportClientError(e, { module: 'esteiras', action: 'nova_esteira_prefetch_matrix_trees', route: pathname })
          if (isBlockingSeverity(n.severity)) presentBlocking(n)
          else setTreesError(n.userMessage)
        }
      } finally {
        if (!cancelled) setTreesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [aba, matrizes, mode, pathname, presentBlocking])

  const removeDraftOptionKey = useCallback((optionKey: string) => {
    setManualRoots((prev) => {
      const removed = prev.find((o) => o.key === optionKey)
      if (removed) {
        setManualAloc((a) => {
          const n = { ...a }
          for (const ar of removed.areas) for (const st of ar.steps) delete n[st.key]
          return n
        })
      }
      return prev.filter((o) => o.key !== optionKey)
    })
  }, [])

  const handleDropOnRascunho = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setEstruturaHint(null)
      setDupHint(null)
      const payload = parseDragPayload(e.dataTransfer.getData(NOVA_ESTEIRA_DRAG_MIME))
      if (!payload || payload.t === 'draft-option') return
      const prev = manualRootsRef.current
      if (payload.t === 'matrix') {
        const tree = treeByMatrixId[payload.matrixId]
        if (!tree) return setEstruturaHint('Matriz ainda não carregada.')
        if (!matrixHasRunnableStructure(tree)) return setEstruturaHint('Matriz sem estrutura utilizável.')
        if (draftHasMatrixRoot(prev, payload.matrixId)) return setDupHint('Matriz já adicionada. Soltura ignorada.')
        const options = matrixItemTreeToManualOptions(tree, payload.matrixId)
        if (options.length === 0) return setEstruturaHint('Matriz sem tarefas materializáveis.')
        return setManualRoots([...prev, ...options])
      }
      const tree = treeByMatrixId[payload.matrixItemId]
      if (!tree) return setEstruturaHint('Árvore da matriz não disponível.')
      if (draftHasTask(prev, payload.taskId)) return setDupHint('Tarefa já adicionada. Soltura ignorada.')
      const taskNode = findTaskNodeInItemTree(tree, payload.taskId)
      if (!taskNode) return setEstruturaHint('Tarefa não encontrada na árvore.')
      const option = matrixTaskSubtreeToManualOption(taskNode, `t:${taskNode.id}`)
      if (!option) return setEstruturaHint('Tarefa sem setores/etapas utilizáveis.')
      setManualRoots([...prev, option])
    },
    [treeByMatrixId],
  )

  const useMatrixAsBase = useCallback(
    (matrixId: string) => {
      setDupHint(null)
      setEstruturaHint(null)
      const tree = treeByMatrixId[matrixId]
      if (!tree) return setEstruturaHint('Matriz ainda não carregada.')
      if (!matrixHasRunnableStructure(tree)) return setEstruturaHint('Matriz sem estrutura utilizável.')
      setManualRoots((prev) => {
        if (draftHasMatrixRoot(prev, matrixId)) {
          setDupHint('Esta matriz já está na esteira.')
          return prev
        }
        const options = matrixItemTreeToManualOptions(tree, matrixId)
        if (options.length === 0) return prev
        return [...prev, ...options]
      })
    },
    [treeByMatrixId],
  )

  const swapMatrixBase = useCallback(
    (matrixId: string) => {
      setDupHint(null)
      setEstruturaHint(null)
      const tree = treeByMatrixId[matrixId]
      if (!tree) return setEstruturaHint('Matriz ainda não carregada.')
      if (!matrixHasRunnableStructure(tree)) return setEstruturaHint('Matriz sem estrutura utilizável.')
      const options = matrixItemTreeToManualOptions(tree, matrixId)
      if (options.length === 0) return setEstruturaHint('Matriz sem tarefas materializáveis.')
      const prev = manualRootsRef.current
      const removed = prev.filter((r) => r.catalogSourceKey?.startsWith('mroot:'))
      const keep = prev.filter((r) => !r.catalogSourceKey?.startsWith('mroot:'))
      setManualAloc((a) => {
        const next = { ...a }
        for (const o of removed) {
          for (const ar of o.areas) {
            for (const st of ar.steps) delete next[st.key]
          }
        }
        return next
      })
      setManualRoots([...keep, ...options])
    },
    [treeByMatrixId],
  )

  const addManualTask = useCallback(() => {
    setManualRoots((prev) => [...prev, createInitialManualOption(prev.length + 1)])
  }, [])

  const podeAvancarDados = dados.nome.trim().length > 0
  const estruturaOk = validateManualStructure(manualRoots) === null && validateManualStepAssignees(manualRoots, manualAloc) === null && manualRoots.length > 0
  const minutosCalculados = sumPlannedMinutes(manualRoots)
  const nTarefas = manualRoots.length
  const nSetores = countSectorsInRoots(manualRoots)
  const nEtapas = countStepsInRoots(manualRoots)
  const matrixLabel = useMemo(() => {
    const ids = matrixRootIdsFromManualRoots(manualRoots)
    if (ids.length === 0) return '—'
    if (ids.length > 1) return 'Várias bases'
    const m = matrizes.find((x) => x.id === ids[0])
    return m?.name?.trim() || 'Matriz'
  }, [manualRoots, matrizes])
  const pendenciasCount = useMemo(() => {
    let n = 0
    if (!dados.nome.trim()) n += 1
    if (!estruturaOk) n += 1
    return n
  }, [dados.nome, estruturaOk])
  const dirtyDadosPatch = useMemo(() => {
    if (!baselineDados) return {}
    return buildPatchDados(
      buildDadosParaApi(baselineDados, baselineExtras),
      buildDadosParaApi(dados, extras),
    )
  }, [baselineDados, baselineExtras, dados, extras])
  const hasDadosChanges = Object.keys(dirtyDadosPatch).length > 0
  const hasStructureChanges = mode === 'edit' ? serializeRoots(manualRoots) !== baselineStructureSig : true
  const pendenciasRevisao = useMemo(() => {
    const basePendencias = pendenciasParaResumo(dados.nome, manualRoots, manualAloc)
    if (!hasDadosChanges && !hasStructureChanges) {
      return [...basePendencias, 'Nenhuma alteração para salvar.']
    }
    return basePendencias
  }, [dados.nome, manualRoots, manualAloc, hasDadosChanges, hasStructureChanges])
  const canSaveChanges = estruturaOk && (hasDadosChanges || hasStructureChanges)

  async function handleSubmit() {
    const s = validateManualStructure(manualRoots)
    const a = validateManualStepAssignees(manualRoots, manualAloc)
    if (s || a) return setSubmitError(s ?? a ?? null)
    const assignMap: Record<string, CreateConveyorStepAssigneeInput[]> = {}
    for (const op of manualRoots) for (const ar of op.areas) for (const st of ar.steps) {
      const rows = manualAloc[st.key] ?? []
      if (rows.length > 0) assignMap[st.key] = manualAssigneeRowsToApi(rows)
    }
    setSubmitError(null)
    setSubmitting(true)
    try {
      const dadosApi = buildDadosParaApi(dados, extras)
      if (mode === 'create') {
        const created = await createConveyor(buildManualConveyorInput(dadosApi, manualRoots, assignMap))
        navigate(`/app/esteiras/${encodeURIComponent(created.id)}`, {
          replace: true,
          state: { sgpToast: 'Esteira criada com sucesso.', fromNovaEsteira: true },
        })
        return
      }
      if (!detailId) throw new Error('ID da esteira ausente para atualização.')
      if (hasDadosChanges) {
        await patchConveyorDados(detailId, dirtyDadosPatch as PatchConveyorDadosBody)
      }
      if (hasStructureChanges) {
        const body = buildManualConveyorInput(dadosApi, manualRoots, assignMap)
        await patchConveyorStructure(detailId, {
          originType: body.originType,
          baseId: body.baseId ?? null,
          baseCode: body.baseCode ?? null,
          baseName: body.baseName ?? null,
          baseVersion: body.baseVersion ?? null,
          matrixRootItemId: body.matrixRootItemId ?? null,
          options: body.options,
        })
      }
      navigate(`/app/esteiras/${encodeURIComponent(detailId)}`, {
        replace: true,
        state: { sgpToast: 'Esteira atualizada com sucesso.', fromNovaEsteira: false },
      })
    } catch (e) {
      const n = reportClientError(e, {
        module: 'esteiras',
        action: mode === 'create' ? 'nova_esteira_create_manual' : 'alterar_esteira_submit',
        route: pathname,
        entityId: detailId ?? undefined,
      })
      if (isBlockingSeverity(n.severity)) presentBlocking(n)
      else setSubmitError(n.userMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingEdit) {
    return (
      <PageCanvas>
        <p className="text-sm text-slate-500">Carregando esteira para edição…</p>
      </PageCanvas>
    )
  }
  if (loadError) {
    return (
      <PageCanvas>
        <SgpInlineBanner variant="error" message={loadError} />
      </PageCanvas>
    )
  }

  if (mode === 'create') {
    return (
      <PageCanvas>
        <NovaEsteiraCreateTotemShell
          dados={dados}
          setDados={setDados}
          extras={extras}
          setExtras={setExtras}
          manualRoots={manualRoots}
          setManualRoots={setManualRoots}
          manualAloc={manualAloc}
          setManualAloc={setManualAloc}
          matrizes={matrizes}
          matrizesLoading={matrizesLoading}
          matrizesError={matrizesError}
          treeByMatrixId={treeByMatrixId}
          treesLoading={treesLoading}
          treesError={treesError}
          colabList={colabList}
          colabLoading={colabLoading}
          colabError={colabError}
          teamList={teamList}
          teamLoading={teamLoading}
          teamError={teamError}
          removeDraftOptionKey={removeDraftOptionKey}
          handleDropOnRascunho={handleDropOnRascunho}
          onUseMatrixAsBase={useMatrixAsBase}
          onSwapMatrixBase={swapMatrixBase}
          onAddManualTask={addManualTask}
          submitError={submitError}
          dupHint={dupHint}
          estruturaHint={estruturaHint}
          handleSubmit={handleSubmit}
          submitting={submitting}
          estruturaOk={estruturaOk}
          minutosCalculados={minutosCalculados}
          responsaveis={responsaveis}
          selectResponsavel={selectResponsavel}
        />
      </PageCanvas>
    )
  }

  const title = 'Alterar Esteira'
  const lead = 'Mesmo fluxo da criação, com carregamento prévio da esteira existente para edição.'
  const finalCta = 'Salvar alterações'

  return (
    <PageCanvas>
      <div className="mx-auto max-w-[1600px] pb-12">
      <header className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-sgp-void via-sgp-navy-deep/80 to-sgp-void px-4 py-4 shadow-inner ring-1 ring-white/[0.04] sm:px-5">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" aria-hidden />
          Esteiras
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="sgp-page-title">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">{lead}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link to="/app/backlog" className="sgp-cta-secondary inline-flex justify-center text-center text-sm">
              Cancelar
            </Link>
            <button
              type="button"
              className="sgp-cta-primary text-sm disabled:pointer-events-none disabled:opacity-45"
              disabled={submitting || !canSaveChanges}
              onClick={() => void handleSubmit()}
            >
              {submitting ? 'A salvar…' : finalCta}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1 sm:gap-1.5">
          {(['dados', 'estrutura', 'revisao'] as const).map((t) => (
            <div key={t} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={() => setAba(t)}
                className={`flex min-w-0 flex-1 basis-[30%] items-center justify-center rounded-lg border px-2 py-2 text-center text-[11px] font-semibold leading-tight transition sm:px-3 sm:text-xs ${
                  aba === t
                    ? 'border-sgp-gold/45 bg-sgp-gold/[0.12] text-sgp-gold-warm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-sgp-gold/20'
                    : 'border-white/[0.06] bg-black/25 text-slate-500'
                }`}
                aria-current={aba === t ? 'step' : undefined}
              >
                {t === 'dados' ? 'Dados básicos' : t === 'estrutura' ? 'Estrutura' : 'Revisão'}
              </button>
              {t !== 'revisao' ? (
                <span className="shrink-0 text-[10px] text-slate-600 select-none" aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip>
            Base: <span className="text-slate-100">{matrixLabel}</span>
          </Chip>
          <Chip>
            Tarefas: <span className="text-slate-100">{nTarefas}</span>
          </Chip>
          <Chip>
            Setores: <span className="text-slate-100">{nSetores}</span>
          </Chip>
          <Chip>
            Etapas: <span className="text-slate-100">{nEtapas}</span>
          </Chip>
          <Chip>
            Min: <span className="text-slate-100">{minutosCalculados}</span>
          </Chip>
          <Chip>
            Pendências:{' '}
            <span className={pendenciasCount ? 'text-amber-200' : 'text-emerald-200'}>{pendenciasCount}</span>
          </Chip>
        </div>
      </header>

      {submitError && <SgpInlineBanner variant="error" message={submitError} className="mt-4" />}
      {dupHint && <SgpInlineBanner variant="neutral" message={dupHint} className="mt-3" />}
      {estruturaHint && <SgpInlineBanner variant="neutral" message={estruturaHint} className="mt-3" />}

      <div className="mt-8 max-w-6xl space-y-8">
        {aba === 'dados' && (
          <section className="space-y-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h2 className="font-heading text-lg text-slate-100">Dados básicos</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2 block text-sm">
                <span className="text-slate-400">Nome *</span>
                <input className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100" value={dados.nome} onChange={(ev) => setDados((d) => ({ ...d, nome: ev.target.value }))} autoComplete="off" />
              </label>
              <label className="block text-sm"><span className="text-slate-400">Cliente</span><input className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100" value={dados.cliente ?? ''} onChange={(ev) => setDados((d) => ({ ...d, cliente: ev.target.value }))} /></label>
              <label className="block text-sm"><span className="text-slate-400">Veículo</span><input className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100" value={dados.veiculo ?? ''} onChange={(ev) => setDados((d) => ({ ...d, veiculo: ev.target.value }))} /></label>
              <label className="block text-sm"><span className="text-slate-400">Início previsto</span><input type="datetime-local" className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100" value={extras.inicioPrevisto} onChange={(ev) => setExtras((x) => ({ ...x, inicioPrevisto: ev.target.value }))} /></label>
              <label className="block text-sm"><span className="text-slate-400">Fim previsto</span><input type="datetime-local" className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100" value={extras.fimPrevisto} onChange={(ev) => setExtras((x) => ({ ...x, fimPrevisto: ev.target.value }))} /></label>
              <label className="block text-sm md:col-span-2">
                <span className="text-slate-400">Responsável</span>
                <select className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100" value={selectResponsavel} disabled={responsaveis.status !== 'ready'} onChange={(ev) => {
                  const idSel = ev.target.value
                  if (!idSel) return setDados((d) => ({ ...d, responsavel: '', colaboradorId: null }))
                  const opt = responsaveis.status === 'ready' ? responsaveis.options.find((o) => o.value === idSel) : null
                  setDados((d) => ({ ...d, colaboradorId: idSel, responsavel: opt?.label ?? '' }))
                }}>
                  <option value="">{responsaveis.status === 'loading' ? 'Carregando…' : 'Selecione'}</option>
                  {responsaveis.status === 'ready' && responsaveis.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="block text-sm"><span className="text-slate-400">Prioridade</span><select className="sgp-input-app mt-1 w-full px-3 py-2 text-slate-100" value={dados.prioridade || 'media'} onChange={(ev) => setDados((d) => ({ ...d, prioridade: ev.target.value as CreateConveyorDados['prioridade'] }))}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
              <label className="block text-sm"><span className="text-slate-400">Tempo total previsto (minutos)</span><input type="number" min={0} className="sgp-input-app mt-1 w-full px-3 py-2 tabular-nums text-slate-100" value={extras.tempoTotalPrevistoMin} onChange={(ev) => setExtras((x) => ({ ...x, tempoTotalPrevistoMin: ev.target.value === '' ? '' : Number(ev.target.value) }))} /></label>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" disabled={!podeAvancarDados} onClick={() => setAba('estrutura')} className="sgp-cta-primary disabled:opacity-40">Continuar para estrutura</button>
            </div>
          </section>
        )}

        {aba === 'estrutura' && (
          <section className="space-y-4">
            <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] xl:items-start xl:gap-4">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-left text-sm font-semibold text-slate-200 xl:hidden"
                onClick={() => setCatalogDrawerOpenEdit((o) => !o)}
              >
                Bases e extras
                <span className="text-sgp-gold">{catalogDrawerOpenEdit ? '▲' : '▼'}</span>
              </button>

              <aside
                className={`min-h-0 space-y-3 xl:block ${catalogDrawerOpenEdit ? 'block' : 'hidden'} xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto`}
              >
                <NovaEsteiraCatalogoPanel
                  totemLayout
                  matrices={matrizes}
                  matricesLoading={matrizesLoading}
                  matricesError={matrizesError}
                  treeByMatrixId={treeByMatrixId}
                  treesLoading={treesLoading}
                  treesError={treesError}
                  onRemoveDraftOption={removeDraftOptionKey}
                  onUseMatrixAsBase={useMatrixAsBase}
                  onSwapMatrixBase={swapMatrixBase}
                  onAddManualTask={addManualTask}
                  manualRoots={manualRoots}
                />
              </aside>

              <main
                className="min-h-[320px] min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto"
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(NOVA_ESTEIRA_DRAG_MIME)) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'copy'
                }}
                onDrop={handleDropOnRascunho}
              >
                <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-white">Sua esteira em montagem</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Use «Bases e extras» à esquerda ou arraste para aqui. Soltar na coluna da esquerda{' '}
                      <span className="text-slate-400">remove da esteira</span>.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <NovaEsteiraComposicaoManual
                    roots={manualRoots}
                    onChangeRoots={setManualRoots}
                    alocacoes={manualAloc}
                    onChangeAlocacoes={setManualAloc}
                    colabList={colabList}
                    colabLoading={colabLoading}
                    colabError={colabError}
                    teamList={teamList}
                    teamLoading={teamLoading}
                    teamError={teamError}
                    variant="totem"
                  />
                </div>
              </main>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="sgp-cta-secondary" onClick={() => setAba('dados')}>Voltar</button>
              <button type="button" disabled={!estruturaOk} onClick={() => setAba('revisao')} className="sgp-cta-primary disabled:opacity-40">Continuar para revisão</button>
            </div>
          </section>
        )}

        {aba === 'revisao' && (
          <section>
            <div className="max-w-md space-y-4 rounded-2xl border border-sgp-gold/25 bg-gradient-to-b from-sgp-gold/[0.07] to-black/20 p-4 shadow-inner ring-1 ring-white/[0.05]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sgp-gold/90">Resumo</p>
                <p className="mt-1 font-heading text-base font-semibold text-white">Antes de criar</p>
              </div>
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Base</dt>
                  <dd className="max-w-[11rem] truncate text-right font-medium text-slate-100" title={matrixLabel}>
                    {matrixLabel}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Tarefas</dt>
                  <dd className="tabular-nums text-slate-100">{nTarefas}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Setores</dt>
                  <dd className="tabular-nums text-slate-100">{nSetores}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Etapas</dt>
                  <dd className="tabular-nums text-slate-100">{nEtapas}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Minutos (estrutura)</dt>
                  <dd className="tabular-nums text-slate-100">{minutosCalculados} min</dd>
                </div>
              </dl>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">Pendências</p>
                {pendenciasRevisao.length === 0 ? (
                  <p className="mt-1 text-xs text-emerald-200/90">Nada a corrigir para criar.</p>
                ) : (
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-100/95">
                    {pendenciasRevisao.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="sgp-cta-secondary grow"
                  disabled={submitting}
                  onClick={() => setAba('estrutura')}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  className="sgp-cta-primary grow disabled:pointer-events-none disabled:opacity-45"
                  disabled={submitting || !canSaveChanges}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? 'A salvar…' : finalCta}
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-500">Validação igual à do assistente anterior.</p>
            </div>
          </section>
        )}
      </div>
      </div>
    </PageCanvas>
  )
}
