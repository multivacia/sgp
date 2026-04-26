import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import { reportClientError } from '../../lib/errors'
import {
  getMatrixTree,
  isApiNotFound,
} from '../../services/operation-matrix/operationMatrixApiService'
import { getCollaboratorsService } from '../../services/collaborators/collaboratorsServiceFactory'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import { buildMatrixTreeAggregateMaps } from './matrixTreeAggregates'
import {
  buildOperationMatrixMacroPreviewModel,
  type OperationMatrixMacroPreviewModel,
} from './operationMatrixPreviewMapper'
import {
  readPreviewSnapshotFromSession,
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

export function useOperationMatrixPreview(params: {
  itemId: string | undefined
  draftToken: string | null
}) {
  const { pathname } = useLocation()
  const { itemId, draftToken } = params
  const [treeState, setTreeState] = useState<TreeState>({ status: 'loading' })
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const svc = getCollaboratorsService()
        const list = await svc.listCollaborators({
          status: 'active',
          search: undefined,
        })
        if (!cancelled) setCollaborators(list)
      } catch {
        if (!cancelled) setCollaborators([])
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
      setTreeState({ status: 'error', message: 'Matriz não encontrada.' })
      return
    }

    const id = itemId
    let cancelled = false

    async function run() {
      setTreeState({ status: 'loading' })

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

  const model: OperationMatrixMacroPreviewModel | null = useMemo(() => {
    if (treeState.status !== 'ready') return null
    const maps = buildMatrixTreeAggregateMaps(
      treeState.tree,
      collaboratorIdSet,
    )
    return buildOperationMatrixMacroPreviewModel(
      treeState.tree,
      maps.global,
      collaboratorIdToName,
    )
  }, [treeState, collaboratorIdSet, collaboratorIdToName])

  const source: PreviewDataSource | null =
    treeState.status === 'ready' ? treeState.source : null

  return {
    treeState,
    model,
    source,
  }
}
