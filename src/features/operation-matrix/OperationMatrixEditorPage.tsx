import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMatrixSuggestionCatalog } from '../../catalog/matrixSuggestion/matrixSuggestionCatalogCache'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { SgpToast, type SgpToastVariant } from '../../components/ui/SgpToast'
import type {
  MatrixDuplicationWarning,
  MatrixNodeTreeApi,
  MatrixNodeType,
} from '../../domain/operation-matrix/operation-matrix.types'
import { MatrixDuplicationWarningsBanner } from './MatrixDuplicationWarningsBanner'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { useRegisterTransientContext } from '../../lib/shell/transient-context'
import {
  createMatrixNode,
  deleteMatrixNode,
  duplicateMatrixNode,
  getMatrixTree,
  isApiNotFound,
  listMatrixItems,
  patchMatrixNode,
  restoreMatrixNode,
} from '../../services/operation-matrix/operationMatrixApiService'
import { getCollaboratorsService } from '../../services/collaborators/collaboratorsServiceFactory'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import type { Team, TeamMember } from '../../domain/teams/team.types'
import { useShellFunction } from '../../lib/shell/shell-function-context'
import { listTeamMembers, listTeams } from '../../services/teams/teamsApiService'
import { MatrixSelectionContextBar } from './MatrixSelectionContextBar'
import { AlterarMatrizEstruturaDraftPanel } from './AlterarMatrizEstruturaDraftPanel'
import { revisaoAlterarMatrizPendencias } from './operationMatrixEditorRevision'
import {
  computeOrderPatches,
  orderTreeMatchesBaseline,
  reorderItemChildTasksToOrder,
  reorderSiblingStep,
  reorderSiblingsRelativeToOver,
  snapshotOrderMap,
} from './matrixStructureReorder'
import { OperationMatrixEditorWorkbench } from './OperationMatrixEditorWorkbench'
import { OperationMatrixMetricsStrip } from './OperationMatrixMetricsStrip'
import {
  buildMatrixTreeAggregateMaps,
  getBranchStats,
  isEligibleActiveTeamMember,
  matrixActivityPrimaryTeamId,
  type MatrixTreeAggregateMaps,
} from './matrixTreeAggregates'
import { buildBreadcrumbSegments } from './matrixTreeBreadcrumb'
import {
  buildNodeTypeMap,
  buildParentIdMap,
  findAncestorTaskId,
  getActiveBranchIdSet,
} from './matrixTreeSelection'
import { collectMatchingNodeIds } from './matrixTreeFilters'
import { matrixUxAddChildCta, matrixUxNodeLabel } from './matrixServiceUx'
import {
  buildOperationMatrixPreviewSnapshot,
  generatePreviewDraftToken,
  writePreviewSnapshotToSession,
} from './operationMatrixPreviewSnapshot'
import { cloneTaskSubtreeUnderItem } from './criar-matriz/cloneMatrixTaskSubtree'
import {
  extractCatalogTasksFromItemTree,
  type MatrixCatalogTaskEntry,
} from './criar-matriz/extractMatrixTasksForCatalog'
import { matrixCatalogEntryOverlapsCurrentMatrix } from './criar-matriz/matrixCatalogEntryOverlapsMatrix'
import { NovaMatrizEstruturaCatalogPanel } from './criar-matriz/NovaMatrizEstruturaCatalogPanel'
import { clampInsertIndex } from './criar-matriz/novaMatrizCatalogDropInsert'

type ToastState = { message: string; variant: SgpToastVariant } | null

function sortReuseCatalogEntries(
  a: MatrixCatalogTaskEntry,
  b: MatrixCatalogTaskEntry,
): number {
  const m = a.matrixItemName.localeCompare(b.matrixItemName, 'pt-BR')
  if (m !== 0) return m
  return a.taskName.localeCompare(b.taskName, 'pt-BR')
}

function sortedRootTaskIds(root: MatrixNodeTreeApi): string[] {
  return root.children
    .filter((c) => c.node_type === 'TASK')
    .slice()
    .sort(
      (a, b) =>
        a.order_index - b.order_index ||
        a.name.localeCompare(b.name, 'pt-BR'),
    )
    .map((t) => t.id)
}

function findNodeInTree(
  node: MatrixNodeTreeApi,
  id: string,
): MatrixNodeTreeApi | null {
  if (node.id === id) return node
  for (const c of node.children) {
    const f = findNodeInTree(c, id)
    if (f) return f
  }
  return null
}

function childTypeForParent(
  parentType: MatrixNodeType,
): MatrixNodeType | null {
  if (parentType === 'ITEM') return 'TASK'
  if (parentType === 'TASK') return 'SECTOR'
  if (parentType === 'SECTOR') return 'ACTIVITY'
  return null
}

/** Após remover um nó, define o próximo id selecionado (catálogo de tasks ou raiz ITEM). */
function scrollMatrixTaskCardIntoView(taskId: string) {
  const id =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(taskId)
      : taskId
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-matrix-task-id="${id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  })
}

function nextSelectionAfterDelete(
  newTree: MatrixNodeTreeApi,
  deletedType: MatrixNodeType,
): string {
  if (deletedType === 'TASK') {
    const tasks = newTree.children
      .filter((c) => c.node_type === 'TASK')
      .sort((a, b) => a.order_index - b.order_index)
    if (tasks.length > 0) return tasks[0].id
  }
  return newTree.id
}

type AlterarMatrizTab = 'dados' | 'estrutura' | 'revisao'

function pickPostDadosSelection(
  treeRoot: MatrixNodeTreeApi,
  restoreId: string | null,
): string {
  if (
    restoreId &&
    restoreId !== treeRoot.id &&
    findNodeInTree(treeRoot, restoreId)
  ) {
    return restoreId
  }
  const tasks = treeRoot.children
    .filter((c) => c.node_type === 'TASK')
    .slice()
    .sort(
      (a, b) =>
        a.order_index - b.order_index ||
        a.name.localeCompare(b.name, 'pt-BR'),
    )
  return tasks[0]?.id ?? treeRoot.id
}

