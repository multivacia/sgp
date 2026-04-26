import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SgpToast } from '../ui/SgpToast'

/**
 * Mostra uma mensagem única vinda de `navigate(..., { state: { shellFlash: string } })`
 * e limpa o state para não repetir ao atualizar.
 */
export function ShellNavigationFlash() {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const st = location.state as { shellFlash?: string } | null
    const m = st?.shellFlash?.trim()
    if (!m) return
    const t = window.setTimeout(() => {
      setMessage(m)
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        { replace: true, state: {} },
      )
    }, 0)
    return () => window.clearTimeout(t)
  }, [location, navigate])

  if (!message) return null

  return (
    <SgpToast
      message={message}
      variant="neutral"
      fixed
      onDismiss={() => setMessage(null)}
    />
  )
}
