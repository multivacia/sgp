import { useState, type FormEvent } from 'react'
import {
  Navigate,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router-dom'
import { LoginBrandPanel } from '../components/login/LoginBrandPanel'
import { LoginFormCard } from '../components/login/LoginFormCard'
import {
  isBlockingSeverity,
  reportClientError,
} from '../lib/errors'
import { useSgpErrorSurface } from '../lib/errors/SgpErrorPresentation'
import { useAuth } from '../lib/use-auth'

export function LoginPage() {
  const { presentBlocking } = useSgpErrorSurface()
  const { user, ready, login, sessionEndedMessage, clearSessionEndedMessage } =
    useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locState = location.state as { from?: Location } | null
  const from = locState?.from?.pathname ?? '/app/backlog'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sgp-void text-sm text-[color:var(--semantic-login-brand-muted)]">
        Carregando…
      </div>
    )
  }

  if (user) {
    const target = user.mustChangePassword ? '/app/alterar-senha' : from
    return <Navigate to={target} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    clearSessionEndedMessage()
    setLoading(true)
    try {
      const u = await login(email.trim(), password)
      const target = u.mustChangePassword ? '/app/alterar-senha' : from
      navigate(target, { replace: true })
    } catch (err) {
      const n = reportClientError(err, {
        module: 'auth',
        action: 'login',
        route: '/login',
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

  return (
    <div className="flex min-h-dvh flex-col bg-sgp-void lg:flex-row">
      <LoginBrandPanel />

      <section className="relative flex flex-1 flex-col items-center justify-center px-5 py-10 lg:px-12 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sgp-void via-sgp-night/95 to-sgp-void lg:bg-gradient-to-l"
          aria-hidden
        />

        <div className="relative w-full max-w-lg lg:max-w-none lg:justify-items-center">
          <div className="mb-8 text-center lg:hidden">
            <p className="font-heading text-[10px] font-bold uppercase tracking-[0.22em] text-sgp-gold-warm">
              Multivacia
            </p>
            <h2 className="mt-2 font-heading text-lg font-bold leading-snug text-[color:var(--semantic-login-brand-fg)]">
              Inteligência para governar a execução
            </h2>
            <p className="mt-1.5 text-xs text-[color:var(--semantic-login-brand-muted)]">
              Sistema de Gestão da Produção
            </p>
          </div>

          <LoginFormCard
            email={email}
            password={password}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
            error={error}
            securityNotice={sessionEndedMessage}
            loading={loading}
          />
        </div>
      </section>
    </div>
  )
}
