import { useCallback, useEffect, useMemo, useState } from 'react'
import { listConveyors } from '../../api/conveyors'
import { listCollaborators } from '../../api/matrix'
import { getWeek, listBacklogOf, listIntake, publishWeek, saveWeek } from '../../api/planning'
import { useSession } from '../../auth/context'
import type { ConveyorListItem, ConveyorStatus } from '../../domain/conveyors'
import {
  agruparEsperando,
  aplicarAjustes,
  atrasa,
  buildSaveBody,
  devolvidos,
  fixo,
  isoLocal,
  juntar,
  lotacao,
  mantidosDe,
  prazoNaSemana,
  primeiroDia,
  segundaDe,
  simular,
  somarDias,
  sugerirSemana,
  type Ajuste,
  type BacklogItem,
  type Colocado,
  type WeekPlanItem,
  type Dia,
  type Esperando,
  type WeekResponse,
} from '../../domain/planejarSemana'
import { nomeCurto } from '../../domain/novaEsteira'
import { RefreshButton, Tag } from '../../ui/bits'
import { Liberar } from '../../ui/Liberar'

/** Esteiras que a V1 aceita no planejamento da semana (fora: elaboração, aguardando, fechadas). */
const PLANEJAVEIS: ConveyorStatus[] = ['EM_PLANEJAMENTO', 'A_INICIAR', 'EM_ANDAMENTO']
const CURTO = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

const horas = (min: number) => `~${Math.max(1, Math.round(min / 60))} h`
const ativ = (n: number) => `${n} ${n === 1 ? 'atividade' : 'atividades'}`
const diaTxt = (iso: string, i: number) => `${CURTO[i]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`

type Dados = { week: WeekResponse; esteiras: ConveyorListItem[]; esperando: Esperando[]; pessoas: { id: string; nome: string }[] }
type Grupo = { k: string; date: string; etapa: string; esteira: string; min: number; ids: string[]; quem: string[]; fixos: number }

