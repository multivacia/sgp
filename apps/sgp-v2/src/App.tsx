import { Route, Routes } from 'react-router-dom'
import { useSession } from './auth/context'
import { EsteiraDetalhe } from './screens/EsteiraDetalhe'
import { Esteiras } from './screens/Esteiras'
import { Eu } from './screens/Eu'
import { Hoje } from './screens/Hoje'
import { Inicio } from './screens/Inicio'
import { NovaEsteira } from './screens/nova/NovaEsteira'
import { Login } from './screens/Login'
import { Placeholder } from './screens/Placeholder'
import { Shell } from './shell/Shell'

export function App() {
  const { state } = useSession()

  if (state.status === 'loading') {
    return <p className="p-6 text-lg text-muted">Carregando…</p>
  }

  return (
    <Routes>
      <Route path="/tablet/*" element={<Placeholder title="Tablet do setor" fase="Fase 5" />} />
      {state.status === 'anonymous' ? (
        <Route path="*" element={<Login />} />
      ) : (
        <>
          <Route path="nova" element={<NovaEsteira />} />
          <Route element={<Shell />}>
            <Route index element={<Inicio />} />
            <Route path="esteiras" element={<Esteiras />} />
            <Route path="esteiras/:id" element={<EsteiraDetalhe />} />
            <Route path="semana" element={<Placeholder title="Planejar semana" fase="Fase 4" />} />
            <Route path="hoje" element={<Hoje />} />
            <Route path="eu" element={<Eu />} />
            <Route path="*" element={<Placeholder title="Página não encontrada" fase="—" />} />
          </Route>
        </>
      )}
    </Routes>
  )
}
