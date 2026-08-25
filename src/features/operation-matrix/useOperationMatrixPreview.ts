import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type { Team } from '../../domain/teams/team.types'
import { reportClientError } from '../../lib/errors'
import {
  createMatrixNode,
  deleteMatrixNode,
  getMatrixTree,
  isApiNotFound,
  patchMatrixNode,
} from '../../services/operation-matrix/operationMatrixApiService'
import { listTeamMembers, listTeams } from '../../services/teams/teamsApiService'
import { buildMatrixTreeAggregateMaps } from './matrixTreeAggregates'
import {
  eligibleResponsibleIdsFromMembers,
  reconcileResponsibleWhenMembersReady,
  resolveActivityTeamAndResponsiblePatch,
  type PreviewTeamMembersState,
} from './matrixPreviewResponsibleLogic'
import {
  buildOperationMatrixMacroPreviewModel,
  type OperationMatrixMacroPreviewModel,
} from './operationMatrixPreviewMapper'
import {
  activityFieldsSignature,
  isPreviewWorkingTreeDirty,
  patchActivityFieldsInTreeClone,
  patchNodeNameInTreeClone,
  structureNamesSignature,
  validatePreviewActivityTree,
} from './operationMatrixPreviewEdits'
import {
  reorderSiblingsRelativeToOver,
  snapshotOrderMap,
} from './matrixStructureReorder'
import { createInlineNameSaveRegistry } from './macroPreviewInlineNameSave'
import {
  appendPreviewPendingStructureNode,
  removePreviewStructureNode,
} from './operationMatrixPreviewStructureCreate'
import { persistOperationMatrixPreviewToApi } from './operationMatrixPreviewPersist'
import {
  deepCloneMatrixTree,
  findNodeInTree,
  readPreviewSnapshotFromSession,
  writePreviewSnapshotToSession,
  OPERATION_MATRIX_PREVIEW_SNAPSHOT_VERSION,
  type OperationMatrixPreviewSnapshot,
} from './operationMatrixPreviewSnapshot'

export type PreviewDataSource = 'draft' | 'api' | 'draft_fallback_api'

type TreeState =
  | { status: 'loading' }
  | {
      status: 'ready'
      tree: MatrixNodeTreeApi
      source: PreviewDataSource
    }
  | { status: 'error'; message: string }

export type PreviewSaveState = 'idle' | 'saving' | 'error'

