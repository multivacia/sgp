import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IN_PRODUCTION, exceptionsOf, progressOf } from '../domain/conveyors'
import { ProgressBar, RefreshButton, Tag } from '../ui/bits'
import { PessoasHoje } from './PessoasHoje'
import { useConveyors } from './useConveyors'

export function Hoje() {
  const { list, details, error, reload } = useConveyors(IN_PRODUCTION)
  const [versao, setVersao] = useState(0)
  const excecoes = list ? exceptionsOf(list, details) : []
  const comProblema = new Set(excecoes.map((x) => x.conveyor.id))
  const bem = (list ?? []).filter((c) => !comProblema.has(c.id))
  const carregando = list !== null && details.size < list.length

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Hoje na fábrica</h1>
          <p className="text-muted">{carregando ? 'Atualizando…' : 'Atualizado agora'}</p>
        </div>
        <RefreshButton
          onClick={() => {
            setVersao((v) => v + 1)
            void reload()
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { n: excecoes.length, label: 'precisam de você', cls: 'bg-late-soft text-late-ink' },
          { n: list?.length ?? '–', label: 'em produção', cls: 'bg-white text-ink' },
          { n: excecoes.filter((x) => x.kind === 'parada').length, label: 'atividades paradas', cls: 'bg-danger-soft text-danger' },
        ].map((k) => (
          <div key={k.label} className={`flex flex-col items-center rounded-2xl p-2 text-center ${k.cls}`}>
            <span className="font-display text-3xl font-extrabold">{k.n}</span>
            <span className="text-sm font-bold">{k.label}</span>
          </div>
        ))}
      </div>
      {error ? <p role="alert" className="font-bold text-danger">{error}</p> : null}

      <h2 className="mt-2 font-display text-xl font-extrabold">Precisa de você</h2>
      {list !== null && !carregando && excecoes.length === 0 ? (
        <p className="rounded-2xl border-2 border-ok bg-ok-soft p-4 text-center font-bold text-ok">Tudo em dia.</p>
      ) : null}
      {excecoes.map((x, i) => (
        <div key={`${x.conveyor.id}-${i}`} className="overflow-hidden card">
          <div className={`px-3 py-1.5 text-sm font-bold tracking-wide text-white ${x.kind === 'parada' ? 'bg-danger' : 'bg-late'}`}>
            {x.kind === 'parada' ? 'ATIVIDADE PARADA' : 'ATRASADA'}
          </div>
          <div className="flex flex-col gap-2 p-3">
            <span className="text-lg font-bold leading-tight">{x.conveyor.name}</span>
            <span>{x.detail}</span>
            <Link to={`/esteiras/${x.conveyor.id}`} className="btn-secondary flex items-center justify-center">
              Ver esteira
            </Link>
          </div>
        </div>
      ))}

      <PessoasHoje versao={versao} />

      <h2 className="mt-2 font-display text-xl font-extrabold">Andando bem</h2>
      {bem.map((c) => {
        const d = details.get(c.id)
        const p = d ? progressOf(d) : null
        return (
          <Link key={c.id} to={`/esteiras/${c.id}`} className="flex flex-col gap-1.5 card p-3">
            <span className="flex items-center justify-between gap-2">
              <span className="font-bold">{c.name}</span>
              {p ? <Tag tone="neutral">{`${p.pct}%`}</Tag> : null}
            </span>
            <ProgressBar pct={p ? p.pct : null} />
          </Link>
        )
      })}
    </section>
  )
}
