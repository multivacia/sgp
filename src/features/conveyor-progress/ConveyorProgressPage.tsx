import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import type { ConveyorProgressItem } from '../../domain/conveyor-progress/conveyorProgress.types'
import { computeConveyorProgressSummary } from '../../domain/conveyor-progress/conveyorProgressDisplay'
import { isBlockingSeverity, reportClientError } from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { useRegisterTransientContext } from '../../lib/shell/transient-context'
import { fetchConveyorProgress } from '../../services/conveyor-progress/conveyorProgressApiService'
import { getCollaboratorsService } from '../../services/collaborators/collaboratorsServiceFactory'
import {
  ConveyorProgressFilters,
  EMPTY_CONVEYOR_PROGRESS_FILTERS,
  filtersToApiParams,
  type ConveyorProgressFiltersState,
} from './ConveyorProgressFilters'
import { ConveyorProgressPrintView } from './ConveyorProgressPrintView'
import { ConveyorProgressSummary } from './ConveyorProgressSummary'
import {
  ConveyorProgressTable,
  filterSelectedConveyors,
} from './ConveyorProgressTable'
import { useConveyorProgressPrint } from './useConveyorProgressPrint'

const LOAD_BLOCKING_TITLE = 'Não foi possível carregar a evolução das esteiras'
const LOAD_BLOCKING_MESSAGE =
  'Ocorreu um problema ao obter os dados. Tente novamente em instantes ou confirme a sua sessão.'

export function ConveyorProgressPage() {
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()

  const [filters, setFilters] = useState<ConveyorProgressFiltersState>(
    EMPTY_CONVEYOR_PROGRESS_FILTERS,
  )
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [debouncedFilters, setDebouncedFilters] = useState(filters)
  const [items, setItems] = useState<ConveyorProgressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const [collaboratorOptions, setCollaboratorOptions] = useState<
    Array<{ id: string; label: string }>
  >([])
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(true)

  const { printPayload, isPrinting, printError, requestPrint } = useConveyorProgressPrint()

  useRegisterTransientContext({
    id: 'evolucao-esteiras',
    isDirty: () => selectedIds.size > 0,
    onReset: () => setSelectedIds(new Set()),
  })

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedFilters(filters), 350)
    return () => window.clearTimeout(t)
  }, [filters])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCollaboratorsLoading(true)
      try {
        const svc = getCollaboratorsService()
        const list = await svc.listCollaborators()
        if (cancelled) return
        setCollaboratorOptions(
          list
            .filter((c) => c.status === 'active')
            .map((c) => ({ id: c.id, label: c.fullName }))
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
        )
      } catch {
        if (!cancelled) setCollaboratorOptions([])
      } finally {
        if (!cancelled) setCollaboratorsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchConveyorProgress(filtersToApiParams(debouncedFilters))
      setItems(data.items)
      setSelectedIds((prev) => {
        const next = new Set<string>()
        for (const id of prev) {
          if (data.items.some((i) => i.conveyorId === id)) next.add(id)
        }
        return next
      })
    } catch (err) {
      const n = reportClientError(err, {
        module: 'conveyor_progress',
        action: 'load',
        route: pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking({
          ...n,
          modalTitle: LOAD_BLOCKING_TITLE,
          userMessage: LOAD_BLOCKING_MESSAGE,
        })
        return
      }
      setLoadError(n.userMessage)
    } finally {
      setLoading(false)
    }
  }, [debouncedFilters, pathname, presentBlocking])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const summary = useMemo(() => computeConveyorProgressSummary(items), [items])

  const selectedItems = useMemo(
    () => filterSelectedConveyors(items, selectedIds),
    [items, selectedIds],
  )

  const toggleSelect = useCallback((conveyorId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(conveyorId)) next.delete(conveyorId)
      else next.add(conveyorId)
      return next
    })
  }, [])

  const addToSelection = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
  }, [])

  const removeFromSelection = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }, [])

  const handleGeneratePdf = () => {
    if (selectedItems.length === 0) return
    requestPrint(selectedItems, filters)
  }

  const selectionHint =
    selectedIds.size === 0
      ? 'Selecione ao menos uma esteira.'
      : `${selectedIds.size} selecionada${selectedIds.size === 1 ? '' : 's'}`

  return (
    <PageCanvas>
      <header className="space-y-2">
        <h1 className="sgp-page-title">Evolução das Esteiras</h1>
        <p className="max-w-4xl text-sm text-slate-400">
          Acompanhe o progresso previsto x realizado de esteiras, tarefas, setores, atividades e
          apontamentos.
        </p>
      </header>

      <ConveyorProgressFilters
        filters={filters}
        onChange={setFilters}
        collaboratorOptions={collaboratorOptions}
        collaboratorsLoading={collaboratorsLoading}
        advancedOpen={advancedOpen}
        onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
        onGeneratePdf={handleGeneratePdf}
        pdfDisabled={selectedIds.size === 0}
        pdfLoading={isPrinting}
        selectionHint={printError ?? selectionHint}
      />

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
          Carregando evolução das esteiras…
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-8 text-center shadow-sm">
          <p className="text-sm text-rose-800">{loadError}</p>
          <button
            type="button"
            className="sgp-cta-secondary mt-4"
            onClick={() => void loadData()}
          >
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
          Nenhuma esteira encontrada com os filtros atuais.
        </div>
      ) : (
        <div className="space-y-4">
          <ConveyorProgressSummary summary={summary} />
          <ConveyorProgressTable
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={addToSelection}
            onClearSelection={removeFromSelection}
          />
        </div>
      )}

      {printPayload ? (
        <ConveyorProgressPrintView
          items={printPayload.items}
          generatedAt={printPayload.generatedAt}
          appliedFilters={printPayload.appliedFilters}
          summary={computeConveyorProgressSummary(printPayload.items)}
        />
      ) : null}
    </PageCanvas>
  )
}
