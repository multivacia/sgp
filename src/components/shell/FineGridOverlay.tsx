import { useMemo } from 'react'
import { useColorTheme } from '../../lib/theme/useColorTheme'

/** Grid técnico muito leve (referência Multivacia) — não compete com o conteúdo. */
export function FineGridOverlay({ className = '' }: { className?: string }) {
  const { themeId } = useColorTheme()

  const style = useMemo(() => {
    const cs = getComputedStyle(document.documentElement)
    const opacityRaw = cs.getPropertyValue('--semantic-grid-opacity').trim()
    const opacity = opacityRaw ? parseFloat(opacityRaw) : 0.38
    const strokeEnc =
      cs.getPropertyValue('--semantic-grid-stroke').trim() || '%23ffffff'
    const strokeOp =
      cs.getPropertyValue('--semantic-grid-stroke-opacity').trim() || '0.045'
    return {
      opacity: Number.isFinite(opacity) ? opacity : 0.38,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0v40M0 40h40' stroke='${strokeEnc}' stroke-opacity='${strokeOp}' fill='none'/%3E%3C/svg%3E")`,
    }
  }, [themeId])

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden
      style={style}
    />
  )
}
