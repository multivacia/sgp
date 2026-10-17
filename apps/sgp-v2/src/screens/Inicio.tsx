import { Link } from 'react-router-dom'
import { useSession } from '../auth/context'

const PODE_CRIAR = ['conveyors.create', 'operation_matrix.view']

export function Inicio() {
  const { state } = useSession()
  const user = state.status === 'authenticated' ? state.user : null
  const podeCriar = !!user && PODE_CRIAR.every((p) => user.permissions.includes(p))

  return (
    <section className="flex flex-col gap-4 pt-2">
      <h1 className="font-display text-3xl font-extrabold">SGP+ V2</h1>
      {podeCriar ? (
        <Link to="/nova" className="flex min-h-28 items-center gap-4 rounded-3xl bg-ink p-5 text-white">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink">
            <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span>
            <span className="block font-display text-2xl font-extrabold">Nova esteira</span>
            <span className="block text-line">Escolha pelas figuras, como num cardápio</span>
          </span>
        </Link>
      ) : null}
      <Link to="/hoje" className="flex min-h-24 items-center gap-4 rounded-3xl border-2 border-ink bg-white p-5">
        <span className="block font-display text-2xl font-extrabold">Hoje na fábrica</span>
      </Link>
      <Link to="/esteiras" className="flex min-h-24 items-center gap-4 rounded-3xl border-2 border-ink bg-white p-5">
        <span className="block font-display text-2xl font-extrabold">Esteiras</span>
      </Link>
    </section>
  )
}