export function useOperationMatrixPreview(params: {
  itemId: string | undefined
  draftToken: string | null
}) {
  const { pathname } = useLocation()
  const { itemId, draftToken } = params
  const [treeState, setTreeState] = useState<TreeState>({ status: 'loading' })
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoadFailed, setTeamsLoadFailed] = useState(false)
  const [membersByTeam, setMembersByTeam] = useState<
    Record<string, PreviewTeamMembersState>
  >({})
  const membersByTeamRef = useRef(membersByTeam)
  membersByTeamRef.current = membersByTeam

  const [workingTree, setWorkingTree] = useState<MatrixNodeTreeApi | null>(null)
  const workingTreeRef = useRef<MatrixNodeTreeApi | null>(null)
  const inlineNameSaveRegistry = useMemo(() => createInlineNameSaveRegistry(), [])
  const [baselineActivitySig, setBaselineActivitySig] = useState('')
  const [baselineNamesSig, setBaselineNamesSig] = useState('')

  const [saveState, setSaveState] = useState<PreviewSaveState>('idle')
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)
  const [bornInEditNodeId, setBornInEditNodeId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await listTeams({ isActive: 'all', limit: 200, offset: 0 })
        if (cancelled) return
        setTeams(res.items)
        setTeamsLoadFailed(false)
      } catch {
        if (!cancelled) {
          setTeams([])
          setTeamsLoadFailed(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const teamIdSet = useMemo(() => new Set(teams.map((t) => t.id)), [teams])

  const teamIdToName = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of teams) m.set(t.id, t.name)
    return m
  }, [teams])

  const ensureTeamMembers = useCallback((teamId: string) => {
    const tid = teamId.trim()
    if (!tid) return
    const cur = membersByTeamRef.current[tid]
    if (cur?.status === 'loading' || cur?.status === 'ready') return

    setMembersByTeam((prev) => ({ ...prev, [tid]: { status: 'loading' } }))
    void listTeamMembers(tid)
      .then((members) => {
        setMembersByTeam((prev) => ({
          ...prev,
          [tid]: { status: 'ready', members },
        }))
      })
      .catch(() => {
        setMembersByTeam((prev) => ({
          ...prev,
          [tid]: { status: 'error' },
        }))
      })
  }, [])

  const retryTeamMembers = useCallback((teamId: string) => {
    const tid = teamId.trim()
    if (!tid) return
    setMembersByTeam((prev) => ({ ...prev, [tid]: { status: 'loading' } }))
    void listTeamMembers(tid)
      .then((members) => {
        setMembersByTeam((prev) => ({
          ...prev,
          [tid]: { status: 'ready', members },
        }))
      })
      .catch(() => {
        setMembersByTeam((prev) => ({
          ...prev,
          [tid]: { status: 'error' },
        }))
      })
  }, [])

  useEffect(() => {
    if (!itemId) {
      queueMicrotask(() => {
        setTreeState({ status: 'error', message: 'Matriz não encontrada.' })
      })
      return
    }

    const id = itemId
    let cancelled = false

    async function run() {
      setTreeState({ status: 'loading' })
      setSaveState('idle')
      setSaveErrorMessage(null)

      let snapshot: OperationMatrixPreviewSnapshot | null = null
      if (draftToken) {
        snapshot = readPreviewSnapshotFromSession(draftToken)
      }

      if (snapshot && snapshot.itemId === id) {
        if (!cancelled) {
          setTreeState({
            status: 'ready',
            tree: snapshot.tree,
            source: 'draft',
          })
        }
        return
      }

      if (draftToken) {
        try {
          const t = await getMatrixTree(id)
          if (cancelled) return
          setTreeState({
            status: 'ready',
            tree: t,
            source: 'draft_fallback_api',
          })
        } catch (e) {
          if (cancelled) return
          if (isApiNotFound(e)) {
            setTreeState({ status: 'error', message: 'Matriz não encontrada.' })
          } else {
            const n = reportClientError(e, {
              module: 'operation-matrix',
              action: 'preview_load_tree',
              route: pathname,
              entityId: id,
            })
            setTreeState({ status: 'error', message: n.userMessage })
          }
        }
        return
      }

      try {
        const t = await getMatrixTree(id)
        if (cancelled) return
        setTreeState({ status: 'ready', tree: t, source: 'api' })
      } catch (e) {
        if (cancelled) return
        if (isApiNotFound(e)) {
          setTreeState({ status: 'error', message: 'Matriz não encontrada.' })
        } else {
          const n = reportClientError(e, {
            module: 'operation-matrix',
            action: 'preview_load_tree',
            route: pathname,
            entityId: id,
          })
          setTreeState({ status: 'error', message: n.userMessage })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [itemId, draftToken, pathname])

  const readyTree = treeState.status === 'ready' ? treeState.tree : null

  const lastReadyTreeRef = useRef<MatrixNodeTreeApi | null | undefined>(undefined)
  if (lastReadyTreeRef.current !== readyTree) {
    lastReadyTreeRef.current = readyTree ?? null
    if (!readyTree) {
      if (workingTree !== null) {
        setWorkingTree(null)
      }
      if (baselineActivitySig !== '') {
        setBaselineActivitySig('')
      }
      if (baselineNamesSig !== '') {
        setBaselineNamesSig('')
      }
    } else {
      const w = deepCloneMatrixTree(readyTree)
      setWorkingTree(w)
      setBaselineActivitySig(activityFieldsSignature(w))
      setBaselineNamesSig(structureNamesSignature(w))
    }
  }

  const isDirty = useMemo(() => {
    if (!workingTree || !readyTree || baselineActivitySig === '' || baselineNamesSig === '') {
      return false
    }
    return isPreviewWorkingTreeDirty(
      workingTree,
      baselineActivitySig,
      snapshotOrderMap(readyTree),
      baselineNamesSig,
    )
  }, [workingTree, baselineActivitySig, baselineNamesSig, readyTree])

  workingTreeRef.current = workingTree

  // Prefetch membros das equipes usadas nas atividades (cache por equipe).
  useEffect(() => {
    if (!workingTree) return
    const teamIds = new Set<string>()
    const walk = (n: MatrixNodeTreeApi) => {
      if (n.node_type === 'ACTIVITY') {
        const tid = n.team_ids?.[0]?.trim()
        if (tid) teamIds.add(tid)
      }
      for (const c of n.children) walk(c)
    }
    walk(workingTree)
    for (const tid of teamIds) ensureTeamMembers(tid)
  }, [workingTree, ensureTeamMembers])

  // Após membros ready: limpa responsável incompatível (sem limpar enquanto loading).
  useEffect(() => {
    const readyEntries = Object.entries(membersByTeam).filter(
      (entry): entry is [string, Extract<PreviewTeamMembersState, { status: 'ready' }>] =>
        entry[1].status === 'ready',
    )
    if (readyEntries.length === 0) return

    const eligibleByTeam = new Map<string, Set<string>>()
    for (const [tid, state] of readyEntries) {
      eligibleByTeam.set(tid, eligibleResponsibleIdsFromMembers(state.members))
    }

    setWorkingTree((prev) => {
      if (!prev) return prev
      const clearIds: string[] = []
      const walk = (n: MatrixNodeTreeApi) => {
        if (n.node_type === 'ACTIVITY') {
          const tid = n.team_ids?.[0]?.trim() || null
          const resp = n.default_responsible_id ?? null
          if (tid && resp) {
            const eligible = eligibleByTeam.get(tid)
            if (eligible) {
              const nextResp = reconcileResponsibleWhenMembersReady({
                teamId: tid,
                currentResponsibleId: resp,
                eligibleMemberIds: eligible,
              })
              if (nextResp !== resp) clearIds.push(n.id)
            }
          }
        }
        for (const c of n.children) walk(c)
      }
      walk(prev)
      if (clearIds.length === 0) return prev
      let next = prev
      for (const id of clearIds) {
        next = patchActivityFieldsInTreeClone(next, id, {
          default_responsible_id: null,
        })
      }
      return next
    })
  }, [membersByTeam])

  const model: OperationMatrixMacroPreviewModel | null = useMemo(() => {
    if (!workingTree || treeState.status !== 'ready') return null
    const maps = buildMatrixTreeAggregateMaps(workingTree, teamIdSet)
    return buildOperationMatrixMacroPreviewModel(
      workingTree,
      maps.global,
      teamIdToName,
    )
  }, [workingTree, treeState, teamIdSet, teamIdToName])

  const source: PreviewDataSource | null =
    treeState.status === 'ready' ? treeState.source : null

  const applyActivityPatch = useCallback(
    (
      activityId: string,
      patch: Partial<{
        plannedMinutes: number | null
        teamIds: string[]
        defaultResponsibleId: string | null
      }>,
    ) => {
      setWorkingTree((prev) => {
        if (!prev) return prev
        const node = findNodeInTree(prev, activityId)
        if (!node || node.node_type !== 'ACTIVITY') return prev

        const dbPatch: Partial<{
          planned_minutes: number | null
          team_ids: string[]
          default_responsible_id: string | null
        }> = {}

        if (patch.plannedMinutes !== undefined) {
          dbPatch.planned_minutes = patch.plannedMinutes
        }

        if (patch.teamIds !== undefined) {
          const previousTeamId = node.team_ids?.[0]?.trim() || null
          const nextTeamId = patch.teamIds[0]?.trim() || null
          const currentResponsibleId =
            patch.defaultResponsibleId !== undefined
              ? patch.defaultResponsibleId
              : (node.default_responsible_id ?? null)

          if (nextTeamId) {
            queueMicrotask(() => ensureTeamMembers(nextTeamId))
          }

          const resolved = resolveActivityTeamAndResponsiblePatch({
            previousTeamId,
            nextTeamId,
            currentResponsibleId,
          })
          dbPatch.team_ids = resolved.teamIds
          dbPatch.default_responsible_id = resolved.defaultResponsibleId
        } else if (patch.defaultResponsibleId !== undefined) {
          dbPatch.default_responsible_id = patch.defaultResponsibleId
        }

        const next = patchActivityFieldsInTreeClone(prev, activityId, dbPatch)
        workingTreeRef.current = next
        return next
      })
      setSaveState('idle')
      setSaveErrorMessage(null)
    },
    [ensureTeamMembers],
  )

  const applyNodeNamePatch = useCallback((nodeId: string, name: string) => {
    setWorkingTree((prev) => {
      if (!prev) return prev
      const next = patchNodeNameInTreeClone(prev, nodeId, name)
      workingTreeRef.current = next
      return next
    })
    setSaveState('idle')
    setSaveErrorMessage(null)
  }, [])

  const consumeBornInEditNode = useCallback((nodeId: string) => {
    setBornInEditNodeId((current) => (current === nodeId ? null : current))
  }, [])

  const cancelPreviewPendingNode = useCallback((nodeId: string) => {
    setWorkingTree((prev) => {
      if (!prev) return prev
      const next = removePreviewStructureNode(prev, nodeId)
      workingTreeRef.current = next
      return next
    })
    setBornInEditNodeId((current) => (current === nodeId ? null : current))
    setSaveState('idle')
    setSaveErrorMessage(null)
  }, [])

  const removePreviewStructureNodeLocal = useCallback((nodeId: string) => {
    setWorkingTree((prev) => {
      if (!prev) return prev
      const next = removePreviewStructureNode(prev, nodeId)
      workingTreeRef.current = next
      return next
    })
    setBornInEditNodeId((current) => (current === nodeId ? null : current))
    setSaveState('idle')
    setSaveErrorMessage(null)
  }, [])

  const addPreviewTask = useCallback((): string | null => {
    let createdId: string | null = null
    setWorkingTree((prev) => {
      if (!prev || prev.node_type !== 'ITEM') return prev
      const appended = appendPreviewPendingStructureNode(prev, prev.id, 'TASK')
      if (!appended) return prev
      createdId = appended.node.id
      return appended.tree
    })
    if (createdId) setBornInEditNodeId(createdId)
    setSaveState('idle')
    setSaveErrorMessage(null)
    return createdId
  }, [])

  const addPreviewSector = useCallback((taskId: string) => {
    let createdId: string | null = null
    setWorkingTree((prev) => {
      if (!prev) return prev
      const appended = appendPreviewPendingStructureNode(prev, taskId, 'SECTOR')
      if (!appended) return prev
      createdId = appended.node.id
      return appended.tree
    })
    if (createdId) setBornInEditNodeId(createdId)
    setSaveState('idle')
    setSaveErrorMessage(null)
    return createdId
  }, [])

  const addPreviewActivity = useCallback((taskId: string, sectorId: string) => {
    let createdId: string | null = null
    setWorkingTree((prev) => {
      if (!prev) return prev
      const sector = findNodeInTree(prev, sectorId)
      if (!sector || sector.node_type !== 'SECTOR' || sector.parent_id !== taskId) return prev
      const appended = appendPreviewPendingStructureNode(prev, sectorId, 'ACTIVITY')
      if (!appended) return prev
      createdId = appended.node.id
      return appended.tree
    })
    if (createdId) setBornInEditNodeId(createdId)
    setSaveState('idle')
    setSaveErrorMessage(null)
    return createdId
  }, [])

  const resetPreviewEdits = useCallback(() => {
    if (!readyTree) return
    setWorkingTree(deepCloneMatrixTree(readyTree))
    setBornInEditNodeId(null)
    setSaveState('idle')
    setSaveErrorMessage(null)
  }, [readyTree])

  const reorderPreviewTasks = useCallback((activeId: string, overId: string) => {
    setWorkingTree((prev) => {
      if (!prev) return prev
      const next = reorderSiblingsRelativeToOver(prev, activeId, overId)
      return next ?? prev
    })
    setSaveState('idle')
    setSaveErrorMessage(null)
  }, [])

  const reorderPreviewSectors = useCallback(
    (taskId: string, activeSectorId: string, overSectorId: string) => {
      setWorkingTree((prev) => {
        if (!prev) return prev
        const active = findNodeInTree(prev, activeSectorId)
        const over = findNodeInTree(prev, overSectorId)
        if (!active || !over || active.node_type !== 'SECTOR' || over.node_type !== 'SECTOR') {
          return prev
        }
        if (active.parent_id !== taskId || over.parent_id !== taskId) return prev
        const next = reorderSiblingsRelativeToOver(prev, activeSectorId, overSectorId)
        return next ?? prev
      })
      setSaveState('idle')
      setSaveErrorMessage(null)
    },
    [],
  )

  const reorderPreviewActivities = useCallback(
    (
      taskId: string,
      sectorId: string,
      activeActivityId: string,
      overActivityId: string,
    ) => {
      setWorkingTree((prev) => {
        if (!prev) return prev
        const active = findNodeInTree(prev, activeActivityId)
        const over = findNodeInTree(prev, overActivityId)
        if (!active || !over || active.node_type !== 'ACTIVITY' || over.node_type !== 'ACTIVITY') {
          return prev
        }
        if (active.parent_id !== sectorId || over.parent_id !== sectorId) return prev
        const sector = findNodeInTree(prev, sectorId)
        if (!sector || sector.node_type !== 'SECTOR' || sector.parent_id !== taskId) return prev
        const next = reorderSiblingsRelativeToOver(prev, activeActivityId, overActivityId)
        return next ?? prev
      })
      setSaveState('idle')
      setSaveErrorMessage(null)
    },
    [],
  )

  const savePreviewEdits = useCallback(async (): Promise<boolean> => {
    if (!itemId || treeState.status !== 'ready') return false
    if (!workingTreeRef.current) return false

    const commitResult = inlineNameSaveRegistry.commitAllForSave()
    if (!commitResult.ok) {
      setSaveErrorMessage(commitResult.message)
      setSaveState('error')
      return false
    }

    const treeToSave = workingTreeRef.current
    if (!treeToSave) return false

    const validation = validatePreviewActivityTree(treeToSave)
    if (!validation.ok) {
      setSaveErrorMessage(validation.message)
      setSaveState('error')
      return false
    }

    const ts = treeState

    setSaveState('saving')
    setSaveErrorMessage(null)

    const persistApi = async () => {
      const baseline = ts.tree
      await persistOperationMatrixPreviewToApi(baseline, treeToSave, {
        createNode: createMatrixNode,
        patchNode: patchMatrixNode,
        deleteNode: deleteMatrixNode,
      })
      const fresh = await getMatrixTree(itemId)
      setTreeState({
        status: 'ready',
        tree: fresh,
        source:
          ts.source === 'draft_fallback_api' ? 'draft_fallback_api' : 'api',
      })
    }

    const persistDraftSession = () => {
      if (!draftToken) {
        throw new Error('draftToken ausente')
      }
      const snapshot: OperationMatrixPreviewSnapshot = {
        schemaVersion: OPERATION_MATRIX_PREVIEW_SNAPSHOT_VERSION,
        itemId,
        tree: deepCloneMatrixTree(treeToSave),
        capturedAt: new Date().toISOString(),
      }
      const wr = writePreviewSnapshotToSession(draftToken, snapshot)
      if (!wr.ok) {
        throw new Error(
          wr.reason === 'quota'
            ? 'Armazenamento da sessão cheio. Libere espaço ou feche outros separadores.'
            : 'Não foi possível gravar a pré-visualização na sessão.',
        )
      }
      setTreeState({
        status: 'ready',
        tree: snapshot.tree,
        source: 'draft',
      })
    }

    try {
      if (ts.source === 'draft') {
        persistDraftSession()
      } else {
        await persistApi()
      }
      setSaveState('idle')
      return true
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : 'Não foi possível salvar as alterações.'
      const n = reportClientError(e, {
        module: 'operation-matrix',
        action: 'preview_save_activity_fields',
        route: pathname,
        entityId: itemId,
      })
      setSaveErrorMessage(n.userMessage || msg)
      setSaveState('error')
      return false
    }
  }, [draftToken, itemId, inlineNameSaveRegistry, pathname, treeState])

  return {
    treeState,
    model,
    source,
    workingTree,
    isDirty,
    applyActivityPatch,
    applyNodeNamePatch,
    addPreviewTask,
    addPreviewSector,
    addPreviewActivity,
    cancelPreviewPendingNode,
    removePreviewStructureNodeLocal,
    bornInEditNodeId,
    consumeBornInEditNode,
    reorderPreviewTasks,
    reorderPreviewSectors,
    reorderPreviewActivities,
    resetPreviewEdits,
    savePreviewEdits,
    saveState,
    saveErrorMessage,
    inlineNameSaveRegistry,
    teams,
    teamsLoadFailed,
    membersByTeam,
    ensureTeamMembers,
    retryTeamMembers,
  }
}
