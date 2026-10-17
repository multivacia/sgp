import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createConveyor } from '../../api/conveyors'
import { getMatrixTree, listCollaborators, listMatrices, type MatrixItem } from '../../api/matrix'
import { useSession } from '../../auth/context'
import {
  activitiesOf,
  buildCreateBody,
  displayName,
  emptyDraft,
  figuraDaEtapa,
  minutesOf,
  nomeCurto,
  prazoPara,
  responsavelDe,
  sectorsOf,
  setResponsavel,
  taskActivities,
  tasksOf,
  toggleActivity,
  toggleGroup,
  totals,
  type Collaborator,
  type Dados,
  type Draft,
  type MatrixNode,
} from '../../domain/novaEsteira'
import { ResponsavelPicker } from '../../ui/ResponsavelPicker'

type Passo = 'matriz' | 'etapas' | 'etapa' | 'carro' | 'quando' | 'pronto'

const NUM: Record<Passo, number> = { matriz: 1, etapas: 2, etapa: 2, carro: 3, quando: 4, pronto: 4 }
const PERGUNTA: Record<Passo, string> = {
  matriz: 'Qual matriz?',
  etapas: 'Confira as etapas',
  etapa: 'Personalizar etapa',
  carro: 'Pra qual carro?',
  quando: 'Pra quando?',
  pronto: 'Esteira criada!',
}
const VOLTA: Partial<Record<Passo, Passo>> = { etapas: 'matriz', etapa: 'etapas', carro: 'etapas', quando: 'carro' }

function fmtMin(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return `${h} h${r ? ` ${r} min` : ''}`
}

type Picker = { titulo: string; setor: string; atividades: MatrixNode[] }

