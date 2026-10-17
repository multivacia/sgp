import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useSession } from '../auth/context'

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
    <main className="min-h-dvh bg-ground px-4 py-10">
      <form onSubmit={submit} className="mx-auto flex max-w-sm flex-col gap-4">
        <h1 className="font-display text-4xl font-extrabold">SGP+ V2</h1>
        <p className="text-muted">Entre com o mesmo e-mail e senha do SGP.</p>
        <label className="flex flex-col gap-2 font-bold">
          E-mail
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-2 font-bold">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>
        {error ? (
          <p role="alert" className="rounded-2xl border-2 border-danger bg-danger-soft p-3 font-bold text-danger">
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
