import { useState } from 'react'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'
import { resolveProductionCollaboratorInitials } from '../../domain/production/production.helpers'

type Props = {
  collaborator: Pick<
    ProductionCollaboratorSummary,
    'fullName' | 'avatarUrl' | 'initials'
  >
  size?: 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  md: 'h-14 w-14 text-lg',
  lg: 'h-20 w-20 text-2xl',
} as const

export function ProductionCollaboratorAvatar({
  collaborator,
  size = 'md',
  className = '',
}: Props) {
  const [failed, setFailed] = useState(false)
  const label = resolveProductionCollaboratorInitials(collaborator)
  const src = collaborator.avatarUrl?.trim()
  const dim = sizeClasses[size]

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className={`shrink-0 rounded-2xl object-cover ring-2 ring-white/10 ${dim} ${className}`}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-sgp-gold/20 font-bold text-sgp-gold ring-2 ring-sgp-gold/30 ${dim} ${className}`}
      aria-hidden
    >
      {label}
    </div>
  )
}
