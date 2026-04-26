import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSupportTicket } from './support-list.api'
import type { SupportTicketDetail } from './support-list.types'

type Props = {
  open: boolean
  ticketId: string | null
  onClose: () => void
}

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function SupportTicketReadonlyDialog({ open, ticketId, onClose }: Props) {
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !ticketId) {
      setTicket(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void getSupportTicket(ticketId)
      .then((data) => {
        if (!cancelled) setTicket(data)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o chamado.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, ticketId])

  if (!open) return null

  const node = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-sgp-navy/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-ticket-readonly-title"
        className="relative z-[201] m-0 flex max-h-[min(92vh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-void to-sgp-navy-deep shadow-2xl sm:m-4 sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
          <div className="min-w-0">
            <p id="support-ticket-readonly-title" className="font-heading text-lg font-semibold text-white">
              Chamado
            </p>
            {ticket ? (
              <p className="mt-0.5 font-mono text-sm text-sgp-gold-warm/95">{ticket.code}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-[12px] text-slate-300 hover:text-white"
          >
            Fechar
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-[13px] text-slate-200">
          {loading ? <p className="text-slate-400">Carregando…</p> : null}
          {error ? <p className="text-rose-300">{error}</p> : null}
          {ticket && !loading ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Assunto</dt>
                <dd className="mt-1 text-slate-100">{ticket.title}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</dt>
                  <dd className="mt-1">{ticket.status}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Severidade</dt>
                  <dd className="mt-1">{ticket.severity}</dd>
                </div>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Categoria</dt>
                <dd className="mt-1">{ticket.category}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Descrição</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-300">{ticket.description}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3 text-[12px] text-slate-500">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Criado em</dt>
                  <dd className="mt-1">{formatDt(ticket.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Atualizado em</dt>
                  <dd className="mt-1">{formatDt(ticket.updatedAt)}</dd>
                </div>
              </div>
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
