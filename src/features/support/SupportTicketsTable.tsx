import type { SgpToastVariant } from '../../components/ui/SgpToast'
import type { SupportTicketDetail } from './support-list.types'

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function labelStatus(s: string): string {
  switch (s) {
    case 'OPEN':
      return 'Aberto'
    case 'IN_PROGRESS':
      return 'Em progresso'
    case 'RESOLVED':
      return 'Resolvido'
    case 'CLOSED':
      return 'Fechado'
    default:
      return s
  }
}

function labelSeverity(s: string): string {
  switch (s) {
    case 'LOW':
      return 'Baixa'
    case 'MEDIUM':
      return 'Média'
    case 'HIGH':
      return 'Alta'
    case 'CRITICAL':
      return 'Crítica'
    default:
      return s
  }
}

type Props = {
  rows: SupportTicketDetail[]
  loading: boolean
  onOpenDetail: (id: string) => void
  onCopied: (message: string, variant?: SgpToastVariant) => void
}

export function SupportTicketsTable({ rows, loading, onOpenDetail, onCopied }: Props) {
  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      onCopied('Protocolo copiado.', 'success')
    } catch {
      onCopied('Não foi possível copiar o protocolo.', 'error')
    }
  }

  if (loading && rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/30 px-4 py-10 text-center text-sm text-slate-400">
        Carregando chamados…
      </div>
    )
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/30 px-4 py-10 text-center text-sm text-slate-400">
        Nenhum chamado encontrado com os filtros atuais.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/30 shadow-inner ring-1 ring-white/[0.04]">
      <table className="min-w-[56rem] w-full border-collapse text-left text-[13px] text-slate-200">
        <thead>
          <tr className="border-b border-white/[0.08] bg-sgp-void/60 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-3">Protocolo</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Categoria</th>
            <th className="px-3 py-3">Severidade</th>
            <th className="px-3 py-3">Assunto</th>
            <th className="px-3 py-3">Criado em</th>
            <th className="px-3 py-3">Última atualização</th>
            <th className="px-3 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-white/[0.05] transition hover:bg-white/[0.03]"
            >
              <td className="px-3 py-2.5 font-mono text-[12px] text-sgp-gold-warm/95">{row.code}</td>
              <td className="px-3 py-2.5 text-slate-300">{labelStatus(row.status)}</td>
              <td className="px-3 py-2.5 text-slate-400">{row.category}</td>
              <td className="px-3 py-2.5 text-slate-400">{labelSeverity(row.severity)}</td>
              <td className="max-w-[14rem] truncate px-3 py-2.5 text-slate-200" title={row.title}>
                {row.title}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{formatDt(row.createdAt)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{formatDt(row.updatedAt)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(row.id)}
                    className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium text-slate-200 transition hover:border-sgp-gold/30 hover:text-white"
                  >
                    Detalhe
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyCode(row.code)}
                    className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium text-slate-200 transition hover:border-sgp-gold/30 hover:text-white"
                  >
                    Copiar protocolo
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && rows.length > 0 ? (
        <p className="border-t border-white/[0.06] px-3 py-2 text-center text-[12px] text-slate-500">
          Atualizando…
        </p>
      ) : null}
    </div>
  )
}
