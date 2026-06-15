import { Route, Routes } from 'react-router-dom'
import { KioskPage } from '../features/kiosk/KioskPage'

export function KioskRoutes() {
  return (
    <Routes>
      <Route path="*" element={<KioskPage />} />
    </Routes>
  )
}
