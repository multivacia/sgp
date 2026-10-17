import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { App } from './App'
import { SessionProvider } from './auth/session'
import './styles.css'

/** `vite build --mode demo`: API simulada no navegador (src/demo), sem backend. Fora disso, nada de demo entra no pacote. */
const DEMO = import.meta.env.MODE === 'demo'

async function iniciar() {
  const Barra = DEMO ? (await import('./demo/api').then(() => import('./demo/DemoBar'))).DemoBar : null
  const Router = DEMO ? HashRouter : BrowserRouter
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {Barra ? <Barra /> : null}
      <Router basename={DEMO ? undefined : '/V2'}>
        <SessionProvider>
          <App />
        </SessionProvider>
      </Router>
    </StrictMode>,
  )
}

void iniciar()

if (!DEMO && 'serviceWorker' in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register('/V2/sw.js', { scope: '/V2/' })
}
