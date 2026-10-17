import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CLOSED, IN_PRODUCTION, STATUS_LABEL, deadlineText, isOverdue, progressOf, type ConveyorStatus } from '../domain/conveyors'
import { ProgressBar, RefreshButton, Tag } from '../ui/bits'
import { useConveyors } from './useConveyors'

const ATIVAS = (Object.keys(STATUS_LABEL) as ConveyorStatus[]).filter((s) => !CLOSED.includes(s))

export function Esteiras() {
  const [todas, setTodas] = useState(false)
  const { list, details, error, reload } = useConveyors(todas ? ATIVAS : IN_PRODUCTION)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">Esteiras</h1>
        <RefreshButton onClick={() => void reload()} />
      </div>
      <div className="flex gap-2" role="group" aria-label="Quais esteiras">
        {[
          { label: 'Em produção', on: !todas, pick: () => setTodas(false) },
          { label: 'Todas ativas', on: todas, pick: () => setTodas(true) },
        ].map((f) => (
          <button key={f.label} type="button" aria-pressed={f.on} onClick={f.pick} className={`min-h-12 rounded-2xl px-4 font-bold ${f.on ? 'bg-ink text-white' : 'border-2 border-line bg-white'}`}>
            {f.label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="font-bold text-danger">{error}</p> : null}
      {list === null ? <p className="text-muted">Carregando…</p> : null}
      {list?.length === 0 ? <p className="text-muted">Nenhuma esteira aqui.</p> : null}
      {list?.map((c) => {
        const d = details.get(c.id)
        const p = d ? progressOf(d) : null
        const late = isOverdue(c)
        const tone = p?.blocked ? 'stop' : late ? 'late' : 'ok'
        return (
          <Link key={c.id} to={`/esteiras/${c.id}`} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-3">
            <span className="flex items-start justify-between gap-2">
              <span className="text-lg font-bold leading-tight">{c.name}</span>
              {p?.blocked ? <Tag tone="stop">Parada</Tag> : late ? <Tag tone="late">Atrasada</Tag> : <Tag tone="neutral">{STATUS_LABEL[c.operationalStatus]}</Tag>}
            </span>
            <span className="text-muted">
              {[c.code, c.clientName].filter(Boolean).join(' · ') || 'Sem cliente'} · prazo {deadlineText(c.estimatedDeadline)}
            </span>
            <ProgressBar pct={p ? p.pct : null} tone={tone} />
            <span className="text-sm text-muted">{p ? `${p.pct}% feito · ${p.doneSteps}/${p.totalSteps} atividades` : 'calculando…'}</span>
          </Link>
        )
      })}
    </section>
  )
}
