import { type FormEvent } from 'react'

type Props = {
  email: string
  password: string
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  error: string | null
  /** Aviso de segurança (ex.: sessão encerrada por alteração de credenciais). */
  securityNotice?: string | null
  loading: boolean
}

function FieldIconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4 7l8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FieldIconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0110 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

export function LoginFormCard({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  error,
  securityNotice,
  loading,
}: Props) {
  return (
    <div className="relative w-full max-w-[440px]">
      <div
        className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-sgp-blue-bright/30 via-transparent to-sgp-gold-warm/25 opacity-90 blur-[2px]"
        aria-hidden
      />
      <div
        className="relative rounded-2xl border p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md md:p-10"
        style={{
          borderColor: 'var(--semantic-login-form-border)',
          backgroundColor: 'var(--semantic-login-form-bg)',
        }}
      >
        <header className="text-center lg:text-left">
          <p className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold-warm/90">
            Acesso seguro
          </p>
          <h2
            className="mt-2 font-heading text-2xl font-bold tracking-tight md:text-[1.6rem]"
            style={{ color: 'var(--semantic-login-brand-fg)' }}
          >
            Entrar na sua conta
          </h2>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: 'var(--semantic-login-brand-muted)' }}
          >
            Autenticação corporativa. As credenciais são validadas no servidor.
          </p>
        </header>

        {securityNotice && (
          <div
            className="mt-6 rounded-xl border border-amber-500/35 bg-amber-500/[0.09] px-4 py-3 text-sm leading-relaxed text-amber-50/95"
            role="status"
          >
            {securityNotice}
          </div>
        )}

        {error && (
          <div
            className="mt-6 rounded-xl border border-rose-500/35 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100/95"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              E-mail
            </label>
            <div className="relative">
              <FieldIconMail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-sgp-blue-bright/75" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-navy-deep/85 py-3 pl-11 pr-3 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] outline-none ring-sgp-blue-bright/20 transition focus:border-sgp-blue-bright/55 focus:ring-2 disabled:opacity-50 placeholder:[color:var(--semantic-login-field-placeholder)] text-[color:var(--semantic-login-field-fg)]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Senha
            </label>
            <div className="relative">
              <FieldIconLock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-sgp-blue-bright/75" />
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-navy-deep/85 py-3 pl-11 pr-3 text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] outline-none ring-sgp-blue-bright/20 transition focus:border-sgp-blue-bright/55 focus:ring-2 disabled:opacity-50 placeholder:[color:var(--semantic-login-field-placeholder)] text-[color:var(--semantic-login-field-fg)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sgp-cta-primary w-full py-3.5 font-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-sgp-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-sgp-ink disabled:opacity-50"
          >
            {loading ? 'A entrar…' : 'Entrar'}
          </button>

          <div className="pt-1 text-center">
            <span
              className="text-xs font-medium text-white/38"
              title="Contate o administrador dos sistemas para recuperação de acesso."
            >
              Esqueceu sua senha?{' '}
              <span className="text-sgp-blue-bright/70">Fale com o suporte interno.</span>
            </span>
          </div>
        </form>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/32">
          SGP Web · ecossistema Multivacia · ambiente corporativo industrial
        </p>
      </div>
    </div>
  )
}
