import { Route, Routes } from 'react-router-dom'
import { ProductionAuthProvider } from '../lib/production-auth-context'
import { ProductionShellLayout } from '../layouts/ProductionShellLayout'
import { ProductionSelectCollaboratorPage } from '../features/production/ProductionSelectCollaboratorPage'
import { ProductionPinPage } from '../features/production/ProductionPinPage'
import { ProductionChangePinPage } from '../features/production/ProductionChangePinPage'
import { ProductionWorkQueuePage } from '../features/production/ProductionWorkQueuePage'
import { RequireProductionSession } from '../features/production/RequireProductionSession'
import { RequireProductionPinChangeCleared } from '../features/production/RequireProductionPinChangeCleared'

export function ProductionRoutes() {
  return (
    <ProductionAuthProvider>
      <Routes>
        <Route element={<ProductionShellLayout />}>
          <Route index element={<ProductionSelectCollaboratorPage />} />
          <Route path="pin/:collaboratorId" element={<ProductionPinPage />} />
          <Route element={<RequireProductionSession />}>
            <Route path="change-pin" element={<ProductionChangePinPage />} />
            <Route element={<RequireProductionPinChangeCleared />}>
              <Route path="app" element={<ProductionWorkQueuePage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </ProductionAuthProvider>
  )
}
