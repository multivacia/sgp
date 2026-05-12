import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import { reportClientError } from '../../lib/errors'
import {
  getMatrixTree,
  isApiNotFound,
  patchMatrixNode,
} from '../../services/operation-matrix/operationMatrixApiService'
import { getCollaboratorsService } from '../../services/collaborators/collaboratorsServiceFactory'
import { buildMatrixTreeAggregateMaps } from './matrixTreeAggregates'
import {
  buildOperationMatrixMacroPreviewModel,
  type OperationMatrixMacroPreviewModel,
} from './operationMatrixPreviewMapper'
import {
  activityFieldsSignature,
  collectActivityFieldDiffs,
  patchActivityFieldsInTreeClone,
  validatePreviewActivityTree,
} from './operationMatrixPreviewEdits'
import {
  deepCloneMatrixTree,
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
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [collaboratorsLoadFailed, setCollaboratorsLoadFailed] = useState(false)

  const [workingTree, setWorkingTree] = useState<MatrixNodeTreeApi | null>(null)
  const [baselineActivitySig, setBaselineActivitySig] = useState('')

  const [saveState, setSaveState] = useState<PreviewSaveState>('idle')
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const svc = getCollaboratorsService()
        const list = await svc.listCollaborators({
          status: 'active',
          search: undefined,
        })
        if (!cancelled) {
          setCollaborators(list)
          setCollaboratorsLoadFailed(false)
        }
      } catch {
        if (!cancelled) {
          setCollaborators([])
          setCollaboratorsLoadFailed(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const collaboratorIdSet = useMemo(
    () => new Set(collaborators.map((c) => c.id)),
    [collaborators],
  )

  const collaboratorIdToName = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of collaborators) m.set(c.id, c.fullName)
    return m
  }, [collaborators])

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
    } else {
      const w = deepCloneMatrixTree(readyTree)
      setWorkingTree(w)
      setBaselineActivitySig(activityFieldsSignature(w))
    }
  }

  const isDirty = useMemo(() => {
    if (!workingTree || baselineActivitySig === '') return false
    return activityFieldsSignature(workingTree) !== baselineActivitySig
  }, [workingTree, baselineActivitySig])

  const model: OperationMatrixMacroPreviewModel | null = useMemo(() => {
    if (!workingTree || treeState.status !== 'ready') return null
    const maps = buildMatrixTreeAggregateMaps(workingTree, collaboratorIdSet)
    return buildOperationMatrixMacroPreviewModel(
      workingTree,
      maps.global,
      collaboratorIdToName,
    )
  }, [workingTree, treeState, collaboratorIdSet, collaboratorIdToName])

  const source: PreviewDataSource | null =
    treeState.status === 'ready' ? treeState.source : null

  const applyActivityPatch = useCallback(
    (
      activityId: string,
      patch: Partial<{
        plannedMinutes: number | null
        defaultResponsibleId: string | null
      }>,
    ) => {
      setWorkingTree((prev) => {
        if (!prev) return prev
        const dbPatch: Partial<{
          planned_minutes: number | null
          default_responsible_id: string | null
        }> = {}
        if (patch.plannedMinutes !== undefined) {
          dbPatch.planned_minutes = patch.plannedMinutes
        }
        if (patch.defaultResponsibleId !== undefined) {
          dbPatch.default_responsible_id = patch.defaultResponsibleId
        }
        return patchActivityFieldsInTreeClone(prev, activityId, dbPatch)
      })
      setSaveState('idle')
      setSaveErrorMessage(null)
    },
    [],
  )

  const resetPreviewEdits = useCallback(() => {
    if (!readyTree) return
    setWorkingTree(deepCloneMatrixTree(readyTree))
    setSaveState('idle')
    setSaveErrorMessage(null)
  }, [readyTree])

  const savePreviewEdits = useCallback(async (): Promise<boolean> => {
    if (!itemId || !workingTree || treeState.status !== 'ready') return false

    const validation = validatePreviewActivityTree(workingTree)
    if (!validation.ok) {
      setSaveErrorMessage(validation.message)
      setSaveState('error')
      return false
    }

    setSaveState('saving')
    setSaveErrorMessage(null)

    const ts = treeState

    const persistApi = async () => {
      const baseline = ts.tree
      const diffs = collectActivityFieldDiffs(baseline, workingTree)
      for (const { id, patch } of diffs) {
        await patchMatrixNode(id, {
          plannedMinutes: patch.planned_minutes,
          defaultResponsibleId: patch.default_responsible_id,
        })
      }
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
        tree: deepCloneMatrixTree(workingTree),
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
  }, [draftToken, itemId, pathname, treeState, workingTree])

  return {
    treeState,
    model,
    source,
    workingTree,
    isDirty,
    applyActivityPatch,
    resetPreviewEdits,
    savePreviewEdits,
    saveState,
    saveErrorMessage,
    collaborators,
    collaboratorsLoadFailed,
  }
}
