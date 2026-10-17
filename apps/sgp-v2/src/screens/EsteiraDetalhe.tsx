import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getConveyor } from '../api/conveyors'
import { useSession } from '../auth/context'
import { Liberar } from '../ui/Liberar'
import {
  CLOSED,
  STATUS_LABEL,
  STEP_LABEL,
  deadlineText,
  isOverdue,
  primaryAssignee,
  progressOf,
  stepState,
  type ConveyorDetail,
} from '../domain/conveyors'
import { ProgressBar, StepDot, Tag } from '../ui/bits'

function fmtMin(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return `${h} h${r ? ` ${r} min` : ''}`
}

export function EsteiraDetalhe() {
  const { id = '' } = useParams()
  const { state } = useSession()
  const podeAlterar = state.status === 'authenticated' && state.user.permissions.includes('conveyors.create')
  const [d, setD] = useState<ConveyorDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aberta, setAberta] = useState<string | null>(null)

  useEffect(() => {
    getConveyor(id)
      .then((x) => {
        setD(x)
        // abre a etapa onde o trabalho está (parada/andando) ou a primeira que falta
        const atual =
          x.structure.options.find((o) => o.areas.some((a) => a.steps.some((s) => ['parado', 'andando'].includes(stepState(s.operationalStatus))))) ??
          x.structure.options.find((o) => o.areas.some((a) => a.steps.some((s) => stepState(s.operationalStatus) === 'falta')))
        setAberta(atual?.id ?? null)
        // leva a gestora direto à etapa onde o trabalho está
        if (atual) requestAnimationFrame(() => document.getElementById(`etapa-${atual.id}`)?.scrollIntoView({ block: 'start' }))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
  }, [id])

  if (error) return <p role="alert" className="font-bold text-danger">{error}</p>
  if (!d) return <p className="text-muted">Carregando…</p>

  const p = progressOf(d)
  const late = isOverdue(d)
  const carro = [d.vehicle, d.modelVersion, d.plate].filter(Boolean).join(' · ')

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link to="/esteiras" aria-label="Voltar para Esteiras" className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-white">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold leading-tight">{d.name}</h1>
          <p className="text-muted">{[carro, d.clientName].filter(Boolean).join(' · ') || STATUS_LABEL[d.operationalStatus]}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-3">
        <span className="flex items-center justify-between gap-2">
          <span className="font-bold">{d.baseNameSnapshot ? `Matriz ${d.baseNameSnapshot}` : STATUS_LABEL[d.operationalStatus]}</span>
          {p.blocked ? <Tag tone="stop">Parada</Tag> : late ? <Tag tone="late">Atrasada</Tag> : <Tag tone="neutral">{STATUS_LABEL[d.operationalStatus]}</Tag>}
        </span>
        <ProgressBar pct={p.pct} tone={p.blocked ? 'stop' : late ? 'late' : 'ok'} />
        <span className="text-muted">
          {d.structure.options.length} etapas · {p.totalSteps} atividades · {p.pct}% feito · faltam ~{fmtMin(p.totalMinutes - p.doneMinutes)} · prazo {deadlineText(d.estimatedDeadline)}
        </span>
      </div>
      <Liberar id={d.id} status={d.operationalStatus} onFeito={(novo) => setD({ ...d, operationalStatus: novo })} />
      {podeAlterar && !CLOSED.includes(d.operationalStatus) ? (
        <Link to={`/esteiras/${d.id}/alterar`} className="btn-secondary flex items-center justify-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h4L19 9l-4-4L4 16z" />
            <path d="M13 7l4 4" />
          </svg>
          Alterar esteira
        </Link>
      ) : null}
      <p className="text-muted">Toque numa etapa para ver setores, atividades e responsáveis.</p>
      {d.structure.options.map((o, i) => {
        const steps = o.areas.flatMap((a) => a.steps)
        const states = steps.map((s) => stepState(s.operationalStatus))
        const feitas = states.filter((s) => s === 'feito').length
        const parada = states.includes('parado')
        const andando = states.includes('andando')
        const resumo = feitas === steps.length ? 'Feita' : parada ? 'Parada' : andando || feitas > 0 ? 'Em andamento' : 'Não começou'
        const open = aberta === o.id
        return (
          <div key={o.id} id={`etapa-${o.id}`} className="scroll-mt-4 overflow-hidden rounded-2xl border border-line bg-white">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setAberta(open ? null : o.id)}
              className={`flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left ${parada ? 'bg-danger-soft' : andando ? 'bg-accent-soft' : 'bg-ground/60'}`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{o.name}</span>
                <span className={`block text-sm font-bold ${parada ? 'text-danger' : feitas === steps.length ? 'text-ok' : 'text-muted'}`}>
                  {resumo} · {feitas}/{steps.length} atividades
                </span>
              </span>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
              </svg>
            </button>
            {open ? (
              <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
                {o.areas.map((a) => (
                  <div key={a.id} className="flex flex-col">
                    <span className="text-sm font-bold uppercase tracking-wide text-muted">Setor {a.name}</span>
                    {a.steps.map((s) => {
                      const st = stepState(s.operationalStatus)
                      const quem = st === 'feito' && s.completedByName ? `feito por ${s.completedByName}` : primaryAssignee(s)
                      const min = (s.plannedMinutes ?? 0) * (s.plannedQuantity ?? 1)
                      return (
                        <div key={s.id} className="flex items-start gap-3 border-t border-ground py-2">
                          <StepDot state={st} />
                          <span className="min-w-0">
                            <span className="block font-bold leading-snug">{s.name}</span>
                            <span className="block text-sm text-muted">
                              {[STEP_LABEL[st], min ? fmtMin(min) : 'sem tempo previsto', quem ?? 'sem responsável'].join(' · ')}
                            </span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
