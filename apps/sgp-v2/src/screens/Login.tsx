import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useSession } from '../auth/context'
import { Marca } from '../ui/Marca'

export function Login() {
  const { login } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-ground">
      <section className="brand-band px-4 pb-16 pt-[max(env(safe-area-inset-top),40px)]">
        <div className="mx-auto flex max-w-sm flex-col gap-4">
          <Marca grande />
          <p className="text-lg text-white/75">Esteiras, semana e apontamento da fábrica, no celular e no tablet.</p>
        </div>
      </section>
      <form onSubmit={submit} className="card mx-4 -mt-10 flex flex-col gap-4 p-5 sm:mx-auto sm:w-full sm:max-w-sm">
        <h1 className="font-display text-2xl font-extrabold">Entrar</h1>
        <p className="text-muted">Use o mesmo e-mail e senha do SGP+.</p>
        <label className="flex flex-col gap-2 font-bold">
          E-mail
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        </label>
        <label className="flex flex-col gap-2 font-bold">
          Senha
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
        </label>
        {error ? (
          <p role="alert" className="rounded-xl border-2 border-danger bg-danger-soft p-3 font-bold text-danger">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
