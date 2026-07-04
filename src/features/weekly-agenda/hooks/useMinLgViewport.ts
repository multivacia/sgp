import { useEffect, useState } from 'react'

/** `true` quando a viewport é `lg` (≥1024px) ou indeterminado no SSR (assume desktop). */
export function useMinLgViewport(): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 1024px)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return matches
}
