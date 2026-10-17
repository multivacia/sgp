import { useEffect, useState } from 'react'
import { listCollaborators } from '../api/matrix'
import { getWeek, getWeekActivity } from '../api/planning'
import { useSession } from '../auth/context'
import { fmtMin } from '../domain/format'
import { pessoasHoje, type PessoasHoje as Dados } from '../domain/pessoasHoje'
import { isoLocal } from '../domain/planejarSemana'

/** Bloco "Pessoas hoje" da tela Hoje (só para quem planeja: usa o planejamento da V1). */
export function PessoasHoje({ versao }: { versao: number }) {
  const { state } = useSession()
  const pode = state.status === 'authenticated' && state.user.permissions.includes('conveyors.create')
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState(false)
  const [abrir, setAbrir] = useState<'sem' | 'livre' | null>(null)

  useEffect(() => {
    if (!pode) return
    const d = new Date()
    if (d.getDay() === 0 || d.getDay() === 6) return
    const hoje = isoLocal(d)
    let vivo = true
    Promise.all([getWeek(hoje), getWeekActivity(hoje), listCollaborators().catch(() => [])])
      .then(([w, a, cs]) => {
        const nomes = new Map(cs.map((c) => [c.id, c.nickname || c.full_name]))
        if (vivo) setDados(pessoasHoje(w, a, hoje, (id) => nomes.get(id) ?? null))
      })
      .catch(() => vivo && setErro(true))
    return () => {
      vivo = false
    }
  }, [pode, versao])

  if (!pode || (!dados && !erro)) return null
  if (erro) return <p className="text-muted">Não foi possível ver os apontamentos de hoje.</p>
  if (!dados) return null
  if (!dados.publicada)
    return <p className="rounded-2xl border border-line bg-white p-3 font-bold text-late-ink">A semana ainda não foi publicada: a fábrica não vê tarefas. Publique em Semana.</p>

  const linha = (p: Dados['semApontamento'][number], txt: string) => (
    <p key={p.id} className="flex justify-between gap-2 border-t border-line py-1.5">
      <span className="font-bold">{p.nome}</span>
      <span className="text-muted">{txt}</span>
    </p>
  )
  return (
    <>
      <h2 className="mt-2 font-display text-xl font-extrabold">Pessoas hoje</h2>
      <div className="grid grid-cols-3 gap-2">
        {[
          { k: 'sem' as const, n: dados.semApontamento.length, label: 'sem apontar', cls: dados.semApontamento.length ? 'bg-late-soft text-late-ink' : 'bg-white' },
          { k: 'livre' as const, n: dados.semTarefa.length, label: 'sem tarefa', cls: dados.semTarefa.length ? 'bg-late-soft text-late-ink' : 'bg-white' },
          { k: null, n: dados.apontaram.length, label: 'já apontaram', cls: 'bg-ok-soft text-ok' },
        ].map((x) => (
          <button key={x.label} type="button" disabled={!x.k || x.n === 0} aria-expanded={abrir === x.k} onClick={() => setAbrir(abrir === x.k ? null : x.k)} className={`flex flex-col items-center rounded-2xl border border-line p-2 text-center ${x.cls}`}>
            <span className="font-display text-3xl font-extrabold">{x.n}</span>
            <span className="text-sm font-bold">{x.label}</span>
          </button>
        ))}
      </div>
      {abrir === 'sem' ? <div className="rounded-2xl bg-white px-3 py-1">{dados.semApontamento.map((p) => linha(p, `${p.tarefas} tarefas · ${fmtMin(p.planejadoMin)}`))}</div> : null}
      {abrir === 'livre' ? <div className="rounded-2xl bg-white px-3 py-1">{dados.semTarefa.map((p) => linha(p, 'nada planejado hoje'))}</div> : null}
    </>
  )
}
