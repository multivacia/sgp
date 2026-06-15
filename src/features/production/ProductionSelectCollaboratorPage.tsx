import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  filterProductionCollaboratorsByName,
  resolveProductionCredentialBadge,
  sortProductionCollaboratorsByName,
} from '../../domain/production/production.helpers'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'
import { useProductionAuth } from '../../lib/use-production-auth'
import {
  listProductionCollaborators,
  PRODUCTION_LIST_KIOSK_MESSAGE,
} from '../../services/production/productionApiService'
import { ApiError } from '../../lib/api/apiErrors'
import { ProductionCollaboratorAvatar } from './ProductionCollaboratorAvatar'

type LoadError = 'generic' | 'kiosk'

const PIN_PENDING_MSG =
  'PIN ainda não configurado. Solicite ao gestor.'

const LOCKED_MSG =
  'Acesso bloqueado por tentativas incorretas. Solicite ao gestor.'

const DISABLED_MSG =
  'Acesso de produção desabilitado. Solicite ao gestor.'

export function ProductionSelectCollaboratorPage() {
  const navigate = useNavigate()
  const {
    isAuthenticated,
    isLoading: sessionLoading,
    mustChangePin,
    sessionExpiredMessage,
    clearSessionExpiredMessage,
  } = useProductionAuth()
  const [items, setItems] = useState<ProductionCollaboratorSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorType, setErrorType] = useState<LoadError | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const loadCollaborators = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setErrorType(null)
    try {
      const data = await listProductionCollaborators()
      setItems(sortProductionCollaboratorsByName(data.items))
    } catch (e) {
      setItems([])
      if (e instanceof ApiError && e.code === 'PRODUCTION_KIOSK_REQUIRED') {
        setErrorType('kiosk')
      } else {
        setErrorType('generic')
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    void loadCollaborators()
  }, [loadCollaborators])

  const filtered = useMemo(
    () => filterProductionCollaboratorsByName(items, search),
    [items, search],
  )

  if (!sessionLoading && isAuthenticated) {
    if (mustChangePin) {
      return <Navigate to="/app/producao/change-pin" replace />
    }
    return <Navigate to="/app/producao/app" replace />
  }

  function handleSelect(collaborator: ProductionCollaboratorSummary) {
    setStatusMessage(null)
    const { productionCredentialStatus } = collaborator

    if (productionCredentialStatus === 'NEEDS_INITIAL_PIN') {
      setStatusMessage(PIN_PENDING_MSG)
      return
    }
    if (productionCredentialStatus === 'LOCKED') {
      setStatusMessage(LOCKED_MSG)
      return
    }
    if (productionCredentialStatus === 'DISABLED') {
      setStatusMessage(DISABLED_MSG)
      return
    }

    navigate(`/app/producao/pin/${collaborator.id}`, {
      state: { collaborator },
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {sessionExpiredMessage ? (
        <div
          role="status"
          className="rounded-xl border border-yellow-500/30 bg-yellow-950/40 px-4 py-4 text-center text-sm text-yellow-200"
        >
          {sessionExpiredMessage}
          <button
            type="button"
            onClick={clearSessionExpiredMessage}
            className="ml-3 underline opacity-70 hover:opacity-100"
            aria-label="Fechar aviso"
          >
            Fechar
          </button>
        </div>
      ) : null}

      {statusMessage ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-4 text-center text-sm text-amber-100"
        >
          {statusMessage}
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="ml-3 underline opacity-70 hover:opacity-100"
            aria-label="Fechar aviso"
          >
            Fechar
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            Buscar colaborador
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o nome…"
            autoComplete="off"
            className="min-h-12 w-full rounded-xl border border-white/15 bg-sgp-night/60 px-4 text-base text-white placeholder:text-slate-500 focus:border-sgp-gold/50 focus:outline-none focus:ring-2 focus:ring-sgp-gold/25"
          />
        </label>
        <button
          type="button"
          onClick={() => void loadCollaborators()}
          disabled={loading}
          className="sgp-cta-secondary min-h-12 shrink-0 px-5 text-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-slate-400">Carregando colaboradores…</p>
      ) : errorType === 'kiosk' ? (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-8 text-center">
          <p className="text-base font-semibold text-red-200">
            {PRODUCTION_LIST_KIOSK_MESSAGE}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Entre em contato com o responsável pelo dispositivo.
          </p>
        </div>
      ) : errorType === 'generic' ? (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-8 text-center">
          <p className="text-base text-red-200">
            Não foi possível carregar os colaboradores.
          </p>
          <button
            type="button"
            onClick={() => void loadCollaborators()}
            disabled={loading}
            className="sgp-cta-secondary mt-4 min-h-12 px-6 text-base"
          >
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-sgp-night/50 px-4 py-8 text-center">
          <p className="text-base font-semibold text-slate-200">
            Nenhum colaborador ativo encontrado.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Verifique o cadastro operacional com o gestor.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-slate-400">
          Nenhum colaborador encontrado para essa busca.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((c) => {
            const badge = resolveProductionCredentialBadge(
              c.productionCredentialStatus,
            )
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="flex w-full min-h-[5.5rem] items-center gap-4 rounded-2xl border border-white/10 bg-sgp-night/70 px-5 py-4 text-left transition hover:border-sgp-gold/40 hover:bg-sgp-night focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sgp-gold"
                >
                  <ProductionCollaboratorAvatar collaborator={c} size="lg" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-lg font-semibold text-white">
                      {c.fullName}
                    </span>
                    {badge ? (
                      <span className={badge.className}>{badge.label}</span>
                    ) : null}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
