import { Route, Routes } from 'react-router-dom'
import { useSession } from './auth/context'
import { EsteiraDetalhe } from './screens/EsteiraDetalhe'
import { Esteiras } from './screens/Esteiras'
import { Eu } from './screens/Eu'
import { FotosEtapas } from './screens/FotosEtapas'
import { Hoje } from './screens/Hoje'
import { Inicio } from './screens/Inicio'
import { NovaEsteira } from './screens/nova/NovaEsteira'
import { AlterarEsteira } from './screens/alterar/AlterarEsteira'
import { Login } from './screens/Login'
import { Placeholder } from './screens/Placeholder'
import { PlanejarSemana } from './screens/semana/PlanejarSemana'
import { Shell } from './shell/Shell'
import { Tablet } from './screens/tablet/Tablet'

export function App() {
  const { state } = useSession()

  if (state.status === 'loading') {
    return <p className="p-6 text-lg text-muted">Carregando…</p>
  }

  return (
    <Routes>
      <Route path="/tablet/*" element={<Tablet />} />
      {state.status === 'anonymous' ? (
        <Route path="*" element={<Login />} />
      ) : (
        <>
          <Route path="nova" element={<NovaEsteira />} />
          <Route path="esteiras/:id/alterar" element={<AlterarEsteira />} />
          <Route element={<Shell />}>
            <Route index element={<Inicio />} />
            <Route path="esteiras" element={<Esteiras />} />
            <Route path="esteiras/:id" element={<EsteiraDetalhe />} />
            <Route path="semana" element={<PlanejarSemana />} />
            <Route path="hoje" element={<Hoje />} />
            <Route path="eu" element={<Eu />} />
            <Route path="fotos" element={<FotosEtapas />} />
            <Route path="*" element={<Placeholder title="Página não encontrada" fase="—" />} />
          </Route>
        </>
      )}
    </Routes>
  )
}
