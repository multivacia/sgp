import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMatrixSuggestionCatalog } from '../../catalog/matrixSuggestion/matrixSuggestionCatalogCache'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { SgpToast, type SgpToastVariant } from '../../components/ui/SgpToast'
import {
  isBlockingSeverity,
  presentationPlan,
  reportClientError,
} from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { useShellFunction } from '../../lib/shell/shell-function-context'
import { useRegisterTransientContext } from '../../lib/shell/transient-context'
import type { Collaborator } from '../../domain/collaborators/collaborator.types'
import type { Team } from '../../domain/teams/team.types'
import { createCollaboratorsApiService } from '../../services/collaborators/collaboratorsApiService'
import { listTeams } from '../../services/teams/teamsApiService'
import {
  createMatrixNode,
  deleteMatrixNode,
  getMatrixTree,
  listMatrixItems,
} from '../../services/operation-matrix/operationMatrixApiService'
import { validateCatalogOpcoesDraftForSubmit } from './criar-matriz/catalogOpcaoDraftValidation'
import {
  cloneTaskSubtreeWithNewIds,
  type CatalogOpcaoDraftInstance,
} from './criar-matriz/cloneCatalogTaskSubtreeForDraft'
import { buildBlankCatalogOpcaoDraftInstance } from './criar-matriz/blankCatalogOpcaoDraft'
import { cloneTaskSubtreeUnderItem } from './criar-matriz/cloneMatrixTaskSubtree'
import { createManualOpcoesUnderItem } from './criar-matriz/createManualMatrixStructure'
import {
  manualStructureIsNonEmpty,
  validateManualOpcoesForSubmit,
  type CriarMatrizManualOpcao,
} from './criar-matriz/criarMatrizManualDraft'
import { NovaMatrizCreateTotemShell } from './criar-matriz/NovaMatrizCreateTotemShell'
import {
  extractCatalogTasksFromItemTree,
  type MatrixCatalogTaskEntry,
} from './criar-matriz/extractMatrixTasksForCatalog'
import type { NovaMatrizAddCatalogResult } from './criar-matriz/novaMatrizEstruturaDnD'

type ToastState = { message: string; variant: SgpToastVariant } | null

function sortCatalogEntries(a: MatrixCatalogTaskEntry, b: MatrixCatalogTaskEntry): number {
  const m = a.matrixItemName.localeCompare(b.matrixItemName, 'pt-BR')
  if (m !== 0) return m
  return a.taskName.localeCompare(b.taskName, 'pt-BR')
}

const collaboratorsApi = createCollaboratorsApiService()

