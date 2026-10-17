import { Link } from 'react-router-dom'
import { useSession } from '../auth/context'

export function Eu() {
  const { state, logout } = useSession()
  const email = state.status === 'authenticated' ? state.user.email : ''
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold">Eu</h1>
      <p className="text-muted">{email}</p>
      <Link to="/tablet" className="btn-secondary text-center">
        Abrir modo tablet neste aparelho
      </Link>
      <p className="text-sm text-muted">Para o tablet do setor: os colaboradores entram pelo nome e PIN, sem a sua senha.</p>
      <button type="button" onClick={() => void logout()} className="btn-secondary">
        Sair
      </button>
    </section>
  )
}