export function OperationMatrixEditorPage() {
  const { catalog: matrixSuggestionCatalog } = useMatrixSuggestionCatalog()
  const { itemId } = useParams<{ itemId: string }>()
  const location = useLocation()
  const { pathname } = location
  const { presentBlocking } = useSgpErrorSurface()
  const navigate = useNavigate()
  const { requestNavigateWithTransientGuard } = useShellFunction()
  const [tree, setTree] = useState<MatrixNodeTreeApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** Avisos vindos da criação da matriz (`OperationMatrixNewPage`), quando a
   * clonagem de tarefas do catálogo teve de omitir algum responsável inválido. */
  const [duplicationWarnings, setDuplicationWarnings] = useState<
    MatrixDuplicationWarning[]
  >(
    () =>
      (location.state as { cloneWarnings?: MatrixDuplicationWarning[] } | null)
        ?.cloneWarnings ?? [],
  )
  const consumedNavCloneWarningsRef = useRef(false)

  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formPlanned, setFormPlanned] = useState('')
  const [formTeamIds, setFormTeamIds] = useState<string[]>([])
  const [formRequired, setFormRequired] = useState(true)
  const [formResponsibleId, setFormResponsibleId] = useState<string | null>(null)
  /** true só quando a equipe foi trocada pelo usuário nesta sessão de edição — evita
   * revalidar/limpar responsável de atividades legadas apenas por abrir o editor. */
  const teamChangedByUserRef = useRef(false)
  const [membersByTeam, setMembersByTeam] = useState<
    Record<string, TeamMember[] | 'loading' | 'error'>
  >({})
  const requestedResponsibleTeamIdsRef = useRef<Set<string>>(new Set())
  const debouncedTreeSearch = ''
  const [reuseCatalogEntries, setReuseCatalogEntries] = useState<
    MatrixCatalogTaskEntry[]
  >([])
  const [reuseCatalogLoading, setReuseCatalogLoading] = useState(false)
  const [reuseCatalogError, setReuseCatalogError] = useState<string | null>(
    null,
  )
  const [structureExpandedTaskIds, setStructureExpandedTaskIds] = useState<
    ReadonlySet<string>
  >(() => new Set())
  /** Rascunho do formulário «+ Adicionar tarefa» no catálogo (TASK sob ITEM). */
  const [serviceOptionAddOpen, setServiceOptionAddOpen] = useState(false)
  const [serviceOptionNewName, setServiceOptionNewName] = useState('')
  const [serviceOptionNewDescription, setServiceOptionNewDescription] =
    useState('')
  const [taskPanelMode, setTaskPanelMode] = useState<
    'composition' | 'editTaskMeta'
  >('composition')
  /** Atividade: formulário só após "Editar"; clique na linha = só seleção. */
  const [activityEditMode, setActivityEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState<AlterarMatrizTab>('dados')
  const [estruturaDrawerOpen, setEstruturaDrawerOpen] = useState(false)
  const selectedBeforeDadosRef = useRef<string | null>(null)
  const orderBaselineRef = useRef<Map<string, number>>(new Map())

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const collaboratorIdToName = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of collaborators) m.set(c.id, c.fullName)
    return m
  }, [collaborators])
  const teamIdSet = useMemo(() => new Set(teams.map((t) => t.id)), [teams])

  const teamIdToName = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of teams) m.set(t.id, t.name)
    return m
  }, [teams])

  const aggregateMaps: MatrixTreeAggregateMaps | null = useMemo(() => {
    if (!tree) return null
    return buildMatrixTreeAggregateMaps(tree, teamIdSet)
  }, [tree, teamIdSet])

  const parentMap = useMemo(() => (tree ? buildParentIdMap(tree) : new Map()), [tree])

  const nodeTypeMap = useMemo(() => (tree ? buildNodeTypeMap(tree) : new Map()), [tree])

  const activePathIds = useMemo(
    () => getActiveBranchIdSet(selectedId, parentMap),
    [selectedId, parentMap],
  )

  const breadcrumbSegments = useMemo(
    () => (tree ? buildBreadcrumbSegments(tree, selectedId, parentMap) : []),
    [tree, selectedId, parentMap],
  )

  const searchMatchIds = useMemo(() => {
    if (!tree || !debouncedTreeSearch.trim()) return new Set<string>()
    return collectMatchingNodeIds(tree, debouncedTreeSearch)
  }, [tree, debouncedTreeSearch])

  const reuseCatalogByTaskId = useMemo(() => {
    const m = new Map<string, MatrixCatalogTaskEntry>()
    for (const e of reuseCatalogEntries) m.set(e.taskId, e)
    return m
  }, [reuseCatalogEntries])

  const loadTree = useCallback(async (): Promise<MatrixNodeTreeApi | null> => {
    if (!itemId) return null
    setLoading(true)
    setLoadError(null)
    try {
      const t = await getMatrixTree(itemId)
      setTree(t)
      orderBaselineRef.current = snapshotOrderMap(t)
      setSelectedId((prev) => {
        if (prev && findNodeInTree(t, prev)) return prev
        return t.id
      })
      return t
    } catch (e) {
      if (isApiNotFound(e)) {
        setLoadError('Matriz não encontrada.')
      } else {
        const n = reportClientError(e, {
          module: 'operation-matrix',
          action: 'matrix_editor_load_tree',
          route: pathname,
          entityId: itemId,
        })
        if (isBlockingSeverity(n.severity)) {
          presentBlocking(n)
          setLoadError(null)
        } else {
          setLoadError(n.userMessage)
        }
      }
      setTree(null)
      orderBaselineRef.current = new Map()
      return null
    } finally {
      setLoading(false)
    }
  }, [itemId, pathname, presentBlocking])

  const loadReuseCatalog = useCallback(async () => {
    if (!itemId) return
    setReuseCatalogLoading(true)
    setReuseCatalogError(null)
    try {
      const items = await listMatrixItems({ isActive: true })
      const entries: MatrixCatalogTaskEntry[] = []
      await Promise.all(
        items.map(async (it) => {
          if (it.id === itemId) return
          try {
            const t = await getMatrixTree(it.id)
            entries.push(
              ...extractCatalogTasksFromItemTree(it.id, it.name, t),
            )
          } catch {
            /* matriz pode estar indisponível; omitir entrada */
          }
        }),
      )
      entries.sort(sortReuseCatalogEntries)
      setReuseCatalogEntries(entries)
    } catch (e) {
      const n = reportClientError(e, {
        module: 'operation-matrix',
        action: 'matrix_editor_load_reuse_catalog',
        route: pathname,
        entityId: itemId,
      })
      setReuseCatalogEntries([])
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setReuseCatalogError(n.userMessage)
      }
    } finally {
      setReuseCatalogLoading(false)
    }
  }, [itemId, pathname, presentBlocking])

  useEffect(() => {
    void loadTree()
  }, [loadTree])

  useEffect(() => {
    void loadReuseCatalog()
  }, [loadReuseCatalog])

  useEffect(() => {
    setStructureExpandedTaskIds(new Set())
  }, [itemId])

  /** Consome `location.state.cloneWarnings` uma única vez (evita reexibição ao
   * navegar de volta com o mesmo estado de histórico). */
  useEffect(() => {
    if (consumedNavCloneWarningsRef.current) return
    const navWarnings = (
      location.state as { cloneWarnings?: MatrixDuplicationWarning[] } | null
    )?.cloneWarnings
    if (!navWarnings || navWarnings.length === 0) return
    consumedNavCloneWarningsRef.current = true
    navigate(pathname, { replace: true, state: null })
  }, [location.state, navigate, pathname])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const svc = getCollaboratorsService()
      const [collaboratorsResult, teamsResult] = await Promise.allSettled([
        svc.listCollaborators({
          status: 'active',
          search: undefined,
        }),
        listTeams({
          isActive: 'all',
          limit: 200,
          offset: 0,
        }),
      ])
      if (cancelled) return
      if (collaboratorsResult.status === 'fulfilled') {
        setCollaborators(collaboratorsResult.value)
      } else {
        setCollaborators([])
      }
      if (teamsResult.status === 'fulfilled') {
        setTeams(teamsResult.value.items)
      } else {
        setTeams([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selected = useMemo(() => {
    if (!tree || !selectedId) return null
    return findNodeInTree(tree, selectedId)
  }, [tree, selectedId])

  /**
   * Não escreve `'loading'` de forma síncrona: a ausência da chave em `membersByTeam`
   * já é tratada como "carregando" na leitura (evita setState síncrono dentro do efeito).
   */
  const fetchResponsibleTeamMembers = useCallback((teamId: string) => {
    requestedResponsibleTeamIdsRef.current.add(teamId)
    listTeamMembers(teamId)
      .then((rows) => {
        setMembersByTeam((prev) => ({ ...prev, [teamId]: rows }))
      })
      .catch(() => {
        requestedResponsibleTeamIdsRef.current.delete(teamId)
        setMembersByTeam((prev) => ({ ...prev, [teamId]: 'error' }))
      })
  }, [])

  /** Equipe efetiva da ACTIVITY selecionada, conforme o formulário em edição. */
  const activeFormTeamId =
    selected?.node_type === 'ACTIVITY' ? (formTeamIds[0]?.trim() || null) : null

  useEffect(() => {
    if (activeFormTeamId && !requestedResponsibleTeamIdsRef.current.has(activeFormTeamId)) {
      fetchResponsibleTeamMembers(activeFormTeamId)
    }
  }, [activeFormTeamId, fetchResponsibleTeamMembers])

  const activeTeamMembersState = activeFormTeamId
    ? (membersByTeam[activeFormTeamId] ?? 'loading')
    : 'idle'

  const eligibleResponsibleIds = useMemo(() => {
    if (
      activeTeamMembersState === 'idle' ||
      activeTeamMembersState === 'loading' ||
      activeTeamMembersState === 'error'
    ) {
      return null
    }
    return new Set(
      activeTeamMembersState.filter(isEligibleActiveTeamMember).map((m) => m.collaboratorId),
    )
  }, [activeTeamMembersState])

  /** Só revalida (e eventualmente limpa) o responsável quando o usuário troca a
   * equipe nesta sessão — atividades legadas não são alteradas só por abrir o editor. */
  useEffect(() => {
    if (!teamChangedByUserRef.current) return
    if (!activeFormTeamId) {
      setFormResponsibleId(null)
      return
    }
    if (!eligibleResponsibleIds) return
    setFormResponsibleId((prev) =>
      prev && !eligibleResponsibleIds.has(prev) ? null : prev,
    )
  }, [activeFormTeamId, eligibleResponsibleIds])

  const matrixEditorHasUnsavedChanges = useMemo(() => {
    if (!selected || loading || !tree) return false
    if (formName.trim() !== selected.name.trim()) return true
    if ((formCode.trim() || '') !== (selected.code ?? '').trim()) return true
    if ((formDescription.trim() || '') !== (selected.description ?? '').trim()) {
      return true
    }
    if (selected.node_type === 'ITEM' || selected.node_type === 'TASK') {
      if (formActive !== selected.is_active) return true
    }
    if (selected.node_type === 'ACTIVITY') {
      const fp = formPlanned.trim()
      if (fp === '') {
        if (selected.planned_minutes != null) return true
      } else {
        const n = Number.parseInt(fp, 10)
        if (Number.isNaN(n)) return true
        if (n !== selected.planned_minutes) return true
      }
      const selectedPrimary = matrixActivityPrimaryTeamId(selected) ?? ''
      const formPrimary = (formTeamIds[0] ?? '').trim()
      if (selectedPrimary !== formPrimary) return true
      if (formRequired !== selected.required) return true
      if ((selected.default_responsible_id ?? null) !== formResponsibleId) return true
    }
    return false
  }, [
    selected,
    tree,
    loading,
    formName,
    formCode,
    formDescription,
    formActive,
    formPlanned,
    formTeamIds,
    formRequired,
    formResponsibleId,
  ])

  const matrixStructureDirty = useMemo(() => {
    if (!tree) return false
    return !orderTreeMatchesBaseline(tree, orderBaselineRef.current)
  }, [tree])

  const revisaoLista = useMemo(
    () =>
      aggregateMaps
        ? revisaoAlterarMatrizPendencias({
            matrixStructureDirty,
            matrixEditorHasUnsavedChanges,
            activitiesWithoutDefaultTeam:
              aggregateMaps.global.activitiesWithoutDefaultTeam,
            activitiesWithOrphanDefaultTeam:
              aggregateMaps.global.activitiesWithOrphanDefaultTeam,
          })
        : [],
    [
      aggregateMaps,
      matrixStructureDirty,
      matrixEditorHasUnsavedChanges,
    ],
  )

  const serviceOptionDraftDirty = useMemo(
    () =>
      serviceOptionAddOpen &&
      (serviceOptionNewName.trim() !== '' ||
        serviceOptionNewDescription.trim() !== ''),
    [serviceOptionAddOpen, serviceOptionNewName, serviceOptionNewDescription],
  )

  useEffect(() => {
    if (selected?.node_type !== 'TASK') {
      setTaskPanelMode('composition')
    }
  }, [selected?.node_type])

  useEffect(() => {
    if (selected?.node_type !== 'ACTIVITY') {
      setActivityEditMode(false)
    }
  }, [selected?.node_type])

  useEffect(() => {
    if (activeTab !== 'estrutura') return
    if (taskPanelMode === 'editTaskMeta' || activityEditMode) {
      setEstruturaDrawerOpen(true)
    }
  }, [activeTab, taskPanelMode, activityEditMode])

  const compositionTask = useMemo(() => {
    if (!tree || !selectedId || !selected) return null
    if (selected.node_type === 'TASK') return selected
    if (selected.node_type === 'ITEM') return null
    const tid = findAncestorTaskId(selectedId, parentMap, nodeTypeMap)
    if (!tid) return null
    return findNodeInTree(tree, tid)
  }, [tree, selected, selectedId, parentMap, nodeTypeMap])

  /** Setor (SECTOR) em foco para Subir/Descer: só quando o setor está selecionado na composição. */
  const compositionFocusSectorId = useMemo(() => {
    if (!tree || !compositionTask || !selectedId) return null
    const sel = findNodeInTree(tree, selectedId)
    if (!sel) return null
    if (sel.node_type === 'SECTOR' && sel.parent_id === compositionTask.id) {
      return sel.id
    }
    return null
  }, [tree, compositionTask, selectedId])

  const compositionSectorOrder = useMemo(() => {
    if (!compositionTask) return []
    return compositionTask.children
      .filter((c) => c.node_type === 'SECTOR')
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
  }, [compositionTask])

  const compositionSectorReorderUpDisabled = useMemo(() => {
    if (!compositionFocusSectorId) return true
    const idx = compositionSectorOrder.findIndex(
      (s) => s.id === compositionFocusSectorId,
    )
    return idx <= 0
  }, [compositionFocusSectorId, compositionSectorOrder])

  const compositionSectorReorderDownDisabled = useMemo(() => {
    if (!compositionFocusSectorId) return true
    const idx = compositionSectorOrder.findIndex(
      (s) => s.id === compositionFocusSectorId,
    )
    return idx < 0 || idx >= compositionSectorOrder.length - 1
  }, [compositionFocusSectorId, compositionSectorOrder])

  const applyFormFromNode = useCallback((node: MatrixNodeTreeApi) => {
    setFormName(node.name)
    setFormCode(node.code ?? '')
    setFormDescription(node.description ?? '')
    setFormActive(node.is_active)
    setFormPlanned(
      node.planned_minutes != null ? String(node.planned_minutes) : '',
    )
    const tid = matrixActivityPrimaryTeamId(node)
    setFormTeamIds(tid ? [tid] : [])
    setFormRequired(node.required)
    setFormResponsibleId(node.default_responsible_id ?? null)
    teamChangedByUserRef.current = false
  }, [])

  useEffect(() => {
    if (!selected) return
    applyFormFromNode(selected)
  }, [selected, applyFormFromNode])

  useRegisterTransientContext({
    id: 'operation-matrix-editor',
    isDirty: () =>
      matrixEditorHasUnsavedChanges ||
      matrixStructureDirty ||
      serviceOptionDraftDirty,
    onReset: () => {
      if (selected) applyFormFromNode(selected)
      setServiceOptionAddOpen(false)
      setServiceOptionNewName('')
      setServiceOptionNewDescription('')
      if (matrixStructureDirty && itemId) {
        void loadTree()
      }
    },
  })

  const selectedBranchStats = useMemo(() => {
    if (!aggregateMaps || !selectedId) return null
    return getBranchStats(aggregateMaps, selectedId)
  }, [aggregateMaps, selectedId])

  function pushToast(message: string, variant: SgpToastVariant = 'success') {
    setToast({ message, variant })
  }

  function matrixOpError(e: unknown, action: string) {
    const n = reportClientError(e, {
      module: 'operation-matrix',
      action,
      route: pathname,
      entityId: itemId,
    })
    if (isBlockingSeverity(n.severity)) {
      presentBlocking(n)
      return
    }
    pushToast(n.userMessage, 'error')
  }

  const selectTaskComposition = useCallback((id: string) => {
    setSelectedId(id)
    setTaskPanelMode('composition')
    setActivityEditMode(false)
  }, [])

  const selectActivityForEdit = useCallback((id: string) => {
    setSelectedId(id)
    setTaskPanelMode('composition')
    setActivityEditMode(true)
  }, [])

  const selectTaskEditMeta = useCallback((id: string) => {
    setSelectedId(id)
    setTaskPanelMode('editTaskMeta')
  }, [])

  async function handleSave() {
    if (!selected || !tree) return
    setBusy(true)
    try {
      const orderPatches = computeOrderPatches(tree, orderBaselineRef.current)
      for (const p of orderPatches) {
        await patchMatrixNode(p.id, { orderIndex: p.orderIndex })
      }

      const patch: Parameters<typeof patchMatrixNode>[1] = {
        name: formName.trim(),
        code: formCode.trim() || null,
        description: formDescription.trim() || null,
        isActive:
          selected.node_type === 'ITEM' || selected.node_type === 'TASK'
            ? formActive
            : selected.is_active,
      }
      if (selected.node_type === 'ACTIVITY') {
        const pm = formPlanned.trim()
        patch.plannedMinutes = pm === '' ? null : Number.parseInt(pm, 10)
        if (patch.plannedMinutes !== null && Number.isNaN(patch.plannedMinutes)) {
          pushToast('Previsto (minutos) inválido.', 'error')
          setBusy(false)
          return
        }
        const primary = (formTeamIds[0] ?? '').trim()
        patch.teamIds = primary ? [primary] : []
        patch.required = formRequired
        patch.defaultResponsibleId = formResponsibleId?.trim() || null
      }
      await patchMatrixNode(selected.id, patch)
      pushToast('Alterações salvas.')
      await loadTree()
      void loadReuseCatalog()
      if (selected.node_type === 'TASK') {
        setTaskPanelMode('composition')
      }
      if (selected.node_type === 'ACTIVITY') {
        setActivityEditMode(false)
      }
    } catch (e) {
      matrixOpError(e, 'matrix_editor_save')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!selected || !tree) return
    if (
      !window.confirm(
        'Remover este nó e toda a subárvore? Esta ação é lógica e pode ser desfeita com Restaurar.',
      )
    ) {
      return
    }
    const deletedType = selected.node_type
    setBusy(true)
    try {
      const isRootItem =
        selected.node_type === 'ITEM' && selected.parent_id === null
      await deleteMatrixNode(selected.id)
      setLastDeletedId(selected.id)
      pushToast('Removido.')
      if (isRootItem) {
        navigate('/app/matrizes-operacao', {
          state: { restoreMatrixId: selected.id },
        })
        return
      }
      const newTree = await loadTree()
      if (newTree) {
        setSelectedId(nextSelectionAfterDelete(newTree, deletedType))
      }
    } catch (e) {
      matrixOpError(e, 'matrix_editor_delete')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteTaskFromCatalog(taskId: string) {
    if (!tree) return
    const node = findNodeInTree(tree, taskId)
    if (!node || node.node_type !== 'TASK') return
    if (
      !window.confirm(
        `Remover a tarefa de serviço "${node.name}" e toda a sua composição? Esta ação é lógica e pode ser desfeita com Restaurar.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await deleteMatrixNode(taskId)
      setLastDeletedId(taskId)
      pushToast('Tarefa removida.')
      const newTree = await loadTree()
      if (newTree) {
        setSelectedId(nextSelectionAfterDelete(newTree, 'TASK'))
      }
    } catch (e) {
      matrixOpError(e, 'matrix_editor_delete_task')
    } finally {
      setBusy(false)
    }
  }

  async function handleAddServiceOption(name: string, description?: string) {
    if (!tree) {
      pushToast('Matriz indisponível.', 'error')
      throw new Error('no-tree')
    }
    const n = name.trim()
    if (!n) {
      pushToast('Informe o nome da tarefa.', 'error')
      throw new Error('empty-name')
    }
    setBusy(true)
    try {
      const created = await createMatrixNode({
        nodeType: 'TASK',
        parentId: tree.id,
        name: n,
        description: description?.trim() || null,
        isActive: true,
      })
      pushToast('Tarefa de serviço criada.')
      setServiceOptionAddOpen(false)
      setServiceOptionNewName('')
      setServiceOptionNewDescription('')
      await loadTree()
      setSelectedId(created.id)
      setTaskPanelMode('composition')
    } catch (err) {
      matrixOpError(err, 'matrix_editor_add_service_option')
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleRestore() {
    if (!lastDeletedId) return
    setBusy(true)
    try {
      await restoreMatrixNode(lastDeletedId)
      pushToast('Nó restaurado.')
      setLastDeletedId(null)
      await loadTree()
    } catch (e) {
      matrixOpError(e, 'matrix_editor_restore')
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicateSector(sectorId: string) {
    if (!tree) return
    const sector = findNodeInTree(tree, sectorId)
    if (!sector || sector.node_type !== 'SECTOR' || !sector.parent_id) return
    const taskNode = findNodeInTree(tree, sector.parent_id)
    if (!taskNode || taskNode.node_type !== 'TASK') return
    const oldSectorIds = new Set(
      taskNode.children
        .filter((c) => c.node_type === 'SECTOR')
        .map((c) => c.id),
    )
    setDuplicationWarnings([])
    setBusy(true)
    try {
      const { warnings } = await duplicateMatrixNode(sectorId)
      pushToast('Setor duplicado.')
      setDuplicationWarnings(warnings)
      const newTree = await loadTree()
      if (!newTree) return
      const taskAfter = findNodeInTree(newTree, taskNode.id)
      if (!taskAfter) return
      const newSector = taskAfter.children.find(
        (c) => c.node_type === 'SECTOR' && !oldSectorIds.has(c.id),
      )
      if (newSector) {
        setSelectedId(newSector.id)
        setTaskPanelMode('composition')
      }
    } catch (e) {
      matrixOpError(e, 'matrix_editor_duplicate_sector')
    } finally {
      setBusy(false)
    }
  }

  async function handleAddActivityToSector(sectorId: string) {
    if (!tree) return
    const sector = findNodeInTree(tree, sectorId)
    if (!sector || sector.node_type !== 'SECTOR') return
    setBusy(true)
    try {
      const created = await createMatrixNode({
        nodeType: 'ACTIVITY',
        parentId: sectorId,
        name: 'Nova atividade',
        isActive: true,
      })
      pushToast('Atividade criada.')
      await loadTree()
      setSelectedId(created.id)
      setTaskPanelMode('composition')
      setActivityEditMode(false)
    } catch (err) {
      matrixOpError(err, 'matrix_editor_add_activity')
    } finally {
      setBusy(false)
    }
  }

  function handleReorderActivityInSector(
    sectorId: string,
    dir: 'up' | 'down',
  ) {
    if (!tree || !selectedId) return
    const sel = findNodeInTree(tree, selectedId)
    if (!sel || sel.node_type !== 'ACTIVITY' || sel.parent_id !== sectorId) {
      return
    }
    const next = reorderSiblingStep(tree, selectedId, dir)
    if (next) setTree(next)
  }

  async function handleDuplicateActivity(activityId: string) {
    if (!tree) return
    const node = findNodeInTree(tree, activityId)
    if (!node || node.node_type !== 'ACTIVITY' || !node.parent_id) return
    const sector = findNodeInTree(tree, node.parent_id)
    if (!sector || sector.node_type !== 'SECTOR') return
    const oldActivityIds = new Set(
      sector.children
        .filter((c) => c.node_type === 'ACTIVITY')
        .map((c) => c.id),
    )
    setDuplicationWarnings([])
    setBusy(true)
    try {
      const { warnings } = await duplicateMatrixNode(activityId)
      pushToast('Atividade duplicada.')
      setDuplicationWarnings(warnings)
      const newTree = await loadTree()
      if (!newTree) return
      const sectorAfter = findNodeInTree(newTree, sector.id)
      if (!sectorAfter) return
      const newAct = sectorAfter.children.find(
        (c) => c.node_type === 'ACTIVITY' && !oldActivityIds.has(c.id),
      )
      if (newAct) {
        setSelectedId(newAct.id)
        setTaskPanelMode('composition')
        setActivityEditMode(false)
      }
    } catch (e) {
      matrixOpError(e, 'matrix_editor_duplicate_activity')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteActivity(activityId: string) {
    if (!tree) return
    const node = findNodeInTree(tree, activityId)
    if (!node || node.node_type !== 'ACTIVITY' || !node.parent_id) return
    const sector = findNodeInTree(tree, node.parent_id)
    if (!sector || sector.node_type !== 'SECTOR') return
    if (
      !window.confirm(
        `Remover a atividade "${node.name}"? Esta ação é lógica e pode ser desfeita com Restaurar.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await deleteMatrixNode(activityId)
      setLastDeletedId(activityId)
      pushToast('Atividade removida.')
      const newTree = await loadTree()
      if (newTree && findNodeInTree(newTree, sector.id)) {
        setSelectedId(sector.id)
        setTaskPanelMode('composition')
      }
    } catch (e) {
      matrixOpError(e, 'matrix_editor_delete_activity')
    } finally {
      setBusy(false)
    }
  }

  function handleReorderSector(sectorId: string, dir: 'up' | 'down') {
    if (!tree) return
    const next = reorderSiblingStep(tree, sectorId, dir)
    if (next) setTree(next)
  }

  async function handleDeleteSector(sectorId: string) {
    if (!tree) return
    const sector = findNodeInTree(tree, sectorId)
    if (!sector || sector.node_type !== 'SECTOR') return
    if (
      !window.confirm(
        `Remover o setor "${sector.name}" e todas as atividades? Esta ação é lógica e pode ser desfeita com Restaurar.`,
      )
    ) {
      return
    }
    const taskId = sector.parent_id
    if (!taskId) return
    setBusy(true)
    try {
      await deleteMatrixNode(sectorId)
      setLastDeletedId(sectorId)
      pushToast('Setor removido.')
      const newTree = await loadTree()
      if (newTree && findNodeInTree(newTree, taskId)) {
        setSelectedId(taskId)
        setTaskPanelMode('composition')
      }
    } catch (e) {
      matrixOpError(e, 'matrix_editor_delete_sector')
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicateTask(taskId: string) {
    if (!tree) return
    const node = findNodeInTree(tree, taskId)
    if (!node || node.node_type !== 'TASK') return
    const oldTaskIds = new Set(
      tree.children
        .filter((c) => c.node_type === 'TASK')
        .map((c) => c.id),
    )
    setDuplicationWarnings([])
    setBusy(true)
    try {
      const { warnings } = await duplicateMatrixNode(taskId)
      pushToast('Duplicado.')
      setDuplicationWarnings(warnings)
      const newTree = await loadTree()
      if (newTree) {
        const newTask = newTree.children.find(
          (c) => c.node_type === 'TASK' && !oldTaskIds.has(c.id),
        )
        if (newTask) {
          setSelectedId(newTask.id)
          setTaskPanelMode('composition')
          scrollMatrixTaskCardIntoView(newTask.id)
        }
      }
    } catch (e) {
      matrixOpError(e, 'matrix_editor_duplicate_task')
    } finally {
      setBusy(false)
    }
  }

  function toggleStructureTaskExpand(taskId: string) {
    setStructureExpandedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  async function handleCatalogDropAtPosition(
    catalogSourceTaskId: string,
    rawInsertIndex: number,
  ) {
    if (!tree || tree.node_type !== 'ITEM' || !itemId) {
      pushToast('Matriz indisponível.', 'error')
      return
    }
    const entry = reuseCatalogByTaskId.get(catalogSourceTaskId)
    if (!entry) {
      pushToast('Entrada do catálogo não encontrada.', 'error')
      return
    }
    if (matrixCatalogEntryOverlapsCurrentMatrix(entry, tree)) {
      pushToast(
        'Esta tarefa já corresponde a uma entrada nesta matriz (nome ou chave de origem).',
        'error',
      )
      return
    }
    if (entry.taskSubtree.node_type !== 'TASK') {
      pushToast('Entrada inválida no catálogo.', 'error')
      return
    }
    const sortedIds = sortedRootTaskIds(tree)
    const insertIndex = clampInsertIndex(rawInsertIndex, sortedIds.length)
    const oldIds = new Set(sortedIds)
    const taskChildren = tree.children.filter((c) => c.node_type === 'TASK')
    const nextOrder =
      taskChildren.length === 0
        ? 0
        : Math.max(...taskChildren.map((t) => t.order_index), -1) + 1
    const subtreeForClone = {
      ...entry.taskSubtree,
      order_index: nextOrder,
    }
    setDuplicationWarnings([])
    setBusy(true)
    try {
      const { warnings } = await cloneTaskSubtreeUnderItem(tree.id, subtreeForClone)
      pushToast('Tarefa incluída na matriz a partir do catálogo.')
      setDuplicationWarnings(warnings)
      const newTree = await loadTree()
      if (!newTree) return
      const added = newTree.children
        .filter((c) => c.node_type === 'TASK')
        .find((t) => !oldIds.has(t.id))
      if (!added) return
      const desired = [
        ...sortedIds.slice(0, insertIndex),
        added.id,
        ...sortedIds.slice(insertIndex),
      ]
      const reordered = reorderItemChildTasksToOrder(
        newTree,
        newTree.id,
        desired,
      )
      setTree(reordered ?? newTree)
      setStructureExpandedTaskIds((prev) => new Set(prev).add(added.id))
      selectTaskComposition(added.id)
      scrollMatrixTaskCardIntoView(added.id)
      void loadReuseCatalog()
    } catch (e) {
      matrixOpError(e, 'matrix_editor_include_catalog_task')
    } finally {
      setBusy(false)
    }
  }

  async function handleIncludeCatalogTask(entry: MatrixCatalogTaskEntry) {
    if (!tree) return
    const n = sortedRootTaskIds(tree).length
    await handleCatalogDropAtPosition(entry.taskId, n)
  }

  function handleReorder(dir: 'up' | 'down') {
    if (!selected || !tree) return
    const next = reorderSiblingStep(tree, selected.id, dir)
    if (next) setTree(next)
  }

  function handleStructureDragEnd(event: DragEndEvent) {
    if (!tree || busy) return
    const { active, over } = event
    if (!over) return
    const aid = String(active.id)
    const oid = String(over.id)
    if (aid === oid) return
    const pt = parentMap.get(aid)
    const po = parentMap.get(oid)
    if (pt !== po) return
    const nt = nodeTypeMap.get(aid)
    if (!nt || nodeTypeMap.get(oid) !== nt) return
    const next = reorderSiblingsRelativeToOver(tree, aid, oid)
    if (next) setTree(next)
  }

  const canAddChild = selected
    ? childTypeForParent(selected.node_type) !== null
    : false
  const childType = selected
    ? childTypeForParent(selected.node_type)
    : null

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')

  function handlePreview() {
    if (!tree || !itemId) return
    const snapshot = buildOperationMatrixPreviewSnapshot(itemId, tree, selectedId, {
      formName,
      formCode,
      formDescription,
      formActive,
      formPlanned,
      formTeamIds,
      formRequired,
    })
    const token = generatePreviewDraftToken()
    const result = writePreviewSnapshotToSession(token, snapshot)
    if (!result.ok) {
      pushToast(
        result.reason === 'quota'
          ? 'Não foi possível guardar o rascunho (armazenamento cheio).'
          : 'Não foi possível abrir a pré-visualização.',
        'error',
      )
      return
    }
    const path = `/app/matrizes-operacao/${encodeURIComponent(itemId)}/preview?draft=${encodeURIComponent(token)}`
    window.open(path, '_blank', 'noopener,noreferrer')
  }

  const handleCancel = useCallback(() => {
    if (!selected) return
    applyFormFromNode(selected)
    setAddOpen(false)
    setAddName('')
    if (selected.node_type === 'TASK') {
      setTaskPanelMode('composition')
    }
    if (selected.node_type === 'ACTIVITY') {
      setActivityEditMode(false)
    }
  }, [selected, applyFormFromNode])

  function selectAlterarMatrizTab(next: AlterarMatrizTab) {
    if (!tree) {
      setActiveTab(next)
      return
    }
    if (activeTab === 'dados' && next !== 'dados') {
      if (selectedId === tree.id && matrixEditorHasUnsavedChanges) {
        pushToast(
          'Guarde ou cancele as alterações em «Dados básicos» antes de mudar de aba.',
          'error',
        )
        return
      }
      const restore = selectedBeforeDadosRef.current
      selectedBeforeDadosRef.current = null
      if (next === 'estrutura' || next === 'revisao') {
        setSelectedId(pickPostDadosSelection(tree, restore))
      }
    }
    if (next === 'dados' && activeTab !== 'dados') {
      selectedBeforeDadosRef.current = selectedId
      setSelectedId(tree.id)
    }
    if (next !== 'estrutura') setEstruturaDrawerOpen(false)
    setActiveTab(next)
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !childType) return
    const n = addName.trim()
    if (!n) {
      pushToast('Informe o nome.', 'error')
      return
    }
    setBusy(true)
    try {
      const created = await createMatrixNode({
        nodeType: childType,
        parentId: selected.id,
        name: n,
        isActive: true,
      })
      pushToast('Nó criado.')
      setAddName('')
      setAddOpen(false)
      await loadTree()
      setSelectedId(created.id)
    } catch (err) {
      matrixOpError(err, 'matrix_editor_add_child')
    } finally {
      setBusy(false)
    }
  }

  if (!itemId) {
    return (
      <PageCanvas>
        <p className="text-slate-500">Identificador inválido.</p>
      </PageCanvas>
    )
  }

  function renderMatrixSelectionContextBar(omitCompositionPanel: boolean) {
    if (!tree || loadError || !aggregateMaps) return null
    return (
      <MatrixSelectionContextBar
        selected={selected}
        compositionTask={compositionTask}
        breadcrumbSegments={breadcrumbSegments}
        aggregateMaps={aggregateMaps}
        selectedBranchStats={selectedBranchStats}
        typeLabel={matrixUxNodeLabel}
        addChildCta={matrixUxAddChildCta}
        formName={formName}
        setFormName={setFormName}
        formCode={formCode}
        setFormCode={setFormCode}
        formDescription={formDescription}
        setFormDescription={setFormDescription}
        formActive={formActive}
        setFormActive={setFormActive}
        formPlanned={formPlanned}
        setFormPlanned={setFormPlanned}
        formTeamIds={formTeamIds}
        setFormTeamIds={(v) => {
          teamChangedByUserRef.current = true
          setFormTeamIds(v)
        }}
        formRequired={formRequired}
        setFormRequired={setFormRequired}
        formResponsibleId={formResponsibleId}
        setFormResponsibleId={setFormResponsibleId}
        eligibleResponsibleIds={eligibleResponsibleIds}
        responsibleTeamMembersState={
          activeTeamMembersState === 'idle' ||
          activeTeamMembersState === 'loading' ||
          activeTeamMembersState === 'error'
            ? activeTeamMembersState
            : 'ready'
        }
        onRetryLoadResponsibleTeamMembers={() =>
          activeFormTeamId && fetchResponsibleTeamMembers(activeFormTeamId)
        }
        collaboratorIdToName={collaboratorIdToName}
        teams={teams}
        teamIdSet={teamIdSet}
        busy={busy}
        canAddChild={canAddChild}
        childType={childType}
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        addName={addName}
        setAddName={setAddName}
        onSave={() => handleSave()}
        onCancel={handleCancel}
        onDelete={() => void handleDelete()}
        onAddChild={(e) => void handleAddChild(e)}
        teamIdToName={teamIdToName}
        selectedId={selectedId}
        activePathIds={activePathIds}
        onSelectNode={selectTaskComposition}
        searchQuery={debouncedTreeSearch}
        matchIds={searchMatchIds}
        taskPanelMode={taskPanelMode}
        onDuplicateSector={(id) => void handleDuplicateSector(id)}
        onRemoveSector={(id) => void handleDeleteSector(id)}
        onAddActivityToSector={(id) => void handleAddActivityToSector(id)}
        onReorderActivityInSector={(sectorId, dir) =>
          void handleReorderActivityInSector(sectorId, dir)
        }
        onDuplicateActivity={(id) => void handleDuplicateActivity(id)}
        onRemoveActivity={(id) => void handleDeleteActivity(id)}
        activityEditMode={activityEditMode}
        onEditActivity={(id) => selectActivityForEdit(id)}
        onCompositionSectorReorder={(dir) => {
          if (compositionFocusSectorId) {
            handleReorderSector(compositionFocusSectorId, dir)
          }
        }}
        compositionSectorReorderUpDisabled={
          compositionSectorReorderUpDisabled
        }
        compositionSectorReorderDownDisabled={
          compositionSectorReorderDownDisabled
        }
        matrixSuggestionCatalog={matrixSuggestionCatalog}
        omitCompositionPanel={omitCompositionPanel}
      />
    )
  }

  const estruturaWorkbench =
    tree && !loadError && aggregateMaps ? (
      <OperationMatrixEditorWorkbench
        columnLayout="wideRight"
        metricsStrip={<OperationMatrixMetricsStrip global={aggregateMaps.global} />}
        stripEnd={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEstruturaDrawerOpen(true)}
              className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              Campos da seleção
            </button>
            <button
              type="button"
              disabled={
                busy ||
                (!matrixEditorHasUnsavedChanges && !matrixStructureDirty)
              }
              onClick={() => void handleSave()}
              className="rounded-lg border border-sgp-gold/40 bg-sgp-gold/15 px-3 py-1.5 text-xs font-semibold text-sgp-gold-warm transition hover:border-sgp-gold/55 hover:bg-sgp-gold/20 disabled:opacity-50"
            >
              Salvar alterações
            </button>
          </div>
        }
        showSearchInput={false}
        searchAriaLabel="Buscar na composição"
        searchValue=""
        onSearchChange={() => {}}
        leftColumn={
          <NovaMatrizEstruturaCatalogPanel
            loading={reuseCatalogLoading}
            loadError={reuseCatalogError}
            entries={reuseCatalogEntries}
            onRetryLoad={() => void loadReuseCatalog()}
            resolveCollaboratorLabel={(id) => collaboratorIdToName.get(id) ?? id}
            onDropDraftToRemove={() => {}}
            onDropPersistedMatrixTask={(taskId) =>
              void handleDeleteTaskFromCatalog(taskId)
            }
            headingTitle="Bases e extras"
            headingHint="Arraste para o painel ao lado para incluir cópias na matriz atual. Para retirar uma tarefa persistida, arraste de volta para aqui. Tarefas com «Já na matriz» não podem ser duplicadas."
            isCatalogEntryReuseBlocked={(e) =>
              matrixCatalogEntryOverlapsCurrentMatrix(e, tree)
            }
            onIncludeCatalogEntry={(e) => void handleIncludeCatalogTask(e)}
            includeBusy={busy}
            includeButtonVariant="subtle"
          />
        }
        rightColumn={
          <AlterarMatrizEstruturaDraftPanel
            tree={tree}
            parentMap={parentMap}
            selectedId={selectedId}
            selected={selected}
            activePathIds={activePathIds}
            aggregateMaps={aggregateMaps}
            teamIdToName={teamIdToName}
            searchQuery={debouncedTreeSearch}
            matchIds={searchMatchIds}
            busy={busy}
            matrixSuggestionCatalog={matrixSuggestionCatalog}
            structureExpandedTaskIds={structureExpandedTaskIds}
            onToggleTaskCompositionExpanded={toggleStructureTaskExpand}
            onSelectTaskComposition={selectTaskComposition}
            onSelectTaskEditMeta={selectTaskEditMeta}
            onReorder={(dir) => void handleReorder(dir)}
            onAddServiceOption={(name, description) =>
              void handleAddServiceOption(name, description)
            }
            onRemoveTaskFromCatalog={(id) => void handleDeleteTaskFromCatalog(id)}
            onDuplicateTask={(id) => void handleDuplicateTask(id)}
            onDuplicateSector={(id) => void handleDuplicateSector(id)}
            onRemoveSector={(id) => void handleDeleteSector(id)}
            onAddActivityToSector={(id) => void handleAddActivityToSector(id)}
            onReorderActivityInSector={(sectorId, dir) =>
              void handleReorderActivityInSector(sectorId, dir)
            }
            onDuplicateActivity={(id) => void handleDuplicateActivity(id)}
            onRemoveActivity={(id) => void handleDeleteActivity(id)}
            onEditActivity={(id) => selectActivityForEdit(id)}
            serviceOptionAddOpen={serviceOptionAddOpen}
            setServiceOptionAddOpen={setServiceOptionAddOpen}
            serviceOptionNewName={serviceOptionNewName}
            setServiceOptionNewName={setServiceOptionNewName}
            serviceOptionNewDescription={serviceOptionNewDescription}
            setServiceOptionNewDescription={setServiceOptionNewDescription}
            onDropCatalogTask={(catalogTaskId, insertIndex) =>
              void handleCatalogDropAtPosition(catalogTaskId, insertIndex)
            }
          />
        }
      />
    ) : null

  const dadosBasicosContextBar = renderMatrixSelectionContextBar(false)

  const revisaoPainel =
    aggregateMaps ? (
      <div className="space-y-4 rounded-2xl border border-sgp-gold/25 bg-gradient-to-b from-sgp-gold/[0.07] to-black/20 p-4 shadow-inner ring-1 ring-white/[0.05]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sgp-gold/90">
            Resumo
          </p>
          <p className="mt-1 font-heading text-base font-semibold text-white">
            Antes de salvar
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Alterações ficam apenas locais até gravar na base.
          </p>
        </div>
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Tarefas</dt>
            <dd className="tabular-nums text-slate-100">
              {aggregateMaps.global.taskCount}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Setores</dt>
            <dd className="tabular-nums text-slate-100">
              {aggregateMaps.global.sectorCount}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Atividades</dt>
            <dd className="tabular-nums text-slate-100">
              {aggregateMaps.global.activityCount}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Min planejados</dt>
            <dd className="tabular-nums text-slate-100">
              {aggregateMaps.global.plannedMinutesSum}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Equipes dist.</dt>
            <dd className="tabular-nums text-slate-100">
              {aggregateMaps.global.linkedDistinctDefaultTeams}
            </dd>
          </div>
        </dl>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">
            Pendências
          </p>
          {revisaoLista.length === 0 ? (
            <p className="mt-1 text-xs text-emerald-200/90">
              Nenhum alerta adicional antes de gravar alterações estruturais ou de
              formulário.
            </p>
          ) : (
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-100/95">
              {revisaoLista.map((ln) => (
                <li key={ln}>{ln}</li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="sgp-cta-primary w-full"
          disabled={
            busy || (!matrixEditorHasUnsavedChanges && !matrixStructureDirty)
          }
          onClick={() => void handleSave()}
        >
          {busy ? 'A gravar…' : 'Salvar alterações'}
        </button>
      </div>
    ) : null

  const alterarTabsBase =
    'rounded-lg border px-3 py-2 text-xs font-semibold transition'
  const alterarTabCls = (tab: AlterarMatrizTab) =>
    activeTab === tab
      ? `${alterarTabsBase} border-sgp-gold/45 bg-sgp-gold/[0.12] text-sgp-gold-warm ring-1 ring-sgp-gold/20`
      : `${alterarTabsBase} border-white/[0.08] bg-black/25 text-slate-300 hover:bg-white/[0.06]`

  return (
    <PageCanvas>
      {toast && (
        <SgpToast
          fixed
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}

      <MatrixDuplicationWarningsBanner
        warnings={duplicationWarnings}
        onDismiss={() => setDuplicationWarnings([])}
      />

      <div className="space-y-3">
        {lastDeletedId ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50/95">
            <span>Última remoção pode ser desfeita.</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRestore()}
              className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-50 disabled:opacity-50"
            >
              Restaurar
            </button>
          </div>
        ) : null}

        {loadError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90"
          >
            {loadError}
          </div>
        ) : null}

        {loading && !tree ? (
          <p className="text-sm text-slate-500">Carregando…</p>
        ) : null}

        {tree && !loadError ? (
          <div className="mx-auto mt-4 max-w-[1600px] space-y-4 pb-12">
            <header className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-sgp-void via-sgp-navy-deep/80 to-sgp-void px-4 py-4 shadow-inner ring-1 ring-white/[0.04] sm:px-5">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
                <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" aria-hidden />
                Gestão
              </p>
              <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h1 className="sgp-page-title">Alterar matriz</h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-300">
                    Revise dados, estrutura e responsáveis antes de salvar as alterações.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handlePreview()}
                    className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-3 py-1.5 text-sm font-semibold text-sgp-gold/95 transition hover:border-sgp-gold/50 hover:bg-sgp-gold/15 disabled:opacity-50"
                  >
                    Pré-visualizar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => requestNavigateWithTransientGuard('/app/matrizes-operacao')}
                    className="rounded-lg border border-white/12 px-3 py-1.5 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    Fechar
                  </button>
                </div>
              </div>
              <nav
                aria-label="Seções da alteração da matriz"
                className="mt-4 flex flex-wrap gap-2"
              >
                <button
                  type="button"
                  className={alterarTabCls('dados')}
                  aria-current={activeTab === 'dados' ? 'step' : undefined}
                  onClick={() => selectAlterarMatrizTab('dados')}
                >
                  Dados Básicos
                </button>
                <button
                  type="button"
                  className={alterarTabCls('estrutura')}
                  aria-current={activeTab === 'estrutura' ? 'step' : undefined}
                  onClick={() => selectAlterarMatrizTab('estrutura')}
                >
                  Estrutura
                </button>
                <button
                  type="button"
                  className={alterarTabCls('revisao')}
                  aria-current={activeTab === 'revisao' ? 'step' : undefined}
                  onClick={() => selectAlterarMatrizTab('revisao')}
                >
                  Revisão
                </button>
              </nav>
            </header>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleStructureDragEnd}
            >
              {activeTab === 'dados' && dadosBasicosContextBar ? (
                <div className="mt-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h2 className="font-heading text-sm font-semibold text-white">
                    Dados da oferta (ITEM)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Nome, código, descrição e situação ativa para o cliente. Na aba
                    «Estrutura», use «Campos da seleção» para formulários das tarefas,
                    setores e atividades.
                  </p>
                  <div className="mt-4 max-w-2xl">{dadosBasicosContextBar}</div>
                </div>
              ) : null}

              {activeTab === 'estrutura' && estruturaWorkbench ? (
                <div className="mt-2 min-w-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  {estruturaWorkbench}
                </div>
              ) : null}

              {activeTab === 'revisao' && revisaoPainel ? (
                <div className="mt-2 max-w-lg">{revisaoPainel}</div>
              ) : null}

              {activeTab === 'estrutura' &&
              !estruturaWorkbench &&
              !loadError ? (
                <p className="text-sm text-slate-500">Carregando estrutura…</p>
              ) : null}
            </DndContext>

            {activeTab === 'estrutura' && estruturaDrawerOpen ? (
              <div
                className="fixed inset-0 z-[100] flex justify-end bg-black/45 p-2 sm:p-4"
                role="presentation"
              >
                <button
                  type="button"
                  aria-label="Fechar painel de seleção"
                  className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
                  onClick={() => setEstruturaDrawerOpen(false)}
                />
                <aside
                  className="relative z-[1] mt-auto flex h-[min(92dvh,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-sgp-void shadow-2xl sm:mt-0 sm:h-full sm:max-h-[min(88dvh,calc(100dvh-4rem))] sm:rounded-l-2xl sm:rounded-r-xl"
                  aria-label="Campos e composição da seleção"
                >
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
                    <h2 className="font-heading text-sm font-semibold text-white">
                      Campos da seleção
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEstruturaDrawerOpen(false)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-width:thin]">
                    {renderMatrixSelectionContextBar(true) ?? (
                      <p className="text-xs text-slate-500">
                        Sem painel contextual para a seleção atual.
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageCanvas>
  )
}
