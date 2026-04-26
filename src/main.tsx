import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth-context'
import { SgpErrorPresentationProvider } from './lib/errors/SgpErrorPresentation'
import { ColorThemeProvider } from './lib/theme/ColorThemeProvider'
import { TransientContextProvider } from './lib/shell/transient-context'
import App from './app/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SgpErrorPresentationProvider>
            <TransientContextProvider>
              <App />
            </TransientContextProvider>
          </SgpErrorPresentationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ColorThemeProvider>
  </StrictMode>,
)
