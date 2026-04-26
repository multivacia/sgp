import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { SgpToast, type SgpToastVariant } from '../../components/ui/SgpToast'
import { isSupportTicketsEnabled } from '../../lib/api/env'
import { listSupportTickets } from './support-list.api'
import type { SupportTicketDetail, SupportTicketListParams } from './support-list.types'
import { SupportTicketReadonlyDialog } from './SupportTicketReadonlyDialog'
import { SupportTicketsFilters } from './SupportTicketsFilters'
import { SupportTicketsTable } from './SupportTicketsTable'

const defaultFilters = (): SupportTicketListParams => ({ period: 'all' })

export function SupportTicketsPage() {
  const enabled = isSupportTicketsEnabled()
  const [applied, setApplied] = useState<SupportTicketListParams>(defaultFilters)
  const [draft, setDraft] = useState<SupportTicketListParams>(defaultFilters)
  const [rows, setRows] = useState<SupportTicketDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: SgpToastVariant } | null>(null)

  const load = useCallback(async (params: SupportTicketListParams) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await listSupportTickets(params)
      setRows(res.items)
    } catch {
      setLoadError('Não foi possível carregar os chamados. Tente novamente.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void load(applied)
  }, [enabled, applied, load])

  function handleApply() {
    setApplied({ ...draft })
  }

  if (!enabled) {
    return <Navigate to="/app/backlog" replace />
  }

  return (
    <PageCanvas>
      <header className="sgp-header-card space-y-1">
        <h1 className="sgp-page-title">Chamados</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Lista dos seus chamados de suporte. Utilize os filtros para localizar um protocolo ou assunto.
        </p>
      </header>

      <SupportTicketsFilters value={draft} onChange={setDraft} onApply={handleApply} loading={loading} />

      {loadError ? (
        <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {loadError}
        </p>
      ) : null}

      <SupportTicketsTable
        rows={rows}
        loading={loading}
        onOpenDetail={(id) => setDetailId(id)}
        onCopied={(message, variant = 'success') => setToast({ message, variant })}
      />

      <SupportTicketReadonlyDialog open={detailId !== null} ticketId={detailId} onClose={() => setDetailId(null)} />

      {toast ? (
        <SgpToast
          fixed
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </PageCanvas>
  )
}
