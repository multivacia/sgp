import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LoginBrandPanel } from '../components/login/LoginBrandPanel'
import { PageCanvas } from '../components/ui/PageCanvas'
import {
  isBlockingSeverity,
  reportClientError,
} from '../lib/errors'
import { useSgpErrorSurface } from '../lib/errors/SgpErrorPresentation'
import { useAuth } from '../lib/use-auth'
import { postChangePassword } from '../services/auth/authApiService'

const minLen = 8

function isVoluntaryPath(pathname: string): boolean {
  return pathname === '/app/conta/alterar-senha'
}

export function ChangePasswordPage() {
  const { presentBlocking } = useSgpErrorSurface()
  const location = useLocation()
  const voluntary = isVoluntaryPath(location.pathname)
  const { user, ready, logout, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sgp-void text-sm text-slate-400">
        Carregando…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (voluntary && user.mustChangePassword) {
    return <Navigate to="/app/alterar-senha" replace />
  }

  if (!voluntary && !user.mustChangePassword) {
    return <Navigate to="/app/backlog" replace />
  }

  const title = voluntary ? 'Alterar senha' : 'Alterar senha obrigatória'
  const lead = voluntary
    ? 'Defina uma nova senha para sua conta. A senha atual é necessária.'
    : 'Por política de segurança, defina uma nova senha antes de continuar.'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < minLen) {
      setError(`A nova senha deve ter pelo menos ${minLen} caracteres.`)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não coincide com a nova senha.')
      return
    }

    setLoading(true)
    try {
      await postChangePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      await refreshUser()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      navigate('/app/backlog', { replace: true })
    } catch (err) {
      const n = reportClientError(err, {
        module: 'auth',
        action: 'change_password',
        route: location.pathname,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setError(n.userMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const formInner = (
    <>
      <div className="mb-6 text-center lg:text-left">
        <h2 className="font-heading text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{lead}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-sgp-app-panel/80 p-6 shadow-xl backdrop-blur"
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">
              Senha atual
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-sgp-app-panel-deep/90 px-3 py-2.5 text-sm text-slate-100 outline-none ring-sgp-blue-bright/0 transition focus:ring-2 focus:ring-sgp-blue-bright/30"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">
              Nova senha (mín. {minLen} caracteres)
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-sgp-app-panel-deep/90 px-3 py-2.5 text-sm text-slate-100 outline-none ring-sgp-blue-bright/0 transition focus:ring-2 focus:ring-sgp-blue-bright/30"
              required
              minLength={minLen}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">
              Confirmar nova senha
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-sgp-app-panel-deep/90 px-3 py-2.5 text-sm text-slate-100 outline-none ring-sgp-blue-bright/0 transition focus:ring-2 focus:ring-sgp-blue-bright/30"
              required
              minLength={minLen}
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void logout().then(() => navigate('/login'))}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.05]"
          >
            Sair
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-sgp-navy to-sgp-blue-bright px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? 'A guardar…' : 'Guardar nova senha'}
          </button>
        </div>
      </form>
    </>
  )

  if (voluntary) {
    return (
      <PageCanvas>
        <div className="mx-auto max-w-lg">
          <header className="sgp-header-card mb-6">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
              <span className="h-px w-8 bg-gradient-to-r from-sgp-gold to-transparent" />
              Conta
            </p>
          </header>
          {formInner}
        </div>
      </PageCanvas>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-sgp-void lg:flex-row">
      <LoginBrandPanel />

      <section className="relative flex flex-1 flex-col items-center justify-center px-5 py-10 lg:px-12 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sgp-void via-sgp-night/95 to-sgp-void lg:bg-gradient-to-l"
          aria-hidden
        />

        <div className="relative w-full max-w-lg">{formInner}</div>
      </section>
    </div>
  )
}
