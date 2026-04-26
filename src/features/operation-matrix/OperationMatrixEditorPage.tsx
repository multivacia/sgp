import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMatrixSuggestionCatalog } from '../../catalog/matrixSuggestion/matrixSuggestionCatalogCache'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { SgpToast, type SgpToastVariant } from '../../components/ui/SgpToast'
import type {
  MatrixNodeTreeApi,
  MatrixNodeType,
} from '../../domain/operation-matrix/operation-matrix.types'
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
  patchMatrixNode,
  reorderMatrixNode,
  restoreMatrixNode,
} from '../../services/operation-matrix/operationMatrixApiService'
import { getCollaboratorsService } from '../../services/collaborators/collaboratorsServiceFactory'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import type { Team } from '../../domain/teams/team.types'
import { listTeams } from '../../services/teams/teamsApiService'
import { MatrixTreeCompact } from './MatrixTreeCompact'
import { MatrixSelectionContextBar } from './MatrixSelectionContextBar'
import { OperationMatrixEditorWorkbench } from './OperationMatrixEditorWorkbench'
import { OperationMatrixMetricsStrip } from './OperationMatrixMetricsStrip'
import {
  buildMatrixTreeAggregateMaps,
  getBranchStats,
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

type ToastState = { message: string; variant: SgpToastVariant } | null

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

export function OperationMatrixEditorPage() {
  const { catalog: matrixSuggestionCatalog } = useMatrixSuggestionCatalog()
  const { itemId } = useParams<{ itemId: string }>()
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const navigate = useNavigate()
  const [tree, setTree] = useState<MatrixNodeTreeApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formPlanned, setFormPlanned] = useState('')
  const [formResponsible, setFormResponsible] = useState('')
  const [formTeamIds, setFormTeamIds] = useState<string[]>([])
  const [formRequired, setFormRequired] = useState(true)
  const [treeSearch, setTreeSearch] = useState('')
  const [debouncedTreeSearch, setDebouncedTreeSearch] = useState('')
  /** Rascunho do formulário «+ Adicionar opção» no catálogo (TASK sob ITEM). */
  const [serviceOptionAddOpen, setServiceOptionAddOpen] = useState(false)
  const [serviceOptionNewName, setServiceOptionNewName] = useState('')
  const [serviceOptionNewDescription, setServiceOptionNewDescription] =
    useState('')
  const [taskPanelMode, setTaskPanelMode] = useState<
    'composition' | 'editTaskMeta'
  >('composition')
  /** Etapa: formulário só após "Editar"; clique na linha = só seleção. */
  const [activityEditMode, setActivityEditMode] = useState(false)

  const collaboratorIdSet = useMemo(
    () => new Set(collaborators.map((c) => c.id)),
    [collaborators],
  )

  const collaboratorIdToName = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of collaborators) m.set(c.id, c.fullName)
    return m
  }, [collaborators])
  const teamIdSet = useMemo(() => new Set(teams.map((t) => t.id)), [teams])

  const aggregateMaps: MatrixTreeAggregateMaps | null = useMemo(() => {
    if (!tree) return null
    return buildMatrixTreeAggregateMaps(tree, collaboratorIdSet)
  }, [tree, collaboratorIdSet])

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

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedTreeSearch(treeSearch), 200)
    return () => window.clearTimeout(t)
  }, [treeSearch])

  const loadTree = useCallback(async (): Promise<MatrixNodeTreeApi | null> => {
    if (!itemId) return null
    setLoading(true)
    setLoadError(null)
    try {
      const t = await getMatrixTree(itemId)
      setTree(t)
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
      return null
    } finally {
      setLoading(false)
    }
  }, [itemId, pathname, presentBlocking])

  useEffect(() => {
    void loadTree()
  }, [loadTree])

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
      const fr = formResponsible.trim() || null
      const sr = selected.default_responsible_id ?? null
      if (fr !== sr) return true
      const selectedTeamIds = [...(selected.team_ids ?? [])].sort()
      const formTeamIdsSorted = [...formTeamIds].sort()
      if (selectedTeamIds.join('|') !== formTeamIdsSorted.join('|')) return true
      if (formRequired !== selected.required) return true
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
    formResponsible,
    formTeamIds,
    formRequired,
  ])

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

  const compositionTask = useMemo(() => {
    if (!tree || !selectedId || !selected) return null
    if (selected.node_type === 'TASK') return selected
    if (selected.node_type === 'ITEM') return null
    const tid = findAncestorTaskId(selectedId, parentMap, nodeTypeMap)
    if (!tid) return null
    return findNodeInTree(tree, tid)
  }, [tree, selected, selectedId, parentMap, nodeTypeMap])

  /** Área (SECTOR) em foco para Subir/Descer: só quando a área está selecionada na composição. */
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
    setFormResponsible(node.default_responsible_id ?? '')
    setFormTeamIds([...(node.team_ids ?? [])])
    setFormRequired(node.required)
  }, [])

  useEffect(() => {
    if (!selected) return
    applyFormFromNode(selected)
  }, [selected, applyFormFromNode])

  useRegisterTransientContext({
    id: 'operation-matrix-editor',
    isDirty: () => matrixEditorHasUnsavedChanges || serviceOptionDraftDirty,
    onReset: () => {
      if (selected) applyFormFromNode(selected)
      setServiceOptionAddOpen(false)
      setServiceOptionNewName('')
      setServiceOptionNewDescription('')
    },
  })

  const selectedBranchStats = useMemo(() => {
    if (!aggregateMaps || !selectedId) return null
    return getBranchStats(aggregateMaps, selectedId)
  }, [aggregateMaps, selectedId])

  const responsibleIsOrphan = useMemo(() => {
    const id = formResponsible.trim()
    if (!id) return false
    return !collaboratorIdSet.has(id)
  }, [formResponsible, collaboratorIdSet])

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
    if (!selected) return
    setBusy(true)
    try {
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
        patch.defaultResponsibleId = formResponsible.trim() || null
        patch.teamIds = [...new Set(formTeamIds)]
        patch.required = formRequired
      }
      await patchMatrixNode(selected.id, patch)
      pushToast('Alterações salvas.')
      await loadTree()
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
        `Remover a opção de serviço "${node.name}" e toda a sua composição? Esta ação é lógica e pode ser desfeita com Restaurar.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await deleteMatrixNode(taskId)
      setLastDeletedId(taskId)
      pushToast('Opção removida.')
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
      pushToast('Informe o nome da opção.', 'error')
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
      pushToast('Opção de serviço criada.')
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
    setBusy(true)
    try {
      await duplicateMatrixNode(sectorId)
      pushToast('Área duplicada.')
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
        name: 'Nova etapa',
        isActive: true,
      })
      pushToast('Etapa criada.')
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

  async function handleReorderActivityInSector(
    sectorId: string,
    dir: 'up' | 'down',
  ) {
    if (!tree || !selectedId) return
    const sel = findNodeInTree(tree, selectedId)
    if (!sel || sel.node_type !== 'ACTIVITY' || sel.parent_id !== sectorId) {
      return
    }
    const parent = findNodeInTree(tree, sectorId)
    if (!parent || parent.node_type !== 'SECTOR') return
    const siblings = parent.children
      .filter((c) => c.node_type === 'ACTIVITY')
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
    const idx = siblings.findIndex((s) => s.id === selectedId)
    if (idx < 0) return
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === siblings.length - 1) return
    setBusy(true)
    try {
      await reorderMatrixNode(selectedId, dir)
      await loadTree()
    } catch (e) {
      matrixOpError(e, 'matrix_editor_reorder_activity')
    } finally {
      setBusy(false)
    }
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
    setBusy(true)
    try {
      await duplicateMatrixNode(activityId)
      pushToast('Etapa duplicada.')
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
        `Remover a etapa "${node.name}"? Esta ação é lógica e pode ser desfeita com Restaurar.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await deleteMatrixNode(activityId)
      setLastDeletedId(activityId)
      pushToast('Etapa removida.')
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

  async function handleReorderSector(sectorId: string, dir: 'up' | 'down') {
    if (!tree) return
    const sector = findNodeInTree(tree, sectorId)
    if (!sector || sector.node_type !== 'SECTOR' || !sector.parent_id) return
    const siblings = findNodeInTree(tree, sector.parent_id)?.children.filter(
      (c) => c.node_type === 'SECTOR',
    )
    if (!siblings?.length) return
    const ordered = siblings
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
    const idx = ordered.findIndex((s) => s.id === sectorId)
    if (idx < 0) return
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === ordered.length - 1) return
    setBusy(true)
    try {
      await reorderMatrixNode(sectorId, dir)
      await loadTree()
    } catch (e) {
      matrixOpError(e, 'matrix_editor_reorder_sector')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteSector(sectorId: string) {
    if (!tree) return
    const sector = findNodeInTree(tree, sectorId)
    if (!sector || sector.node_type !== 'SECTOR') return
    if (
      !window.confirm(
        `Remover a área "${sector.name}" e todas as etapas? Esta ação é lógica e pode ser desfeita com Restaurar.`,
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
      pushToast('Área removida.')
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
    setBusy(true)
    try {
      await duplicateMatrixNode(taskId)
      pushToast('Duplicado.')
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

  async function handleReorder(dir: 'up' | 'down') {
    if (!selected) return
    setBusy(true)
    try {
      await reorderMatrixNode(selected.id, dir)
      await loadTree()
    } catch (e) {
      matrixOpError(e, 'matrix_editor_reorder_node')
    } finally {
      setBusy(false)
    }
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
      formResponsible,
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

      {tree && !loadError && aggregateMaps ? (
        <OperationMatrixEditorWorkbench
          metricsStrip={
            <OperationMatrixMetricsStrip global={aggregateMaps.global} />
          }
          stripEnd={
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => handlePreview()}
                className="rounded-lg border border-sgp-gold/35 bg-sgp-gold/10 px-3 py-1.5 text-sm font-semibold text-sgp-gold/95 transition hover:border-sgp-gold/50 hover:bg-sgp-gold/15 disabled:opacity-50"
              >
                Pré-visualizar
              </button>
              <Link
                to="/app/matrizes-operacao"
                className="rounded-lg border border-white/12 px-3 py-1.5 text-sm font-medium text-white/80 no-underline transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                Voltar à lista
              </Link>
            </>
          }
          searchValue={treeSearch}
          onSearchChange={setTreeSearch}
          leftColumn={
            <MatrixTreeCompact
              tree={tree}
              parentMap={parentMap}
              selectedId={selectedId}
              selected={selected}
              onSelectTaskComposition={selectTaskComposition}
              onSelectTaskEditMeta={selectTaskEditMeta}
              aggregateMaps={aggregateMaps}
              searchQuery={debouncedTreeSearch}
              matchIds={searchMatchIds}
              busy={busy}
              onReorder={(dir) => void handleReorder(dir)}
              onAddServiceOption={(name, description) =>
                void handleAddServiceOption(name, description)
              }
              onRemoveTaskFromCatalog={(id) =>
                void handleDeleteTaskFromCatalog(id)
              }
              onDuplicateTask={(id) => void handleDuplicateTask(id)}
              serviceOptionAddOpen={serviceOptionAddOpen}
              setServiceOptionAddOpen={setServiceOptionAddOpen}
              serviceOptionNewName={serviceOptionNewName}
              setServiceOptionNewName={setServiceOptionNewName}
              serviceOptionNewDescription={serviceOptionNewDescription}
              setServiceOptionNewDescription={setServiceOptionNewDescription}
              optionCatalogEntries={matrixSuggestionCatalog.options}
            />
          }
          rightColumn={
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
              formResponsible={formResponsible}
              setFormResponsible={setFormResponsible}
              formTeamIds={formTeamIds}
              setFormTeamIds={setFormTeamIds}
              formRequired={formRequired}
              setFormRequired={setFormRequired}
              collaborators={collaborators}
              teams={teams}
              collaboratorIdSet={collaboratorIdSet}
              teamIdSet={teamIdSet}
              responsibleIsOrphan={responsibleIsOrphan}
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
              collaboratorIdToName={collaboratorIdToName}
              selectedId={selectedId}
              activePathIds={activePathIds}
              onSelectNode={selectTaskComposition}
              searchQuery={debouncedTreeSearch}
              matchIds={searchMatchIds}
              taskPanelMode={taskPanelMode}
              onDuplicateSector={(id) => void handleDuplicateSector(id)}
              onRemoveSector={(id) => void handleDeleteSector(id)}
              onAddActivityToSector={(id) =>
                void handleAddActivityToSector(id)
              }
              onReorderActivityInSector={(sectorId, dir) =>
                void handleReorderActivityInSector(sectorId, dir)
              }
              onDuplicateActivity={(id) => void handleDuplicateActivity(id)}
              onRemoveActivity={(id) => void handleDeleteActivity(id)}
              activityEditMode={activityEditMode}
              onEditActivity={(id) => selectActivityForEdit(id)}
              onCompositionSectorReorder={(dir) => {
                if (compositionFocusSectorId) {
                  void handleReorderSector(compositionFocusSectorId, dir)
                }
              }}
              compositionSectorReorderUpDisabled={
                compositionSectorReorderUpDisabled
              }
              compositionSectorReorderDownDisabled={
                compositionSectorReorderDownDisabled
              }
              matrixSuggestionCatalog={matrixSuggestionCatalog}
            />
          }
        />
      ) : null}
      </div>
    </PageCanvas>
  )
}