export function NovaEsteira() {
  const { state } = useSession()
  const navigate = useNavigate()
  const meuColab = state.status === 'authenticated' ? state.user.collaboratorId : null

  const [passo, setPasso] = useState<Passo>('matriz')
  const [matrizes, setMatrizes] = useState<MatrixItem[] | null>(null)
  const [busca, setBusca] = useState('')
  const [arvore, setArvore] = useState<MatrixNode | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [etapaId, setEtapaId] = useState<string | null>(null)
  const [colabs, setColabs] = useState<Collaborator[]>([])
  const [picker, setPicker] = useState<Picker | null>(null)
  const [dados, setDados] = useState<Dados>({ placa: '', veiculo: '', cliente: '', prazo: prazoPara('sexta'), responsavelNome: '', responsavelId: meuColab })
  const [atalhoPrazo, setAtalhoPrazo] = useState<'hoje' | 'amanha' | 'sexta' | 'data'>('sexta')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [criada, setCriada] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    listMatrices()
      .then(setMatrizes)
      .catch((e) => setErro(e instanceof ApiError && e.status === 403 ? 'Seu usuário não tem permissão para ver as matrizes.' : 'Não foi possível carregar as matrizes.'))
    listCollaborators()
      .then(setColabs)
      .catch(() => setColabs([]))
  }, [])

  // cada passo começa do topo da tela
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [passo, etapaId])

  const colabPorId = useMemo(() => new Map(colabs.map((c) => [c.id, c])), [colabs])
  const tot = arvore ? totals(arvore, draft) : { etapas: 0, atividades: 0, minutos: 0 }
  const etapa = arvore && etapaId ? tasksOf(arvore).find((t) => t.id === etapaId) ?? null : null
  const filtradas = (matrizes ?? []).filter((m) => m.name.toLowerCase().includes(busca.trim().toLowerCase()))

  async function escolherMatriz(m: MatrixItem) {
    setErro(null)
    try {
      const tree = await getMatrixTree(m.id)
      setArvore(tree)
      setDraft(emptyDraft())
      setPasso('etapas')
    } catch {
      setErro('Não foi possível abrir essa matriz.')
    }
  }

  async function criar() {
    if (!arvore) return
    setSalvando(true)
    setErro(null)
    try {
      const resp = dados.responsavelId ? colabPorId.get(dados.responsavelId) : undefined
      const body = buildCreateBody(arvore, draft, { ...dados, responsavelNome: resp?.full_name ?? '' })
      setCriada(await createConveyor(body))
      setPasso('pronto')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a esteira.')
    } finally {
      setSalvando(false)
    }
  }

  const podeSeguir = passo === 'etapas' ? tot.atividades > 0 : passo === 'carro' ? dados.placa.trim() !== '' || dados.veiculo.trim() !== '' : passo === 'quando' ? dados.prazo !== '' && !salvando : true
  function seguir() {
    if (!podeSeguir) return
    if (passo === 'etapas') setPasso('carro')
    else if (passo === 'etapa') setPasso('etapas')
    else if (passo === 'carro') setPasso('quando')
    else if (passo === 'quando') void criar()
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      {passo !== 'pronto' ? (
        <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-white px-4 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => (VOLTA[passo] ? setPasso(VOLTA[passo]!) : navigate('/'))}
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-white"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <p className="font-bold text-muted">Nova esteira · passo {NUM[passo]} de 4</p>
              <h1 className="font-display text-2xl font-extrabold leading-tight">{PERGUNTA[passo]}</h1>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={`h-2 flex-1 rounded-full ${n <= NUM[passo] ? 'bg-ink' : 'bg-line'}`} />
            ))}
          </div>
        </header>
      ) : null}

      <main className="flex flex-1 flex-col gap-3 px-4 pb-40 pt-4">
        {erro ? <p role="alert" className="rounded-2xl border-2 border-danger bg-danger-soft p-3 font-bold text-danger">{erro}</p> : null}

        {passo === 'matriz' ? (
          <>
            <p className="text-muted">A matriz é o combo: já traz as etapas, os setores, as atividades e os responsáveis. Você ajusta depois.</p>
            {(matrizes?.length ?? 0) > 6 ? (
              <input aria-label="Buscar matriz" placeholder="Buscar matriz (ex.: Gol)" value={busca} onChange={(e) => setBusca(e.target.value)} className="field" />
            ) : null}
            {matrizes === null && !erro ? <p className="text-muted">Carregando matrizes…</p> : null}
            {filtradas.map((m) => {
              const fig = figuraDaEtapa(m.name) ?? '/V2/etapas/18.webp'
              return (
                <button key={m.id} type="button" onClick={() => void escolherMatriz(m)} className="flex min-h-24 items-center gap-3 rounded-2xl border border-line bg-white p-2.5 text-left">
                  <img src={fig} alt="" className="size-20 shrink-0 rounded-xl border border-ground object-contain" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold tracking-wide text-muted">MATRIZ</span>
                    <span className="block font-display text-xl font-extrabold leading-tight">{m.name}</span>
                    {m.description ? <span className="block text-muted">{m.description}</span> : null}
                  </span>
                </button>
              )
            })}
          </>
        ) : null}

        {passo === 'etapas' && arvore ? (
          <>
            <p className="text-muted">Marcadas vão ser feitas. Toque na figura para tirar ou incluir. "Personalizar" mostra setores, atividades e responsáveis.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {tasksOf(arvore).map((t, i) => {
                const ativs = taskActivities(t)
                const ligadas = ativs.filter((a) => !draft.off.has(a.id))
                const on = ligadas.length > 0
                const mudancas = ativs.length - ligadas.length + ativs.filter((a) => draft.resp[a.id]).length
                const fig = figuraDaEtapa(t.name)
                return (
                  <div key={t.id} className={`rounded-2xl p-2 ${on ? 'border-[3px] border-ink bg-white' : 'border-[3px] border-transparent bg-line/60'}`}>
                    <button type="button" aria-pressed={on} aria-label={`${on ? 'Tirar' : 'Incluir'} ${displayName(t.name)}`} onClick={() => setDraft(toggleGroup(draft, ativs))} className="flex w-full flex-col gap-1.5 text-left">
                      <span className="relative block">
                        {fig ? (
                          <img src={fig} alt="" className={`h-28 w-full rounded-xl bg-white object-contain ${on ? '' : 'opacity-40 grayscale'}`} />
                        ) : (
                          <span className="block h-28 w-full rounded-xl bg-ground" />
                        )}
                        <span className="absolute left-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                        <span className={`absolute right-1.5 top-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold ${on ? 'bg-ok text-white' : 'border border-line bg-white text-muted'}`}>{on ? 'Incluída' : 'Fora'}</span>
                      </span>
                      <span className={`font-bold leading-tight ${on ? '' : 'text-muted'}`}>{displayName(t.name)}</span>
                      <span className="text-sm text-muted">
                        {sectorsOf(t).length} setor{sectorsOf(t).length === 1 ? '' : 'es'} · {ligadas.length} ativ. · ~{fmtMin(ligadas.reduce((s, a) => s + minutesOf(a), 0))}
                      </span>
                    </button>
                    {on ? (
                      <>
                        {mudancas > 0 ? <span className="mt-1.5 block rounded-lg bg-late-soft px-2 py-1 text-sm font-bold text-late-ink">{mudancas} {mudancas === 1 ? 'mudança' : 'mudanças'}</span> : null}
                        <button type="button" onClick={() => { setEtapaId(t.id); setPasso('etapa') }} className="mt-2 min-h-11 w-full rounded-xl border-2 border-ink bg-white font-bold">
                          Personalizar
                        </button>
                      </>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </>
        ) : null}

        {passo === 'etapa' && etapa ? (
          <>
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-2.5">
              {figuraDaEtapa(etapa.name) ? <img src={figuraDaEtapa(etapa.name)!} alt="" className="size-20 shrink-0 object-contain" /> : null}
              <div>
                <p className="font-display text-xl font-extrabold leading-tight">{displayName(etapa.name)}</p>
                <p className="text-muted">
                  {taskActivities(etapa).filter((a) => !draft.off.has(a.id)).length} de {taskActivities(etapa).length} atividades
                </p>
              </div>
            </div>
            <p className="text-muted">Tudo vem marcado pela matriz. Toque para tirar o que não vai ser feito neste carro.</p>
            {sectorsOf(etapa).map((s) => {
              const ativs = activitiesOf(s)
              const ligadas = ativs.filter((a) => !draft.off.has(a.id))
              return (
                <div key={s.id} className={`flex flex-col gap-2 rounded-2xl p-3 ${ligadas.length ? 'border border-line bg-white' : 'border border-dashed border-muted bg-line/60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-sm font-bold tracking-wide text-muted">SETOR</span>
                      <span className="block font-display text-xl font-extrabold">{displayName(s.name)}</span>
                      <span className="block text-muted">
                        {ligadas.length} de {ativs.length} · {fmtMin(ligadas.reduce((x, a) => x + minutesOf(a), 0))}
                      </span>
                    </div>
                    <button type="button" onClick={() => setDraft(toggleGroup(draft, ativs))} className={`min-h-11 shrink-0 rounded-xl px-3 font-bold ${ligadas.length ? 'border-2 border-line bg-white' : 'bg-ink text-white'}`}>
                      {ligadas.length ? 'Tirar setor' : 'Incluir setor'}
                    </button>
                  </div>
                  {ligadas.length > 1 ? (
                    <button type="button" onClick={() => setPicker({ titulo: `Setor ${displayName(s.name)} · ${ligadas.length} atividades`, setor: displayName(s.name), atividades: ligadas })} className="min-h-11 rounded-xl border-2 border-ink bg-white font-bold">
                      Trocar responsável de todo o setor
                    </button>
                  ) : null}
                  {ativs.map((a) => {
                    const on = !draft.off.has(a.id)
                    const resp = responsavelDe(draft, a)
                    const trocado = !!draft.resp[a.id]
                    return (
                      <div key={a.id} className="flex flex-col gap-1.5">
                        <button type="button" aria-pressed={on} onClick={() => setDraft(toggleActivity(draft, a))} className={`flex min-h-14 items-center gap-3 rounded-2xl px-2.5 py-2 text-left ${on ? 'border-2 border-ink bg-white' : 'border-2 border-line bg-ground'}`}>
                          <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-ok text-white' : 'border-2 border-muted bg-white'}`}>
                            {on ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12l5 5 9-10" />
                              </svg>
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <span className={`block font-bold leading-snug ${on ? '' : 'text-muted line-through'}`}>{a.name}</span>
                            <span className="block text-sm text-muted">{minutesOf(a) ? fmtMin(minutesOf(a)) : 'sem tempo previsto'}</span>
                          </span>
                        </button>
                        {on ? (
                          <button
                            type="button"
                            onClick={() => setPicker({ titulo: a.name, setor: displayName(s.name), atividades: [a] })}
                            className={`ml-11 flex min-h-11 items-center gap-2 rounded-xl px-3 text-left font-bold ${trocado ? 'border-2 border-late bg-late-soft text-late-ink' : 'border border-line bg-ground'}`}
                          >
                            <span className="flex-1">
                              {resp ? nomeCurto(colabPorId.get(resp)) : 'Sem responsável'} {trocado ? `(trocado · matriz: ${nomeCurto(colabPorId.get(a.default_responsible_id ?? ''))})` : resp ? '(da matriz)' : ''}
                            </span>
                            <span className="text-sm underline">Trocar</span>
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </>
        ) : null}

        {passo === 'carro' ? (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 font-bold">
              Placa
              <input
                value={dados.placa}
                onChange={(e) => setDados({ ...dados, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8) })}
                placeholder="ABC1D23"
                autoCapitalize="characters"
                className="field font-display text-3xl tracking-widest"
              />
            </label>
            <label className="flex flex-col gap-2 font-bold">
              Veículo
              <input value={dados.veiculo} onChange={(e) => setDados({ ...dados, veiculo: e.target.value })} placeholder="Ex.: Gol GTI" className="field" />
            </label>
            <label className="flex flex-col gap-2 font-bold">
              Cliente (opcional)
              <input value={dados.cliente} onChange={(e) => setDados({ ...dados, cliente: e.target.value })} className="field" />
            </label>
          </div>
        ) : null}

        {passo === 'quando' ? (
          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold">Prazo</span>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  ['hoje', 'Hoje'],
                  ['amanha', 'Amanhã'],
                  ['sexta', 'Até sexta'],
                  ['data', 'Escolher data'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={atalhoPrazo === k}
                  onClick={() => {
                    setAtalhoPrazo(k)
                    if (k !== 'data') setDados({ ...dados, prazo: prazoPara(k) })
                  }}
                  className={`min-h-16 rounded-2xl text-lg font-bold ${atalhoPrazo === k ? 'bg-ink text-white' : 'border-2 border-line bg-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {atalhoPrazo === 'data' ? (
              <label className="flex flex-col gap-2 font-bold">
                Data de entrega
                <input type="date" value={dados.prazo} onChange={(e) => setDados({ ...dados, prazo: e.target.value })} className="field" />
              </label>
            ) : null}
            <span className="mt-2 text-lg font-bold">Responsável pela esteira</span>
            <button
              type="button"
              onClick={() => setPicker({ titulo: 'Responsável pela esteira', setor: '', atividades: [] })}
              className="flex min-h-14 items-center justify-between rounded-2xl border-2 border-ink bg-white px-4 text-lg font-bold"
            >
              <span>{dados.responsavelId ? nomeCurto(colabPorId.get(dados.responsavelId)) : 'Escolher'}</span>
              <span className="text-sm underline">Trocar</span>
            </button>
            {arvore ? (
              <div className="mt-2 rounded-2xl border border-line bg-white p-3">
                <span className="text-sm font-bold text-muted">RESUMO</span>
                <p className="font-display text-xl font-extrabold">{arvore.name}</p>
                <p>{[dados.veiculo, dados.placa].filter(Boolean).join(' · ')}</p>
                <p>
                  {tot.etapas} etapas · {tot.atividades} atividades · ~{fmtMin(tot.minutos)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {passo === 'pronto' && criada ? (
          <div className="flex flex-col items-center gap-3 pt-10 text-center">
            <span className="flex size-24 items-center justify-center rounded-full bg-ok text-white">
              <svg width="52" height="52" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
            <h1 className="font-display text-3xl font-extrabold">Esteira criada!</h1>
            <p className="text-lg">{criada.name}</p>
            <p className="text-muted">
              {tot.etapas} etapas · {tot.atividades} atividades · ~{fmtMin(tot.minutos)}. Já está esperando planejamento.
            </p>
            <Link to={`/esteiras/${criada.id}`} className="btn-primary flex w-full items-center justify-center">
              Ver esteira
            </Link>
            <button
              type="button"
              onClick={() => {
                setDados({ ...dados, placa: '', cliente: '' })
                setCriada(null)
                setPasso('carro')
              }}
              className="btn-secondary w-full"
            >
              Criar outra igual (outro carro)
            </button>
            <Link to="/" className="min-h-12 font-bold underline">
              Voltar ao início
            </Link>
          </div>
        ) : null}
      </main>

      {['etapas', 'etapa', 'carro', 'quando'].includes(passo) ? (
        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 border-t border-line bg-white px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-extrabold">{tot.etapas} etapas</p>
            <p className="text-muted">
              {tot.atividades} atividades · ~{fmtMin(tot.minutos)}
            </p>
          </div>
          <button
            type="button"
            disabled={!podeSeguir}
            onClick={seguir}
            className={`min-h-15 rounded-2xl px-6 text-lg font-bold ${podeSeguir ? (passo === 'quando' ? 'bg-ok text-white' : 'bg-ink text-white') : 'bg-line text-muted'}`}
          >
            {passo === 'quando' ? (salvando ? 'Criando…' : 'Criar esteira') : passo === 'etapa' ? 'Pronto' : 'Continuar'}
          </button>
        </div>
      ) : null}

      {picker ? (
        <ResponsavelPicker
          titulo={picker.titulo}
          setor={picker.setor}
          padraoId={picker.atividades.length ? picker.atividades[0].default_responsible_id : meuColab}
          padraoLabel={picker.atividades.length ? 'Da matriz' : 'Você'}
          atualId={picker.atividades.length ? responsavelDe(draft, picker.atividades[0]) : dados.responsavelId}
          colaboradores={colabs}
          onPick={(id) => {
            if (picker.atividades.length) setDraft(setResponsavel(draft, picker.atividades, id))
            else setDados({ ...dados, responsavelId: id })
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </div>
  )
}