export function PlanejarSemana() {
  const { state } = useSession()
  const pode = state.status === 'authenticated' && state.user.permissions.includes('conveyors.create')
  const [weekStart, setWeekStart] = useState(() => segundaDe(new Date()))
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [inicio, setInicio] = useState<Record<string, Dia>>({})
  const [tiradas, setTiradas] = useState<Set<string>>(new Set())
  const [ajustes, setAjustes] = useState<Record<string, Ajuste>>({})
  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [sheet, setSheet] = useState<string | null>(null)
  const [diaAberto, setDiaAberto] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState('')

  const carregar = useCallback(async (ws: string) => {
    setDados(null)
    setErro(null)
    try {
      const [week, esteiras, intake, cs] = await Promise.all([getWeek(ws), listConveyors(), listIntake(ws), listCollaborators().catch(() => [])])
      const ids = esteiras.filter((c) => PLANEJAVEIS.includes(c.operationalStatus)).map((c) => c.id)
      const backlog: BacklogItem[][] = []
      for (let i = 0; i < ids.length; i += 4) backlog.push(...(await Promise.all(ids.slice(i, i + 4).map(listBacklogOf))))
      const prazoDe = (id: string) => esteiras.find((c) => c.id === id)?.estimatedDeadline ?? null
      const comCapacidade = new Set(week.capacityByCollaboratorDay.map((c) => c.collaboratorId))
      const pessoas = cs.filter((c) => comCapacidade.has(c.id)).map((c) => ({ id: c.id, nome: nomeCurto(c) })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      setDados({ week, esteiras, esperando: agruparEsperando(backlog.flat(), intake, prazoDe), pessoas })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a semana.')
    }
  }, [])

  useEffect(() => {
    if (pode) void carregar(weekStart)
  }, [pode, weekStart, carregar])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const calc = useMemo(() => {
    if (!dados) return null
    const { week, esteiras } = dados
    const dias = week.week.weekdayDates
    const prazoDe = (id: string) => esteiras.find((c) => c.id === id)?.estimatedDeadline ?? null
    const mantidos = mantidosDe(week, tiradas)
    const esperando = juntar(dados.esperando, devolvidos(week, tiradas, prazoDe))
    const sim = simular(week, mantidos, esperando, inicio)
    const desde = primeiroDia(dias, isoLocal(new Date()))
    const final = aplicarAjustes(mantidos, sim.novos, ajustes)
    const porDia = lotacao(week, final.mantidos, final.novos)
    return { week, dias, prazoDe, mantidos, esperando, sim, desde, final, porDia }
  }, [dados, inicio, tiradas, ajustes])

  if (!pode) {
    return (
      <section className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold">Planejar semana</h1>
        <p className="text-muted">Só quem planeja a fábrica (permissão de criar esteiras) usa esta tela.</p>
      </section>
    )
  }

  const mudou = Object.keys(inicio).length > 0 || tiradas.size > 0 || Object.keys(ajustes).length > 0

  function trocarSemana(delta: number) {
    if (mudou) {
      setToast('Publique ou descarte as mudanças antes de trocar de semana.')
      return
    }
    setDiaAberto(null)
    setWeekStart((w) => somarDias(w, 7 * delta))
  }

  function descartar() {
    setInicio({})
    setTiradas(new Set())
    setAjustes({})
  }

  async function gravar(publicar: boolean) {
    if (!calc) return
    setSalvando(true)
    setErro(null)
    try {
      let w = calc.week
      if (mudou) w = await saveWeek(buildSaveBody(calc.week, calc.final.mantidos, calc.final.novos))
      if (publicar && w.plan) await publishWeek(w.plan.id)
      descartar()
      setToast(publicar ? 'Semana publicada. A fábrica já vê o plano.' : 'Rascunho guardado.')
      await carregar(weekStart)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível gravar a semana.')
    } finally {
      setSalvando(false)
    }
  }

  const titulo = (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Planejar semana</h1>
        {calc ? <p className="font-bold text-muted">{statusTxt(calc.week, mudou)}</p> : null}
      </div>
      <RefreshButton onClick={() => (mudou ? setToast('Publique ou descarte as mudanças antes de atualizar.') : void carregar(weekStart))} />
    </div>
  )

  const fimSemana = somarDias(weekStart, 4)
  const navSemana = (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Semana anterior" onClick={() => trocarSemana(-1)} className="flex size-12 items-center justify-center card text-2xl font-bold">
        ‹
      </button>
      <p className="flex-1 text-center text-lg font-bold">
        Semana de {weekStart.slice(8, 10)}/{weekStart.slice(5, 7)} a {fimSemana.slice(8, 10)}/{fimSemana.slice(5, 7)}
      </p>
      <button type="button" aria-label="Próxima semana" onClick={() => trocarSemana(1)} className="flex size-12 items-center justify-center card text-2xl font-bold">
        ›
      </button>
    </div>
  )

  if (!calc) {
    return (
      <section className="flex flex-col gap-3">
        {titulo}
        {navSemana}
        {erro ? <p role="alert" className="font-bold text-danger">{erro}</p> : <p className="text-muted">Carregando a semana…</p>}
      </section>
    )
  }

  const { week, dias, prazoDe, mantidos, esperando, sim, desde, final, porDia } = calc
  const semanaPassou = desde < 0
  const espera = esperando.filter((e) => inicio[e.conveyorId] === undefined)

  // Na semana: esteiras com itens mantidos e/ou escolhidas agora.
  const naSemana = new Map<string, { titulo: string; min: number; n: number; fim: number; nova: boolean }>()
  for (const it of final.mantidos) {
    const x = naSemana.get(it.conveyorId) ?? { titulo: it.conveyorTitle, min: 0, n: 0, fim: 0, nova: false }
    x.min += it.plannedMinutes ?? 0
    x.n++
    x.fim = Math.max(x.fim, dias.indexOf(it.plannedDate))
    naSemana.set(it.conveyorId, x)
  }
  for (const n of final.novos) {
    const x = naSemana.get(n.conveyorId) ?? { titulo: n.conveyorTitle, min: 0, n: 0, fim: 0, nova: true }
    x.min += n.minutes
    x.n++
    x.fim = Math.max(x.fim, dias.indexOf(n.plannedDate))
    x.nova = true
    naSemana.set(n.conveyorId, x)
  }
  for (const id of Object.keys(inicio))
    if (!naSemana.has(id)) naSemana.set(id, { titulo: esperando.find((e) => e.conveyorId === id)?.titulo ?? 'Esteira', min: 0, n: 0, fim: inicio[id], nova: true })

  const atrasadas = [...naSemana.entries()].filter(([id, x]) => {
    const p = prazoNaSemana(prazoDe(id), dias)
    return atrasa(sim.porEsteira[id], p) || (p !== null && x.fim > p)
  })
  const podePublicar = !semanaPassou && !salvando && (mudou || (week.plan !== null && (week.plan.status === 'DRAFT' || week.revision.hasUnpublishedRevision)))
  const algoNaSemana = final.mantidos.length + final.novos.length > 0

  const sheetE = sheet ? (esperando.find((e) => e.conveyorId === sheet) ?? null) : null
  const sheetTitulo = sheet ? (sheetE?.titulo ?? naSemana.get(sheet)?.titulo ?? '') : ''
  const fixosDaSheet = sheet ? mantidos.filter((it) => it.conveyorId === sheet) : []
  const opcoes =
    sheetE && !semanaPassou
      ? dias.map((d, i) => {
          if (i < desde) return null
          const r = simular(week, mantidos, esperando, { ...inicio, [sheetE.conveyorId]: i }).porEsteira[sheetE.conveyorId]
          return { i, d, r, ruim: atrasa(r, prazoNaSemana(sheetE.prazo, dias)) }
        })
      : []
  const sugerido = opcoes.find((o) => o && !o.ruim)?.i ?? -1

  return (
    <section className="flex flex-col gap-4 pb-36">
      {titulo}
      {navSemana}
      {erro ? <p role="alert" className="rounded-2xl bg-white p-3 font-bold text-danger">{erro}</p> : null}
      {semanaPassou ? <p className="rounded-2xl bg-white p-3 text-muted">Esta semana já passou. Dá para ver, mas não planejar.</p> : null}

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-extrabold">Esperando ({espera.length})</h2>
        {espera.length > 0 && !semanaPassou ? (
          <button type="button" onClick={() => setInicio(sugerirSemana(week, mantidos, esperando, inicio, desde))} className="flex min-h-16 flex-col items-start justify-center rounded-2xl bg-ink px-4 py-2 text-left text-white">
            <span className="text-lg font-bold">Sugerir semana</span>
            <span className="text-line">Distribui as esteiras pelos dias, pelo prazo. Você só confere.</span>
          </button>
        ) : null}
        {espera.length === 0 ? <p className="text-muted">{algoNaSemana ? 'Tudo distribuído. Confira os dias e publique.' : 'Nenhuma esteira esperando planejamento.'}</p> : null}
        {espera.map((e) => {
          const min = e.atividades.reduce((s, a) => s + a.minutes, 0)
          return (
            <div key={e.conveyorId} className="flex items-center gap-3 card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold leading-tight">{e.titulo}</p>
                <p className="text-muted">
                  {ativ(e.atividades.length)} · {horas(min)} · prazo {prazoCurto(e.prazo)}
                </p>
              </div>
              {!semanaPassou ? (
                <button type="button" onClick={() => setSheet(e.conveyorId)} className="min-h-12 shrink-0 rounded-xl border-2 border-line-strong px-3 font-bold">
                  Escolher início
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-extrabold">Na semana ({naSemana.size})</h2>
        {naSemana.size === 0 ? <p className="text-muted">Nenhuma esteira na semana ainda.</p> : null}
        {[...naSemana.entries()].map(([id, x]) => {
          const r = sim.porEsteira[id]
          const ruim = atrasadas.some(([a]) => a === id)
          return (
            <button key={id} type="button" onClick={() => !semanaPassou && setSheet(id)} className={`flex flex-col gap-0.5 rounded-2xl border bg-white p-3 text-left ${ruim ? 'border-2 border-late' : 'border-line'}`}>
              <span className="flex items-start justify-between gap-2">
                <span className="text-lg font-bold leading-tight">{x.titulo}</span>
                {x.nova ? <Tag tone="neutral">Mudou</Tag> : null}
              </span>
              <span className="text-muted">
                {ativ(x.n)} · {horas(x.min)} · termina {CURTO[Math.max(0, x.fim)]} · prazo {prazoCurto(prazoDe(id))}
              </span>
              {r?.sobraMin ? <span className="font-bold text-late-ink">Não cabe tudo: sobram {horas(r.sobraMin)} para a próxima semana</span> : null}
              {r?.semResponsavel ? <span className="font-bold text-late-ink">{r.semResponsavel} atividades sem responsável ficaram de fora</span> : null}
              {ruim && !r?.sobraMin ? <span className="font-bold text-late-ink">Termina depois do prazo</span> : null}
            </button>
          )
        })}
      </div>

      {[...naSemana.keys()]
        .map((id) => dados?.esteiras.find((c) => c.id === id))
        .filter((c): c is ConveyorListItem => !!c && c.operationalStatus === 'EM_PLANEJAMENTO')
        .map((c) => (
          <div key={c.id} className="flex flex-col gap-1">
            <p className="font-bold">{c.name}: a fábrica ainda não pode apontar nela.</p>
            <Liberar id={c.id} status={c.operationalStatus} onFeito={(novo) => dados && setDados({ ...dados, esteiras: dados.esteiras.map((x) => (x.id === c.id ? { ...x, operationalStatus: novo } : x)) })} />
          </div>
        ))}

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-extrabold">Lotação da semana</h2>
        <p className="text-muted">Horas planejadas ÷ horas das pessoas no dia. Toque no dia para ver o que entra.</p>
        {dias.map((d, i) => {
          const { capacidade, planejado } = porDia[i]
          const pct = capacidade > 0 ? Math.round((planejado / capacidade) * 100) : planejado > 0 ? 101 : 0
          const aberto = diaAberto === i
          const itens = itensDoDia(d, final.mantidos, final.novos)
          return (
            <div key={d} className="card">
              <button type="button" aria-expanded={aberto} onClick={() => setDiaAberto(aberto ? null : i)} className="flex w-full flex-col gap-1.5 p-3 text-left">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-lg font-bold">{diaTxt(d, i)}</span>
                  {pct > 100 ? <Tag tone="late">Passou</Tag> : pct >= 90 ? <Tag tone="neutral">Cheio</Tag> : i === desde && desde > 0 ? <Tag tone="neutral">Hoje</Tag> : null}
                </span>
                <span className="h-3 overflow-hidden rounded-full bg-line">
                  <span className={`block h-full ${pct > 100 ? 'bg-late' : 'bg-ok'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </span>
                <span className="text-muted">
                  {horas(planejado)} de {horas(capacidade)} · {pct}%
                </span>
              </button>
              {aberto ? (
                <div className="flex flex-col gap-1 border-t border-line p-3">
                  {itens.length === 0 ? <p className="text-muted">Nada planejado.</p> : null}
                  {itens.map((x) => (
                    <button key={x.k} type="button" disabled={semanaPassou || x.ids.length === 0} onClick={() => setGrupo(x)} className="flex min-h-12 items-center justify-between gap-2 rounded-xl px-1 text-left">
                      <span>
                        <span className="font-bold">{x.etapa}</span> <span className="text-muted">· {x.esteira}</span>
                        <span className="block text-sm text-muted">{x.quem.join(', ')}</span>
                      </span>
                      <span className="shrink-0 text-muted">
                        {horas(x.min)} {!semanaPassou && x.ids.length > 0 ? <span className="font-bold text-ink underline">Ajustar</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* fica logo acima do menu inferior (73 px + área segura, mesma conta do Shell) */}
      <div className="fixed inset-x-0 z-10 flex flex-col gap-2 border-t border-line bg-white px-4 py-3 shadow-lg" style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 12px) + 73px)' }}>
        {atrasadas.length ? (
          <p className="font-bold text-late-ink">
            {atrasadas.map(([, x]) => x.titulo).join(', ')} {atrasadas.length > 1 ? 'terminam' : 'termina'} depois do prazo ou não cabe na semana.
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          {mudou ? (
            <button type="button" disabled={salvando} onClick={() => void gravar(false)} className="min-h-14 rounded-2xl border-2 border-line-strong px-3 font-bold">
              Guardar
            </button>
          ) : null}
          <button type="button" disabled={!podePublicar} onClick={() => void gravar(true)} className={`min-h-14 flex-1 rounded-2xl text-lg font-bold ${podePublicar ? 'bg-ok text-white' : 'bg-line text-muted'}`}>
            {salvando ? 'Gravando…' : podePublicar ? 'Publicar semana' : week.plan?.status === 'PUBLISHED' ? 'Semana publicada' : 'Publicar semana'}
          </button>
        </div>
        {mudou ? (
          <button type="button" onClick={descartar} className="font-bold text-danger underline">
            Descartar mudanças
          </button>
        ) : null}
      </div>

      {sheet ? (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={() => setSheet(null)}>
          <div role="dialog" aria-label={sheetTitulo} onClick={(ev) => ev.stopPropagation()} className="flex max-h-[85dvh] w-full flex-col gap-2 overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            <p className="font-bold text-muted">{sheetTitulo}</p>
            {sheetE ? (
              <>
                <h2 className="font-display text-2xl font-extrabold">Começar em qual dia?</h2>
                <p className="text-muted">As atividades seguem a ordem da esteira e ocupam os dias seguintes conforme a folga de cada responsável.</p>
                {opcoes.map((o) =>
                  o ? (
                    <button
                      key={o.d}
                      type="button"
                      onClick={() => {
                        setInicio({ ...inicio, [sheetE.conveyorId]: o.i })
                        setSheet(null)
                      }}
                      className={`flex min-h-16 items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left ${inicio[sheetE.conveyorId] === o.i ? 'border-[3px] border-blue' : 'border-2 border-line'}`}
                    >
                      <span>
                        <span className="block text-lg font-bold">
                          {diaTxt(o.d, o.i)}
                          {inicio[sheetE.conveyorId] === o.i ? ' (atual)' : ''}
                        </span>
                        <span className={`block ${o.ruim ? 'font-bold text-late-ink' : 'text-muted'}`}>{infoDia(o.r, prazoNaSemana(sheetE.prazo, dias))}</span>
                      </span>
                      {o.i === sugerido ? <Tag tone="ok">SUGERIDO</Tag> : null}
                    </button>
                  ) : null,
                )}
              </>
            ) : null}
            {fixosDaSheet.length > 0 || inicio[sheet] !== undefined ? (
              <button
                type="button"
                onClick={() => {
                  const { [sheet]: _fora, ...resto } = inicio
                  void _fora
                  setInicio(resto)
                  if (fixosDaSheet.length) setTiradas(new Set(tiradas).add(sheet))
                  setSheet(null)
                }}
                className="min-h-14 rounded-2xl border-2 border-danger font-bold text-danger"
              >
                Tirar da semana
              </button>
            ) : null}
            {fixosDaSheet.some(fixo) ? <p className="text-sm text-muted">O que já começou ou terminou fica no plano.</p> : null}
            <button type="button" onClick={() => setSheet(null)} className="min-h-14 rounded-2xl bg-line font-bold">
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      {grupo ? (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={() => setGrupo(null)}>
          <div role="dialog" aria-label={`Ajustar ${grupo.etapa}`} onClick={(ev) => ev.stopPropagation()} className="flex max-h-[85dvh] w-full flex-col gap-2 overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            <p className="font-bold text-muted">
              {grupo.esteira} · {diaTxt(grupo.date, dias.indexOf(grupo.date))}
            </p>
            <h2 className="font-display text-2xl font-extrabold">{grupo.etapa}</h2>
            <p className="text-muted">
              {ativ(grupo.ids.length)} · {horas(grupo.min)} · {grupo.quem.join(', ')}
            </p>
            {grupo.fixos > 0 ? <p className="text-sm text-muted">{grupo.fixos} já começaram ou terminaram e ficam onde estão.</p> : null}
            <h3 className="pt-1 text-lg font-bold">Mudar para o dia</h3>
            <div className="grid grid-cols-5 gap-2">
              {dias.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  disabled={i < desde || d === grupo.date}
                  onClick={() => {
                    setAjustes(ajustarGrupo(ajustes, grupo.ids, { plannedDate: d }))
                    setGrupo(null)
                  }}
                  className={`min-h-14 rounded-xl font-bold ${d === grupo.date ? 'bg-ink text-white' : i < desde ? 'bg-line text-muted' : 'border-2 border-line-strong'}`}
                >
                  {CURTO[i]}
                </button>
              ))}
            </div>
            <h3 className="pt-1 text-lg font-bold">Passar para</h3>
            <div className="grid grid-cols-2 gap-2">
              {(dados?.pessoas ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setAjustes(ajustarGrupo(ajustes, grupo.ids, { collaboratorId: p.id, collaboratorName: p.nome }))
                    setGrupo(null)
                  }}
                  className="min-h-12 rounded-xl border-2 border-line px-2 font-bold"
                >
                  {p.nome}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setGrupo(null)} className="min-h-14 rounded-2xl bg-line font-bold">
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <p role="status" className="fixed inset-x-4 top-4 z-40 rounded-2xl bg-ink p-3 text-center font-bold text-white">{toast}</p> : null}
    </section>
  )
}

function statusTxt(w: WeekResponse, mudou: boolean): string {
  if (mudou) return 'Mudanças não publicadas'
  if (!w.plan) return 'Sem plano ainda'
  if (w.plan.status === 'PUBLISHED') return 'Publicada'
  return w.revision.hasActivePublished ? 'Mudanças não publicadas' : 'Rascunho'
}

function prazoCurto(p: string | null): string {
  const d = p?.slice(0, 10)
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : 'sem prazo'
}

function infoDia(r: { fim: number; sobraMin: number; semResponsavel: number } | undefined, prazo: number | null): string {
  if (!r) return ''
  if (r.sobraMin > 0) return `Não cabe: sobram ${horas(r.sobraMin)} para a próxima semana`
  return `Termina ${CURTO[r.fim]}${prazo !== null && r.fim > prazo ? ' · depois do prazo' : prazo !== null ? ' · dentro do prazo' : ''}`
}

/** O que entra num dia, agrupado por esteira + etapa (com quem faz e o que pode ser ajustado). */
function itensDoDia(d: string, mantidos: WeekPlanItem[], novos: Colocado[]): Grupo[] {
  const g = new Map<string, Grupo>()
  const add = (conveyorId: string, esteira: string, etapa: string, min: number, id: string | null, quem: string | null) => {
    const k = `${conveyorId}|${etapa}`
    const x = g.get(k) ?? { k, date: d, etapa, esteira, min: 0, ids: [], quem: [], fixos: 0 }
    x.min += min
    if (id) x.ids.push(id)
    else x.fixos++
    if (quem && !x.quem.includes(quem)) x.quem.push(quem)
    g.set(k, x)
  }
  for (const it of mantidos) if (it.plannedDate === d) add(it.conveyorId, it.conveyorTitle, it.taskTitle, it.plannedMinutes ?? 0, fixo(it) ? null : it.activityNodeId, it.assignedCollaboratorName)
  for (const n of novos) if (n.plannedDate === d) add(n.conveyorId, n.conveyorTitle, n.taskTitle, n.minutes, n.activityNodeId, n.collaboratorName)
  return [...g.values()]
}

function ajustarGrupo(ajustes: Record<string, Ajuste>, ids: string[], a: Ajuste): Record<string, Ajuste> {
  const out = { ...ajustes }
  for (const id of ids) out[id] = { ...out[id], ...a }
  return out
}
