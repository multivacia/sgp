import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'
import {
  filterProductionCollaboratorsByName,
  sortProductionCollaboratorsByName,
} from '../../domain/production/production.helpers'
import {
  listProductionCollaborators,
} from '../../services/production/productionApiService'
import { ApiError } from '../../lib/api/apiErrors'
import { ProductionCollaboratorAvatar } from '../production/ProductionCollaboratorAvatar'

type Props = {
  onSelect: (collaborator: ProductionCollaboratorSummary) => void
}

const STATUS_MESSAGES: Record<string, string> = {
  NEEDS_INITIAL_PIN: 'PIN não configurado. Solicite ao gestor.',
  LOCKED: 'Acesso bloqueado. Solicite ao gestor.',
  DISABLED: 'Acesso desabilitado.',
}

export function KioskCollaboratorGrid({ onSelect }: Props) {
  const [items, setItems] = useState<ProductionCollaboratorSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listProductionCollaborators()
      setItems(sortProductionCollaboratorsByName(data.items))
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Não foi possível carregar os colaboradores.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => filterProductionCollaboratorsByName(items, search),
    [items, search],
  )

  function handleSelect(c: ProductionCollaboratorSummary) {
    setStatusMessage(null)
    if (c.productionCredentialStatus !== 'READY') {
      setStatusMessage(STATUS_MESSAGES[c.productionCredentialStatus] ?? 'Acesso indisponível.')
      return
    }
    onSelect(c)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.07] px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sgp-gold">
              SGP · Modo Fábrica
            </p>
            <h1 className="mt-0.5 text-xl font-semibold text-white">
              Quem é você?
            </h1>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setStatusMessage(null)
            }}
            placeholder="Buscar colaborador…"
            autoComplete="off"
            className="w-full max-w-xs rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-sgp-gold/50 focus:outline-none focus:ring-2 focus:ring-sgp-gold/20"
          />
        </div>

        {statusMessage && (
          <div
            role="status"
            className="mt-3 rounded-xl border border-amber-500/25 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
          >
            {statusMessage}
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="ml-3 underline opacity-70"
              aria-label="Fechar"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="py-20 text-center text-slate-400">
            Carregando colaboradores…
          </p>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <p className="text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="sgp-cta-secondary min-h-12 px-8 text-base"
            >
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-slate-400">
            {search
              ? 'Nenhum colaborador encontrado para essa busca.'
              : 'Nenhum colaborador ativo encontrado.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((c) => (
              <CollaboratorCard key={c.id} collaborator={c} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CollaboratorCard({
  collaborator: c,
  onSelect,
}: {
  collaborator: ProductionCollaboratorSummary
  onSelect: (c: ProductionCollaboratorSummary) => void
}) {
  const isBlocked = c.productionCredentialStatus !== 'READY'

  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      className={[
        'flex flex-col items-center gap-3 rounded-2xl border p-4 py-5 text-center transition-all',
        isBlocked
          ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-35'
          : 'border-white/10 bg-white/[0.03] hover:border-sgp-gold/50 hover:bg-sgp-gold/[0.05] active:scale-[0.97]',
      ].join(' ')}
      aria-label={c.fullName}
    >
      <ProductionCollaboratorAvatar collaborator={c} size="lg" />
      <div className="w-full">
        <p className="truncate text-sm font-semibold leading-snug text-white">
          {c.fullName}
        </p>
        {c.teamName ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{c.teamName}</p>
        ) : null}
      </div>
    </button>
  )
}
