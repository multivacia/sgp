import { Link } from 'react-router-dom'
import { useSession } from '../auth/context'

const PODE_CRIAR = ['conveyors.create', 'operation_matrix.view']

export function Inicio() {
  const { state } = useSession()
  const user = state.status === 'authenticated' ? state.user : null
  const podeCriar = !!user && PODE_CRIAR.every((p) => user.permissions.includes(p))
  const podeFotos = !!user && user.permissions.includes('operation_matrix.manage')

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">{hoje}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{saudacao}!</h1>
      </div>
      {podeCriar ? (
        <Link to="/nova" className="brand-band flex min-h-28 items-center gap-4 rounded-2xl p-5 shadow-[0_14px_34px_-16px_rgba(16,24,36,0.7)]">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-cta text-ink shadow-[0_8px_22px_-10px_rgba(217,119,6,0.8)]">
            <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span>
            <span className="block font-display text-2xl font-extrabold">Nova esteira</span>
            <span className="block text-white/75">Escolha pelas figuras, como num cardápio</span>
          </span>
        </Link>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Atalho to="/hoje" titulo="Hoje na fábrica" sub="O que precisa de você" icone="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        <Atalho to="/esteiras" titulo="Esteiras" sub="Andamento e etapas" icone="M4 6h16M4 12h16M4 18h16" />
        {podeCriar ? <Atalho to="/semana" titulo="Planejar semana" sub="Dias e lotação" icone="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" /> : null}
        {podeFotos ? <Atalho to="/fotos" titulo="Fotos das etapas" sub="Cardápio com fotos reais" icone="M4 7h3l2-3h6l2 3h3v13H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" /> : null}
      </div>
    </section>
  )
}

function Atalho({ to, titulo, sub, icone }: { to: string; titulo: string; sub: string; icone: string }) {
  return (
    <Link to={to} className="card flex min-h-32 flex-col justify-between gap-3 p-4 transition-colors hover:border-line-strong">
      <span className="flex size-11 items-center justify-center rounded-xl bg-blue-soft text-navy-blue">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d={icone} />
        </svg>
      </span>
      <span>
        <span className="block font-display text-lg font-extrabold leading-tight">{titulo}</span>
        <span className="block text-sm text-muted">{sub}</span>
      </span>
    </Link>
  )
}
