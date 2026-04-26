import { useMemo } from 'react'

export function HighlightName({
  name,
  query,
  className,
}: {
  name: string
  query: string
  className: string
}) {
  const parts = useMemo(() => {
    const q = query.trim()
    if (!q) return [{ text: name, hit: false }]
    const lower = name.toLowerCase()
    const qi = q.toLowerCase()
    const out: { text: string; hit: boolean }[] = []
    let start = 0
    let idx = lower.indexOf(qi, start)
    while (idx >= 0) {
      if (idx > start) out.push({ text: name.slice(start, idx), hit: false })
      out.push({ text: name.slice(idx, idx + q.length), hit: true })
      start = idx + q.length
      idx = lower.indexOf(qi, start)
    }
    if (start < name.length) out.push({ text: name.slice(start), hit: false })
    return out.length > 0 ? out : [{ text: name, hit: false }]
  }, [name, query])

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.hit ? (
          <mark
            key={i}
            className="rounded bg-amber-400/25 px-0.5 text-inherit [text-decoration:none]"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  )
}
