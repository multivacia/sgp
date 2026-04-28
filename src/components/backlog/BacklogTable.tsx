import { useNavigate } from 'react-router-dom'
import { getOperationalBucket } from '../../lib/backlog/operationalBuckets'
import { useAuth } from '../../lib/use-auth'
import type { BacklogRow } from '../../mocks/backlog'
import {
  SgpContextActionsMenu,
  type SgpContextActionsMenuItemDef,
} from '../shell/SgpContextActionsMenu'
import { OperationalBucketBadge } from './OperationalBucketBadge'

function PriorityPill({ p }: { p: BacklogRow['priority'] }) {
  const map = {
    alta: 'border-rose-400/45 bg-rose-500/16 text-rose-50 ring-1 ring-rose-500/18',
    media:
      'border-amber-400/45 bg-amber-500/16 text-amber-50 ring-1 ring-amber-500/18',
    baixa:
      'border-white/14 bg-white/[0.07] text-slate-300 ring-1 ring-white/[0.06]',
  }
  const label = p === 'alta' ? 'Alta' : p === 'media' ? 'Média' : 'Baixa'
  return (
    <span
      className={`sgp-chip transition-colors duration-200 ${map[p]}`}
    >
      {label}
    </span>
  )
}

function OriginTag({ o }: { o: BacklogRow['origin'] }) {
  const label =
    o === 'manual'
      ? 'Manual'
      : o === 'documento'
        ? 'Documento'
        : o === 'base'
          ? 'Base'
          : o === 'hybrid'
            ? 'Misto'
            : '—'
  return (
    <span className="sgp-chip border-white/14 bg-white/[0.05] text-xs font-semibold text-slate-200 ring-1 ring-white/[0.06] transition-colors duration-200">
      {label}
    </span>
  )
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ArgosCell({ row }: { row: BacklogRow }) {
  const s = row.argosSummary
  if (!s) return <span className="text-xs text-slate-500">Sem análise ARGOS</span>
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        <span className="sgp-chip border-sky-400/25 bg-sky-500/10 text-[10px] font-semibold text-sky-100">
          {s.healthStatus ?? '—'}
        </span>
        <span className="sgp-chip border-white/12 bg-white/[0.04] text-[10px] text-slate-300">
          score {s.score ?? '—'}
        </span>
        <span className="sgp-chip border-white/12 bg-white/[0.04] text-[10px] text-slate-300">
          risco {s.riskLevel ?? '—'}
        </span>
      </div>
      <p className="text-[10px] text-slate-500">
        {new Date(s.createdAt).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

type Props = {
  rows: BacklogRow[]
}

export function BacklogTable({ rows }: Props) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canEditEsteira = can('conveyors.create')

  return (
    <div className="sgp-table-shell">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead>
            <tr
              className="border-b border-white/[0.08] text-white shadow-inner"
              style={{
                background: 'var(--sgp-gradient-header)',
              }}
            >
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Esteira / OS
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Origem
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Atividades
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Responsável
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Prioridade
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Situação
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                ARGOS
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Entrada
              </th>
              <th className="whitespace-nowrap px-4 py-4 font-heading text-[11px] font-bold uppercase tracking-[0.12em]">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const menuItems: SgpContextActionsMenuItemDef[] = []
              if (row.esteiraId) {
                menuItems.push({
                  label: 'Consultar',
                  onClick: () => {
                    navigate(`/app/esteiras/${row.esteiraId}`)
                  },
                })
                if (canEditEsteira) {
                  menuItems.push({
                    label: 'Editar',
                    onClick: () => {
                      navigate(`/app/esteiras/${row.esteiraId}/alterar`)
                    },
                  })
                }
              }

              return (
                <tr
                  key={row.id}
                  className={`border-b border-white/[0.06] sgp-table-row-hover ${
                    i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-sgp-app-panel-deep/80'
                  }`}
                >
                  <td className="px-4 py-3.5 align-middle">
                    <span className="font-heading font-bold text-slate-50">
                      {row.ref}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-slate-500">
                      {row.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <OriginTag o={row.origin} />
                  </td>
                  <td className="px-4 py-3.5 align-middle tabular-nums font-medium text-slate-300">
                    {row.activities}
                  </td>
                  <td className="px-4 py-3.5 align-middle font-medium text-slate-300">
                    {row.responsible}
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <PriorityPill p={row.priority} />
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <OperationalBucketBadge bucket={getOperationalBucket(row)} />
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <ArgosCell row={row} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 align-middle text-xs font-medium text-slate-500">
                    {formatWhen(row.enteredAt)}
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {menuItems.length > 0 ? (
                        <SgpContextActionsMenu menuKey={row.id} items={menuItems} />
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="px-4 py-14 text-center">
          <p className="font-heading text-base font-semibold text-slate-300">
            Nenhum resultado com estes filtros
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Limpe a busca ou troque situação e prioridade. Se a lista estiver
            vazia de propósito, crie uma esteira manual ou por documento.
          </p>
        </div>
      )}
    </div>
  )
}
