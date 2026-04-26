import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useOpenSupportTicket } from './useOpenSupportTicket'
import { SupportTicketSuccessDialog } from './SupportTicketSuccessDialog'
import type { SupportTicketCreateResult } from './support.types'

type Props = {
  open: boolean
  onClose: () => void
}

const CATEGORIES = [
  { value: 'DUVIDA', label: 'Dúvida' },
  { value: 'ERRO', label: 'Erro' },
  { value: 'BLOQUEIO_OPERACIONAL', label: 'Bloqueio operacional' },
  { value: 'SOLICITACAO_APOIO', label: 'Solicitação de apoio' },
  { value: 'ACESSO_PERMISSAO', label: 'Acesso/permissão' },
]

function inferModuleName(pathname: string): string {
  if (pathname.includes('/matrizes-operacao')) return 'operation-matrix'
  if (pathname.includes('/esteiras')) return 'conveyors'
  if (pathname.includes('/dashboard')) return 'dashboard'
  return 'shell'
}

export function OpenSupportTicketDialog({ open, onClose }: Props) {
  const location = useLocation()
  const { submit, submitting, error, clearError } = useOpenSupportTicket()
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isBlocking, setIsBlocking] = useState(false)
  const [successResult, setSuccessResult] = useState<SupportTicketCreateResult | null>(null)

  const moduleName = useMemo(() => inferModuleName(location.pathname), [location.pathname])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[80] bg-black/55 p-4"
          role="dialog"
          aria-modal
          onClick={onClose}
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-white/[0.1] bg-sgp-app-panel p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-heading text-lg font-bold text-slate-50">Abrir chamado</h2>
              <div className="mt-4 grid gap-3">
                <label className="text-xs text-slate-300">
                  Categoria
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-app-panel-deep p-2 text-sm"
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-300">
                  Assunto
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={160}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-app-panel-deep p-2 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-300">
                  Descrição
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-sgp-app-panel-deep p-2 text-sm"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={isBlocking}
                    onChange={(e) => setIsBlocking(e.target.checked)}
                  />
                  Isso está me impedindo de continuar
                </label>
                {error ? <p className="text-xs text-rose-300">{error}</p> : null}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearError()
                    onClose()
                  }}
                  className="rounded-xl border border-white/12 px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    const result = await submit({
                      category,
                      title,
                      description,
                      isBlocking,
                      moduleName,
                      routePath: location.pathname,
                      context: { screen: moduleName },
                    })
                    if (!result) return
                    setSuccessResult(result)
                    setTitle('')
                    setDescription('')
                    setIsBlocking(false)
                    onClose()
                  }}
                  className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2 text-sm font-bold text-sgp-gold-warm disabled:opacity-60"
                >
                  {submitting ? 'Enviando...' : 'Registrar chamado'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
      <SupportTicketSuccessDialog
        open={successResult !== null}
        result={successResult}
        onClose={() => setSuccessResult(null)}
      />
    </>
  )
}
