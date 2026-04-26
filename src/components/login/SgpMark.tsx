import { useId } from 'react'

/**
 * Marca geométrica SGP — família visual ARGOS (hex + profundidade + âmbar),
 * forma própria (não reproduz o logotipo ARGOS).
 */
export function SgpMark({ className = 'size-12' }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  const strokeId = `sgp-mark-stroke-${uid}`
  const fillId = `sgp-mark-fill-${uid}`

  return (
    <svg
      viewBox="0 0 56 56"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={strokeId} x1="8" y1="8" x2="48" y2="48">
          <stop stopColor="#d4b366" />
          <stop offset="0.45" stopColor="#c99c5c" />
          <stop offset="1" stopColor="#8b6914" />
        </linearGradient>
        <linearGradient id={fillId} x1="28" y1="12" x2="28" y2="44">
          <stop stopColor="#152030" />
          <stop offset="1" stopColor="#0a1018" />
        </linearGradient>
      </defs>
      <path
        d="M28 4l20 11.5v23L28 50 8 42.5v-23L28 4z"
        stroke={`url(#${strokeId})`}
        strokeWidth="1.35"
        fill={`url(#${fillId})`}
      />
      <path
        d="M18 28h20M18 34h14M18 22h14"
        stroke={`url(#${strokeId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}
