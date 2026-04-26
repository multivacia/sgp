type Props = {
  className?: string
}

/** Fundo com malha hexagonal sutil + vinheta (manual ARGOS) */
export function HexPatternBackground({ className = '' }: Props) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="sgp-hex"
            width="56"
            height="100"
            patternUnits="userSpaceOnUse"
            patternTransform="translate(0 -1)"
          >
            <path
              d="M28 0L52 14v28L28 56 4 42V14L28 0zM28 56l24 14v28L28 112 4 98V70l24-14z"
              fill="none"
              stroke="white"
              strokeOpacity="0.14"
              strokeWidth="0.4"
            />
            <path
              d="M28 0L4 14v28L28 56 52 42V14L28 0z"
              fill="none"
              stroke="white"
              strokeOpacity="0.14"
              strokeWidth="0.4"
              transform="translate(28 0)"
            />
          </pattern>
          <radialGradient id="sgp-vignette" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#101824" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0a1018" stopOpacity="0.92" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#sgp-hex)" />
        <rect width="100%" height="100%" fill="url(#sgp-vignette)" />
      </svg>
    </div>
  )
}
