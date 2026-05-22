type Props = {
  label: string
  className: string
}

export function ConveyorPlanBadge({ label, className }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  )
}
