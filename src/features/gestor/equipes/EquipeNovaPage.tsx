import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageCanvas } from '../../../components/ui/PageCanvas'
import { SgpToast, type SgpToastVariant } from '../../../components/ui/SgpToast'
import {
  isBlockingSeverity,
  reportClientError,
} from '../../../lib/errors'
import { useSgpErrorSurface } from '../../../lib/errors/SgpErrorPresentation'
import { createTeam } from '../../../services/teams/teamsApiService'

type ToastState = { message: string; variant: SgpToastVariant } | null

export function EquipeNovaPage() {
  const navigate = useNavigate()
  const { presentBlocking } = useSgpErrorSurface()
  const [toast, setToast] = useState<ToastState>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  function pushToast(message: string, variant: SgpToastVariant = 'success') {
    setToast({ message, variant })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) {
      pushToast('Indique o nome da equipe.', 'error')
      return
    }
    setSaving(true)
    try {
      const created = await createTeam({
        name: n,
        description: description.trim() === '' ? null : description.trim(),
        isActive,
      })
      pushToast('Equipe criada.')
      navigate(`/app/equipes/${created.id}`)
    } catch (err) {
      const rep = reportClientError(err, {
        module: 'equipes',
        action: 'create',
        route: '/app/equipes/nova',
      })
      if (isBlockingSeverity(rep.severity)) {
        presentBlocking(rep)
        return
      }
      pushToast(rep.userMessage, 'error')
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
      <header className="sgp-header-card max-w-2xl">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
          Gestão
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="sgp-page-title">Nova equipe</h1>
            <p className="sgp-page-lead">
              Defina um nome claro. Depois poderá associar colaboradores ativos no detalhe.
            </p>
          </div>
          <Link to="/app/equipes" className="text-sm font-semibold text-slate-400 hover:text-white">
            ← Voltar
          </Link>
        </div>
      </header>

      <form
        onSubmit={(ev) => void onSubmit(ev)}
        className="max-w-2xl space-y-5 rounded-2xl border border-white/10 bg-sgp-app-panel-deep/80 p-6 shadow-xl backdrop-blur"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-500">Nome</span>
          <input
            className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={256}
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-500">Descrição (opcional)</span>
          <textarea
            className="sgp-input-app min-h-[100px] resize-y rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded border-white/20"
          />
          Equipe ativa
        </label>
        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" className="sgp-cta-primary px-6 py-2.5" disabled={saving}>
            {saving ? 'A guardar…' : 'Criar equipe'}
          </button>
          <Link to="/app/equipes" className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-slate-300">
            Cancelar
          </Link>
        </div>
      </form>
    </PageCanvas>
  )
}