export function OperationMatrixNewPage() {
  const { catalog: matrixSuggestionCatalog } = useMatrixSuggestionCatalog()
  const { pathname } = useLocation()
  const { presentBlocking, showToast } = useSgpErrorSurface()
  const navigate = useNavigate()
  const { requestNavigateWithTransientGuard } = useShellFunction()

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')

  const [catalogEntries, setCatalogEntries] = useState<MatrixCatalogTaskEntry[]>([])
  const [catalogByTaskId, setCatalogByTaskId] = useState<
    Map<string, MatrixCatalogTaskEntry>
  >(() => new Map())
  const [structureLoading, setStructureLoading] = useState(false)
  const [structureError, setStructureError] = useState<string | null>(null)

  const [catalogOpcoesDraft, setCatalogOpcoesDraft] = useState<
    CatalogOpcaoDraftInstance[]
  >([])
  const [manualOpcoes, setManualOpcoes] = useState<CriarMatrizManualOpcao[]>([])

  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(true)
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(
    null,
  )

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const isDirty = useMemo(() => {
    return (
      name.trim() !== '' ||
      code.trim() !== '' ||
      description.trim() !== '' ||
      catalogOpcoesDraft.length > 0 ||
      manualStructureIsNonEmpty(manualOpcoes)
    )
  }, [name, code, description, catalogOpcoesDraft.length, manualOpcoes])

  const loadStructureCatalog = useCallback(async () => {
    setStructureLoading(true)
    setStructureError(null)
    try {
      const items = await listMatrixItems({ isActive: true })
      const trees = await Promise.all(
        items.map((it) => getMatrixTree(it.id).catch(() => null)),
      )
      const byId = new Map<string, MatrixCatalogTaskEntry>()
      for (let i = 0; i < items.length; i++) {
        const it = items[i]!
        const tree = trees[i]
        if (!tree) continue
        for (const entry of extractCatalogTasksFromItemTree(
          it.id,
          it.name,
          tree,
        )) {
          byId.set(entry.taskId, entry)
        }
      }
      setCatalogByTaskId(byId)
      setCatalogEntries([...byId.values()].sort(sortCatalogEntries))
    } catch (e) {
      const n = reportClientError(e, {
        module: 'operation-matrix',
        action: 'criar_matriz_load_catalogo',
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setStructureError(n.userMessage)
      }
    } finally {
      setStructureLoading(false)
    }
  }, [pathname, presentBlocking])

  useRegisterTransientContext({
    id: 'operation-matrix-new',
    isDirty: () => isDirty,
    onReset: () => {
      setName('')
      setCode('')
      setDescription('')
      setCatalogOpcoesDraft([])
      setManualOpcoes([])
      setCatalogEntries([])
      setCatalogByTaskId(new Map())
      setStructureError(null)
      setToast(null)
      void loadStructureCatalog()
    },
  })

  useEffect(() => {
    void loadStructureCatalog()
  }, [loadStructureCatalog])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCollaboratorsLoading(true)
      setCollaboratorsError(null)
      try {
        const [rows, teamsData] = await Promise.all([
          collaboratorsApi.listCollaborators({
            status: 'active',
          }),
          listTeams({
            isActive: 'all',
            limit: 200,
            offset: 0,
          }),
        ])
        if (!cancelled) {
          setCollaborators(rows)
          setTeams(teamsData.items)
        }
      } catch (e) {
        if (!cancelled) {
          setTeams([])
          const n = reportClientError(e, {
            module: 'operation-matrix',
            action: 'criar_matriz_load_colaboradores',
            route: pathname,
          })
          if (isBlockingSeverity(n.severity)) {
            presentBlocking(n)
          } else {
            setCollaboratorsError(n.userMessage)
          }
        }
      } finally {
        if (!cancelled) setCollaboratorsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname, presentBlocking])

  const resolveCollaboratorLabel = useCallback(
    (id: string) => {
      const c = collaborators.find((x) => x.id === id)
      if (!c) return id
      const nick = c.nickname?.trim()
      if (nick) return nick
      return c.fullName?.trim() || id
    },
    [collaborators],
  )

  function handleAddCatalogTask(taskId: string): NovaMatrizAddCatalogResult {
    const entry = catalogByTaskId.get(taskId)
    if (!entry) return { outcome: 'noop' }
    let newInstanceId: string | null = null
    setCatalogOpcoesDraft((prev) => {
      if (prev.some((d) => d.sourceTaskId === entry.taskId)) {
        return prev
      }
      newInstanceId = globalThis.crypto.randomUUID()
      const draftRoot = cloneTaskSubtreeWithNewIds(entry.taskSubtree)
      return [
        ...prev,
        {
          instanceId: newInstanceId!,
          sourceTaskId: entry.taskId,
          sourceMatrixItemId: entry.matrixItemId,
          sourceMatrixItemName: entry.matrixItemName,
          sourceTaskName: entry.taskName,
          draftRoot,
        },
      ]
    })
    if (!newInstanceId) return { outcome: 'duplicate' }
    return { outcome: 'added', instanceId: newInstanceId }
  }

  function handleAddBlankCatalogOpcao(name: string, description?: string) {
    const n = name.trim()
    if (!n) return
    setCatalogOpcoesDraft((prev) => [
      ...prev,
      buildBlankCatalogOpcaoDraftInstance(n, description),
    ])
  }

  function handleRemoveCatalogInstance(instanceId: string) {
    setCatalogOpcoesDraft((prev) => prev.filter((x) => x.instanceId !== instanceId))
  }

  function handleChangeCatalogDraft(
    instanceId: string,
    draftRoot: CatalogOpcaoDraftInstance['draftRoot'],
  ) {
    setCatalogOpcoesDraft((prev) =>
      prev.map((x) =>
        x.instanceId === instanceId ? { ...x, draftRoot } : x,
      ),
    )
  }

  function handleReorderCatalogDraft(
    dir: 'up' | 'down',
    taskId: string | null,
  ) {
    if (!taskId) return
    setCatalogOpcoesDraft((prev) => {
      const idx = prev.findIndex((x) => x.draftRoot.id === taskId)
      if (idx < 0) return prev
      const j = dir === 'up' ? idx - 1 : idx + 1
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[j]] = [next[j]!, next[idx]!]
      return next
    })
  }

  function handleDuplicateCatalogInstance(instanceId: string) {
    setCatalogOpcoesDraft((prev) => {
      const src = prev.find((x) => x.instanceId === instanceId)
      if (!src) return prev
      const draftRoot = cloneTaskSubtreeWithNewIds(src.draftRoot)
      return [
        ...prev,
        {
          instanceId: globalThis.crypto.randomUUID(),
          sourceTaskId: src.sourceTaskId,
          sourceMatrixItemId: src.sourceMatrixItemId,
          sourceMatrixItemName: src.sourceMatrixItemName,
          sourceTaskName: src.sourceTaskName,
          draftRoot,
        },
      ]
    })
  }

  async function handleSubmitFinal() {
    const n = name.trim()
    const codeTrim = code.trim()
    if (!n) {
      setToast({
        message: 'Informe o nome da matriz.',
        variant: 'error',
      })
      return
    }

    const manualErr = validateManualOpcoesForSubmit(manualOpcoes)
    if (manualErr) {
      setToast({ message: manualErr, variant: 'error' })
      return
    }

    const catalogDraftErr = validateCatalogOpcoesDraftForSubmit(catalogOpcoesDraft)
    if (catalogDraftErr) {
      setToast({ message: catalogDraftErr, variant: 'error' })
      return
    }

    setSaving(true)
    setToast(null)
    let newItemId: string | null = null
    try {
      const created = await createMatrixNode({
        nodeType: 'ITEM',
        parentId: null,
        name: n,
        code: codeTrim || null,
        description: description.trim() || null,
        isActive: true,
      })
      newItemId = created.id

      for (const inst of catalogOpcoesDraft) {
        await cloneTaskSubtreeUnderItem(created.id, inst.draftRoot)
      }

      await createManualOpcoesUnderItem(created.id, manualOpcoes)

      navigate(`/app/matrizes-operacao/${created.id}`, { replace: true })
    } catch (err) {
      if (newItemId) {
        try {
          await deleteMatrixNode(newItemId)
        } catch {
          /* rollback best-effort */
        }
      }
      const reported = reportClientError(err, {
        module: 'operation-matrix',
        action: 'matrix_create_wizard',
        route: pathname,
        entityId: newItemId ?? undefined,
      })
      const plan = presentationPlan(reported)
      if (plan.surface === 'modal') {
        presentBlocking(reported)
      } else if (plan.surface === 'banner') {
        showToast(reported.userMessage, 'error')
      } else {
        setToast({ message: reported.userMessage, variant: 'error' })
      }
    } finally {
      setSaving(false)
    }
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

      <NovaMatrizCreateTotemShell
        name={name}
        setName={setName}
        code={code}
        setCode={setCode}
        description={description}
        setDescription={setDescription}
        catalogOpcoesDraft={catalogOpcoesDraft}
        manualOpcoes={manualOpcoes}
        setManualOpcoes={setManualOpcoes}
        catalogEntries={catalogEntries}
        structureLoading={structureLoading}
        structureError={structureError}
        onRetryLoadCatalog={() => void loadStructureCatalog()}
        onAddCatalog={handleAddCatalogTask}
        onAddBlankCatalogOpcao={handleAddBlankCatalogOpcao}
        onRemoveCatalog={handleRemoveCatalogInstance}
        onChangeCatalogDraft={handleChangeCatalogDraft}
        onReorderCatalogDraft={handleReorderCatalogDraft}
        onDuplicateCatalogInstance={handleDuplicateCatalogInstance}
        collaborators={collaborators}
        teams={teams}
        collaboratorsLoading={collaboratorsLoading}
        collaboratorsError={collaboratorsError}
        matrixSuggestionCatalog={matrixSuggestionCatalog}
        resolveCollaboratorLabel={resolveCollaboratorLabel}
        onCancel={() => requestNavigateWithTransientGuard('/app/matrizes-operacao')}
        onSave={() => void handleSubmitFinal()}
        saving={saving}
      />
    </PageCanvas>
  )
}
