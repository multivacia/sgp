import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { candidatos, entrar, justificativas, lancar, lancarOutra, listPessoas, minhaFila, sair, salvarTokenDoTablet, trocarPin } from '../../api/production'
import { fmtMin } from '../../domain/format'
import { isoLocal, somarDias } from '../../domain/planejarSemana'
import {
  buildOutraBody,
  buildTimeEntryBody,
  continuar,
  decorridoMs,
  gravarCronometro,
  iniciar,
  justificativasDaOutra,
  lerCronometros,
  minutosDe,
  pausar,
  precisaJustificar,
  relogio,
  tarefasAbertas,
  type Candidato,
  type Cronometro,
  type Justificativa,
  type Pessoa,
  type Tarefa,
} from '../../domain/tablet'

const MOTIVOS_PAUSA = ['Almoço / intervalo', 'Falta material', 'Esperando outro setor', 'Chamado pela gestora', 'Problema na máquina', 'Fim do turno']
const PRESETS = [15, 30, 60, 120, 240]
const PRONTO = [
  { pct: 25, big: '¼', label: 'Um pouco' },
  { pct: 50, big: '½', label: 'Metade' },
  { pct: 75, big: '¾', label: 'Quase tudo' },
  { pct: 100, big: '✓', label: 'Terminei a tarefa' },
]

type Tela =
  | { t: 'pessoas' }
  | { t: 'pin'; pessoa: Pessoa }
  | { t: 'novoPin'; pessoa: Pessoa }
  | { t: 'tarefas' }
  | { t: 'rodando' }
  | { t: 'lancar'; tarefaId: string | null }
  | { t: 'quanto'; tarefa: Tarefa; minutos: number; ontem?: string; pausas?: string[] }
  | { t: 'justif'; motivo: Motivo; tarefa: { activityTitle: string; conveyorTitle: string; sequenceWarningLabel?: string }; depois: (j: Escolha) => void }
  | { t: 'ok'; tarefa: { activityTitle: string; conveyorTitle: string }; minutos: number; pct: number | null }
  | { t: 'outra' }

type Motivo = 'sequencia' | 'excesso' | 'outra'
type Escolha = { id: string; label: string; complemento: string }

/** /V2/tablet: o colaborador toca no nome, digita o PIN e aponta. Sem login da gestora. */
export function Tablet() {
  const [tela, setTela] = useState<Tela>({ t: 'pessoas' })
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null)
  const [semToken, setSemToken] = useState(false)
  const [eu, setEu] = useState<Pessoa | null>(null)
  const [fila, setFila] = useState<Tarefa[] | null>(null)
  const [justs, setJusts] = useState<Justificativa[]>([])
  const [crono, setCrono] = useState<Cronometro | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const carregarPessoas = useCallback(async () => {
    setErro(null)
    try {
      setPessoas(await listPessoas())
      setSemToken(false)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'PRODUCTION_KIOSK_REQUIRED') setSemToken(true)
      else setErro(e instanceof Error ? e.message : 'Não foi possível carregar as pessoas.')
    }
  }, [])

  useEffect(() => {
    void carregarPessoas()
  }, [carregarPessoas])

  const voltarAoInicio = useCallback(async () => {
    await sair()
    setEu(null)
    setFila(null)
    setCrono(null)
    setErro(null)
    setTela({ t: 'pessoas' })
  }, [])

  async function abrirFila(p: Pessoa) {
    setEu(p)
    setErro(null)
    const [f, j] = await Promise.all([minhaFila(), justificativas().catch(() => [] as Justificativa[])])
    setFila(f)
    setJusts([...j].sort((a, b) => a.sortOrder - b.sortOrder))
    const c = lerCronometros()[p.id] ?? null
    const valida = c && f.some((t) => t.activityNodeId === c.stepNodeId && t.canTrackTime && !t.isActivityCompleted)
    if (c && !valida) gravarCronometro(p.id, null)
    setCrono(valida ? c : null)
    setTela({ t: valida ? 'rodando' : 'tarefas' })
  }

  function guardar(c: Cronometro | null) {
    if (eu) gravarCronometro(eu.id, c)
    setCrono(c)
  }

  async function registrar(tarefa: Tarefa, minutos: number, pct: number, extra: { ontem?: string; pausas?: string[]; justificativa?: { id: string; complemento: string } | null }) {
    const precisa = precisaJustificar(tarefa, minutos)
    if (precisa && !extra.justificativa) {
      setTela({ t: 'justif', motivo: precisa, tarefa, depois: (j) => void registrar(tarefa, minutos, pct, { ...extra, justificativa: j }) })
      return
    }
    setOcupado(true)
    setErro(null)
    try {
      await lancar(buildTimeEntryBody({ tarefa, minutos, pct, ...extra }))
      if (crono && crono.stepNodeId === tarefa.activityNodeId) guardar(null)
      setFila(await minhaFila())
      setTela({ t: 'ok', tarefa, minutos, pct })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar.')
      setTela({ t: 'tarefas' })
    } finally {
      setOcupado(false)
    }
  }

  async function registrarOutra(c: Candidato, minutos: number, ontem: string | undefined, j: Escolha | null) {
    const precisa = justificativasDaOutra(c)
    const titulo = { activityTitle: c.activityTitle, conveyorTitle: c.conveyorName }
    if ((precisa.excecao || precisa.sequencia) && !j) {
      setTela({ t: 'justif', motivo: precisa.excecao ? 'outra' : 'sequencia', tarefa: titulo, depois: (x) => void registrarOutra(c, minutos, ontem, x) })
      return
    }
    setOcupado(true)
    setErro(null)
    try {
      await lancarOutra(buildOutraBody(c, minutos, j, ontem))
      setFila(await minhaFila())
      setTela({ t: 'ok', tarefa: titulo, minutos, pct: null })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar.')
      setTela({ t: 'tarefas' })
    } finally {
      setOcupado(false)
    }
  }

  const abertas = fila ? tarefasAbertas(fila) : []
  const tarefaDoCrono = crono ? fila?.find((t) => t.activityNodeId === crono.stepNodeId) : undefined

  function comecar(t: Tarefa) {
    const start = (j: { id: string; complemento: string } | null) => {
      guardar({ ...iniciar(t, Date.now()), justificativa: j })
      setTela({ t: 'rodando' })
    }
    if (t.requiresOutOfSequenceJustification) setTela({ t: 'justif', motivo: 'sequencia', tarefa: t, depois: start })
    else start(null)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <p className="flex-1 font-display text-xl font-extrabold">SGP+ · Tablet do setor</p>
        {eu ? (
          <>
            <span className="flex size-11 items-center justify-center rounded-full bg-accent font-bold">{eu.initials}</span>
            <span className="hidden font-bold sm:block">{primeiroNome(eu.fullName)}</span>
            <button type="button" onClick={() => void voltarAoInicio()} className="min-h-12 rounded-xl border-2 border-ink px-4 font-bold">
              Sair
            </button>
          </>
        ) : (
          <span className="font-display text-2xl font-extrabold tabular-nums">{new Date(agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
        {erro ? (
          <p role="alert" className="rounded-2xl bg-white p-3 text-lg font-bold text-danger">
            {erro}
          </p>
        ) : null}

        {tela.t === 'pessoas' ? (
          semToken ? (
            <LiberarTablet
              onSalvar={(t) => {
                salvarTokenDoTablet(t)
                void carregarPessoas()
              }}
            />
          ) : (
            <>
              <h1 className="font-display text-3xl font-extrabold">Toque no seu nome</h1>
              {pessoas === null && !erro ? <p className="text-lg text-muted">Carregando…</p> : null}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {pessoas?.map((p) => {
                  const pode = p.productionCredentialStatus === 'READY'
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!pode}
                      onClick={() => setTela({ t: 'pin', pessoa: p })}
                      className={`flex min-h-32 flex-col items-center justify-center gap-2 rounded-3xl p-2 ${pode ? 'border-2 border-line bg-white' : 'bg-line/60 text-muted'}`}
                    >
                      {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="size-16 rounded-full object-cover" /> : <span className="flex size-16 items-center justify-center rounded-full bg-accent text-2xl font-bold text-ink">{p.initials}</span>}
                      <span className="text-center text-lg font-bold leading-tight">{primeiroNome(p.fullName)}</span>
                      {!pode ? <span className="text-sm">{p.productionCredentialStatus === 'LOCKED' ? 'Bloqueado' : 'Fale com a gestora'}</span> : null}
                    </button>
                  )
                })}
              </div>
            </>
          )
        ) : null}

        {tela.t === 'pin' ? (
          <Teclado
            titulo={`Olá, ${primeiroNome(tela.pessoa.fullName)}! Digite seu PIN`}
            ocupado={ocupado}
            onVoltar={() => setTela({ t: 'pessoas' })}
            onOk={async (pin) => {
              setOcupado(true)
              setErro(null)
              try {
                const r = await entrar(tela.pessoa.id, pin)
                if (r.status === 'PIN_CHANGE_REQUIRED') {
                  setEu(tela.pessoa)
                  setTela({ t: 'novoPin', pessoa: tela.pessoa })
                } else await abrirFila(tela.pessoa)
              } catch (e) {
                setErro(e instanceof ApiError && e.status === 401 ? 'PIN errado. Tente de novo.' : e instanceof Error ? e.message : 'Não foi possível entrar.')
              } finally {
                setOcupado(false)
              }
            }}
          />
        ) : null}

        {tela.t === 'novoPin' ? (
          <NovoPin
            ocupado={ocupado}
            onOk={async (pin) => {
              setOcupado(true)
              setErro(null)
              try {
                await trocarPin(pin, pin)
                await abrirFila(tela.pessoa)
              } catch (e) {
                setErro(e instanceof Error ? e.message : 'Não foi possível trocar o PIN.')
              } finally {
                setOcupado(false)
              }
            }}
          />
        ) : null}

        {tela.t === 'tarefas' ? (
          abertas.length === 0 ? (
            <Cartao>
              <h1 className="font-display text-3xl font-extrabold">Nada planejado para você agora</h1>
              <p className="text-lg text-muted">Fale com a gestora se precisa de tarefa.</p>
              <button type="button" onClick={() => setTela({ t: 'outra' })} className="min-h-16 rounded-2xl border-2 border-ink bg-white text-xl font-bold">
                Fiz outra atividade
              </button>
              <BotaoGrande onClick={() => void voltarAoInicio()}>SAIR</BotaoGrande>
            </Cartao>
          ) : (
            <>
              {crono && tarefaDoCrono ? (
                <button type="button" onClick={() => setTela({ t: 'rodando' })} className="min-h-16 rounded-2xl bg-late-soft px-4 text-left text-lg font-bold text-late-ink">
                  Você tem tempo contando em {tarefaDoCrono.activityTitle} ({relogio(decorridoMs(crono, agora))}). Voltar a ela
                </button>
              ) : null}
              <h1 className="font-display text-2xl font-extrabold text-muted">Sua próxima tarefa</h1>
              <CartaoTarefa t={abertas[0]} />
              <BotaoGrande verde onClick={() => comecar(abertas[0])}>
                COMEÇAR
              </BotaoGrande>
              <button type="button" onClick={() => setTela({ t: 'lancar', tarefaId: abertas[0].activityNodeId })} className="min-h-16 rounded-2xl border-2 border-ink bg-white text-xl font-bold">
                Já fiz · lançar horas
              </button>
              {abertas.length > 1 ? (
                <>
                  <h2 className="pt-2 font-display text-xl font-extrabold">Ou escolha outra</h2>
                  {abertas.slice(1).map((t) => (
                    <button key={t.workPlanItemId} type="button" onClick={() => comecar(t)} className="flex min-h-16 flex-col justify-center rounded-2xl border border-line bg-white px-4 py-2 text-left">
                      <span className="text-lg font-bold">
                        {t.activityTitle} · {t.conveyorTitle}
                      </span>
                      <span className={t.requiresOutOfSequenceJustification || t.isOverdue ? 'font-bold text-late-ink' : 'text-muted'}>
                        {t.requiresOutOfSequenceJustification ? 'A etapa anterior não terminou' : t.isOverdue ? 'Atrasada' : `${t.taskTitle} · ${t.sectorTitle}`}
                      </span>
                    </button>
                  ))}
                </>
              ) : null}
              <button type="button" onClick={() => setTela({ t: 'outra' })} className="min-h-14 rounded-2xl bg-line text-lg font-bold">
                Fiz outra atividade (fora do meu plano)
              </button>
            </>
          )
        ) : null}

        {tela.t === 'outra' ? <Outra ocupado={ocupado} onVoltar={() => setTela({ t: 'tarefas' })} onContinuar={(c, m, ontem) => void registrarOutra(c, m, ontem, null)} /> : null}

        {tela.t === 'rodando' && crono && tarefaDoCrono ? (
          <Rodando
            crono={crono}
            tarefa={tarefaDoCrono}
            agora={agora}
            onPausar={(m) => guardar(pausar(crono, m, Date.now()))}
            onContinuar={() => guardar(continuar(crono, Date.now()))}
            onTerminei={() => {
              const parado = { ...crono, desde: null, acumuladoMs: decorridoMs(crono, Date.now()) }
              guardar(parado)
              setTela({ t: 'quanto', tarefa: tarefaDoCrono, minutos: minutosDe(parado, Date.now()), pausas: crono.pausas })
            }}
            onDescartar={() => {
              guardar(null)
              setTela({ t: 'tarefas' })
            }}
          />
        ) : null}

        {tela.t === 'lancar' ? (
          <Lancar
            tarefas={abertas}
            inicial={tela.tarefaId}
            onVoltar={() => setTela({ t: 'tarefas' })}
            onContinuar={(t, minutos, ontem) => setTela({ t: 'quanto', tarefa: t, minutos, ontem })}
          />
        ) : null}

        {tela.t === 'quanto' ? (
          <Cartao>
            <h1 className="font-display text-3xl font-extrabold">Quanto ficou pronto?</h1>
            <p className="text-lg text-muted">
              {tela.tarefa.activityTitle} · {tela.tarefa.conveyorTitle} · {fmtMin(tela.minutos)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PRONTO.filter((q) => q.pct < 100 || tela.tarefa.canCompleteStep).map((q) => (
                <button
                  key={q.pct}
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    const j = crono && crono.stepNodeId === tela.tarefa.activityNodeId ? crono.justificativa : null
                    void registrar(tela.tarefa, tela.minutos, q.pct, { ontem: tela.ontem, pausas: tela.pausas, justificativa: j })
                  }}
                  className={`flex min-h-28 flex-col items-center justify-center rounded-3xl text-xl font-bold ${q.pct === 100 ? 'bg-ok text-white' : 'border-2 border-ink bg-white'}`}
                >
                  <span className="text-4xl">{q.big}</span>
                  {q.label}
                </button>
              ))}
            </div>
            {ocupado ? <p className="text-lg text-muted">Registrando…</p> : null}
          </Cartao>
        ) : null}

        {tela.t === 'justif' ? (
          <Justificar
            motivo={tela.motivo}
            tarefa={tela.tarefa}
            justs={justs}
            onVoltar={() => setTela({ t: crono ? 'rodando' : 'tarefas' })}
            onOk={(j) => tela.depois(j)}
          />
        ) : null}

        {tela.t === 'ok' ? (
          <Registrado
            tarefa={tela.tarefa}
            minutos={tela.minutos}
            pct={tela.pct}
            proxima={abertas[0] ?? null}
            onProxima={(t) => comecar(t)}
            onSair={voltarAoInicio}
          />
        ) : null}
      </main>
    </div>
  )
}

function primeiroNome(n: string): string {
  return n.trim().split(/\s+/)[0] ?? n
}

function Cartao({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-5">{children}</div>
}

function BotaoGrande({ children, onClick, verde }: { children: ReactNode; onClick: () => void; verde?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-20 rounded-3xl text-2xl font-extrabold tracking-wide ${verde ? 'bg-ok text-white' : 'bg-ink text-white'}`}>
      {children}
    </button>
  )
}

function CartaoTarefa({ t }: { t: Tarefa }) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl border-[3px] border-ink bg-white p-5">
      <p className="font-bold text-muted">
        {t.taskTitle} · {t.sectorTitle}
      </p>
      <p className="font-display text-3xl font-extrabold leading-tight">{t.activityTitle}</p>
      <p className="text-lg">{t.conveyorTitle}</p>
      <p className="text-lg text-muted">
        Previsto: {t.plannedMinutes ? fmtMin(t.plannedMinutes) : 'sem tempo'}
        {t.realizedMinutes ? ` · já lançado ${fmtMin(t.realizedMinutes)}` : ''}
      </p>
      {t.isOverdue ? <p className="font-bold text-late-ink">Atrasada</p> : null}
    </div>
  )
}

function Teclado({ titulo, ocupado, onOk, onVoltar }: { titulo: string; ocupado: boolean; onOk: (pin: string) => void; onVoltar?: () => void }) {
  const [pin, setPin] = useState('')
  const tecla = (k: string) => setPin((p) => (k === '⌫' ? p.slice(0, -1) : p.length < 8 ? p + k : p))
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-center font-display text-2xl font-extrabold">{titulo}</h1>
      <p aria-label="PIN digitado" className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-white text-3xl">
        {pin.length ? '●'.repeat(pin.length) : <span className="text-lg text-muted">4 a 8 números</span>}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].map((k) => (
          <button key={k} type="button" aria-label={k === '⌫' ? 'Apagar' : k} onClick={() => tecla(k)} className="min-h-18 rounded-2xl border-2 border-line bg-white text-3xl font-bold">
            {k}
          </button>
        ))}
        <button type="button" disabled={pin.length < 4 || ocupado} onClick={() => onOk(pin)} className={`min-h-18 rounded-2xl text-2xl font-bold ${pin.length >= 4 ? 'bg-ok text-white' : 'bg-line text-muted'}`}>
          OK
        </button>
      </div>
      {onVoltar ? (
        <button type="button" onClick={onVoltar} className="min-h-14 rounded-2xl bg-line text-lg font-bold">
          Não sou eu
        </button>
      ) : null}
    </div>
  )
}

function NovoPin({ ocupado, onOk }: { ocupado: boolean; onOk: (pin: string) => void }) {
  const [primeiro, setPrimeiro] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  return (
    <>
      {erro ? <p className="text-center text-lg font-bold text-danger">{erro}</p> : null}
      <Teclado
        key={primeiro ?? 'novo'}
        titulo={primeiro ? 'Digite o novo PIN de novo' : 'Crie seu PIN (não use 1234)'}
        ocupado={ocupado}
        onOk={(pin) => {
          if (!primeiro) {
            if (pin === '1234') return setErro('Escolha um PIN diferente de 1234.')
            setErro('')
            return setPrimeiro(pin)
          }
          if (pin !== primeiro) {
            setErro('Os dois PINs não batem. Comece de novo.')
            return setPrimeiro(null)
          }
          onOk(pin)
        }}
      />
    </>
  )
}

function Rodando({ crono, tarefa, agora, onPausar, onContinuar, onTerminei, onDescartar }: { crono: Cronometro; tarefa: Tarefa; agora: number; onPausar: (m: string) => void; onContinuar: () => void; onTerminei: () => void; onDescartar: () => void }) {
  const [motivos, setMotivos] = useState(false)
  const pausado = crono.desde === null
  const ms = decorridoMs(crono, agora)
  if (motivos)
    return (
      <Cartao>
        <h1 className="font-display text-3xl font-extrabold">Por que vai parar?</h1>
        <div className="grid grid-cols-2 gap-3">
          {MOTIVOS_PAUSA.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                onPausar(m)
                setMotivos(false)
              }}
              className="min-h-20 rounded-2xl border-2 border-ink bg-white text-lg font-bold"
            >
              {m}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setMotivos(false)} className="min-h-14 rounded-2xl bg-line text-lg font-bold">
          Não vou parar, voltar
        </button>
      </Cartao>
    )
  return (
    <>
      <div className={`flex flex-col items-center gap-2 rounded-3xl p-6 text-center ${pausado ? 'bg-late-soft' : 'bg-ink text-white'}`}>
        <p className="text-lg font-bold">{pausado ? `PAUSADO · ${crono.pausas.at(-1) ?? ''}` : 'TRABALHANDO EM'}</p>
        <p className="font-display text-3xl font-extrabold leading-tight">{tarefa.activityTitle}</p>
        <p className="text-lg">
          {tarefa.conveyorTitle} · {tarefa.taskTitle}
        </p>
        <p className="font-display text-7xl font-extrabold tabular-nums" aria-label="Tempo trabalhado">
          {relogio(ms)}
        </p>
        <p>horas : minutos · previsto {tarefa.plannedMinutes ? fmtMin(tarefa.plannedMinutes) : 'sem tempo'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {pausado ? (
          <BotaoGrande onClick={onContinuar}>CONTINUAR</BotaoGrande>
        ) : (
          <button type="button" onClick={() => setMotivos(true)} className="min-h-20 rounded-3xl border-[3px] border-ink bg-white text-2xl font-extrabold">
            PAUSAR
          </button>
        )}
        <BotaoGrande verde onClick={onTerminei}>
          TERMINEI
        </BotaoGrande>
      </div>
      <p className="text-center text-muted">Pode sair: o tempo continua contando neste tablet até você voltar.</p>
      <button type="button" onClick={onDescartar} className="font-bold text-danger underline">
        Comecei errado, descartar
      </button>
    </>
  )
}

function Lancar({ tarefas, inicial, onVoltar, onContinuar }: { tarefas: Tarefa[]; inicial: string | null; onVoltar: () => void; onContinuar: (t: Tarefa, minutos: number, ontem?: string) => void }) {
  const [sel, setSel] = useState(inicial ?? tarefas[0]?.activityNodeId ?? null)
  const [ontem, setOntem] = useState(false)
  const [min, setMin] = useState(60)
  const t = tarefas.find((x) => x.activityNodeId === sel) ?? null
  const opcao = (on: boolean) => `min-h-16 rounded-2xl px-3 text-lg font-bold ${on ? 'bg-ink text-white' : 'border-2 border-line bg-white'}`
  return (
    <Cartao>
      <h1 className="font-display text-3xl font-extrabold">Lançar horas trabalhadas</h1>
      <h2 className="text-xl font-bold">1. Em qual tarefa?</h2>
      <div className="flex flex-col gap-2">
        {tarefas.map((x) => (
          <button key={x.workPlanItemId} type="button" aria-pressed={sel === x.activityNodeId} onClick={() => setSel(x.activityNodeId)} className={`${opcao(sel === x.activityNodeId)} py-2 text-left`}>
            {x.activityTitle} · {x.conveyorTitle}
          </button>
        ))}
      </div>
      <h2 className="text-xl font-bold">2. Quando?</h2>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" aria-pressed={!ontem} onClick={() => setOntem(false)} className={opcao(!ontem)}>
          Hoje
        </button>
        <button type="button" aria-pressed={ontem} onClick={() => setOntem(true)} className={opcao(ontem)}>
          Ontem
        </button>
      </div>
      <h2 className="text-xl font-bold">3. Quanto tempo?</h2>
      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((p) => (
          <button key={p} type="button" aria-pressed={min === p} onClick={() => setMin(p)} className={opcao(min === p)}>
            {p < 60 ? `${p}m` : `${p / 60}h`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setMin((m) => Math.max(15, m - 15))} className="min-h-16 flex-1 rounded-2xl border-2 border-ink bg-white text-lg font-bold">
          − 15 min
        </button>
        <span className="min-w-28 text-center font-display text-2xl font-extrabold">{fmtMin(min)}</span>
        <button type="button" onClick={() => setMin((m) => m + 15)} className="min-h-16 flex-1 rounded-2xl border-2 border-ink bg-white text-lg font-bold">
          + 15 min
        </button>
      </div>
      <button type="button" disabled={!t} onClick={() => t && onContinuar(t, min, ontem ? somarDias(isoLocal(new Date()), -1) : undefined)} className="min-h-18 rounded-3xl bg-ok text-2xl font-extrabold text-white">
        CONTINUAR
      </button>
      <button type="button" onClick={onVoltar} className="min-h-14 rounded-2xl bg-line text-lg font-bold">
        Voltar
      </button>
    </Cartao>
  )
}

const TITULO_JUSTIF: Record<Motivo, string> = {
  sequencia: 'A etapa anterior ainda não terminou. Por que vai fazer esta agora?',
  excesso: 'Passou do tempo previsto. O que aconteceu?',
  outra: 'Esta atividade não está no seu plano. Por que fez?',
}

function Justificar({ motivo, tarefa, justs, onVoltar, onOk }: { motivo: Motivo; tarefa: { activityTitle: string; conveyorTitle: string; sequenceWarningLabel?: string }; justs: Justificativa[]; onVoltar: () => void; onOk: (j: Escolha) => void }) {
  const [sel, setSel] = useState<Justificativa | null>(null)
  const [texto, setTexto] = useState('')
  const pronto = sel && (!sel.requiresComplement || texto.trim().length >= 3)
  return (
    <Cartao>
      <h1 className="font-display text-3xl font-extrabold">{TITULO_JUSTIF[motivo]}</h1>
      <p className="text-lg text-muted">
        {tarefa.activityTitle} · {tarefa.conveyorTitle}
        {motivo === 'sequencia' && tarefa.sequenceWarningLabel ? ` · ${tarefa.sequenceWarningLabel}` : ''}
      </p>
      {justs.length === 0 ? <p className="font-bold text-danger">Nenhuma justificativa cadastrada na V1. Fale com a gestora.</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {justs.map((j) => (
          <button key={j.id} type="button" aria-pressed={sel?.id === j.id} onClick={() => setSel(j)} className={`min-h-18 rounded-2xl px-3 text-lg font-bold ${sel?.id === j.id ? 'bg-ink text-white' : 'border-2 border-ink bg-white'}`}>
            {j.label}
          </button>
        ))}
      </div>
      {sel?.requiresComplement ? <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Explique em poucas palavras" className="field min-h-24 text-lg" /> : null}
      <button type="button" disabled={!pronto} onClick={() => sel && onOk({ id: sel.id, label: sel.label, complemento: texto })} className={`min-h-18 rounded-3xl text-2xl font-extrabold ${pronto ? 'bg-ok text-white' : 'bg-line text-muted'}`}>
        CONTINUAR
      </button>
      <button type="button" onClick={onVoltar} className="min-h-14 rounded-2xl bg-line text-lg font-bold">
        Voltar
      </button>
    </Cartao>
  )
}

function Registrado({ tarefa, minutos, pct, proxima, onProxima, onSair }: { tarefa: { activityTitle: string; conveyorTitle: string }; minutos: number; pct: number | null; proxima: Tarefa | null; onProxima: (t: Tarefa) => void; onSair: () => void }) {
  const [falta, setFalta] = useState(15)
  useEffect(() => {
    if (falta <= 0) {
      onSair()
      return
    }
    const t = setTimeout(() => setFalta((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [falta, onSair])
  return (
    <Cartao>
      <p className="flex size-20 items-center justify-center self-center rounded-full bg-ok text-5xl text-white" aria-hidden="true">
        ✓
      </p>
      <h1 className="text-center font-display text-4xl font-extrabold">Registrado!</h1>
      <p className="text-center text-lg">
        {tarefa.activityTitle} · {tarefa.conveyorTitle}
      </p>
      <p className="text-center text-lg text-muted">
        Tempo: {fmtMin(minutos)}
        {pct === null ? '' : pct >= 100 ? ' · tarefa terminada' : ` · ${pct}% pronto`}
      </p>
      {proxima ? (
        <button type="button" onClick={() => onProxima(proxima)} className="flex min-h-20 flex-col items-center justify-center rounded-3xl bg-ok text-white">
          <span className="text-2xl font-extrabold">COMEÇAR PRÓXIMA</span>
          <span className="text-lg">{proxima.activityTitle}</span>
        </button>
      ) : null}
      <button type="button" onClick={onSair} className="min-h-16 rounded-2xl border-2 border-ink bg-white text-xl font-bold">
        Sair ({falta} s)
      </button>
    </Cartao>
  )
}

function LiberarTablet({ onSalvar }: { onSalvar: (t: string) => void }) {
  const [t, setT] = useState('')
  return (
    <Cartao>
      <h1 className="font-display text-3xl font-extrabold">Liberar este tablet</h1>
      <p className="text-lg text-muted">A gestora digita uma vez o código do tablet da fábrica (o mesmo do Modo Produção da V1). Fica guardado só neste aparelho.</p>
      <input value={t} onChange={(e) => setT(e.target.value)} type="password" autoComplete="off" aria-label="Código do tablet" className="field text-lg" />
      <BotaoGrande onClick={() => t.trim() && onSalvar(t)}>LIBERAR</BotaoGrande>
    </Cartao>
  )
}

function Outra({ ocupado, onVoltar, onContinuar }: { ocupado: boolean; onVoltar: () => void; onContinuar: (c: Candidato, minutos: number, ontem?: string) => void }) {
  const [q, setQ] = useState('')
  const [lista, setLista] = useState<Candidato[] | null>(null)
  const [sel, setSel] = useState<Candidato | null>(null)
  const [ontem, setOntem] = useState(false)
  const [min, setMin] = useState(60)
  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) return
    let vivo = true
    const h = setTimeout(() => {
      candidatos(t)
        .then((r) => vivo && setLista(r))
        .catch(() => vivo && setLista([]))
    }, 300)
    return () => {
      vivo = false
      clearTimeout(h)
    }
  }, [q])
  const opcao = (on: boolean) => `min-h-16 rounded-2xl px-3 text-lg font-bold ${on ? 'bg-ink text-white' : 'border-2 border-line bg-white'}`
  const achados = q.trim().length >= 2 ? lista : null
  if (!sel)
    return (
      <Cartao>
        <h1 className="font-display text-3xl font-extrabold">Qual atividade você fez?</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Placa, carro ou atividade" aria-label="Buscar atividade" className="field text-lg" />
        {achados === null ? <p className="text-muted">Digite pelo menos 2 letras.</p> : achados.length === 0 ? <p className="text-muted">Nada encontrado.</p> : null}
        {achados?.map((c) => (
          <button key={c.stepNodeId} type="button" disabled={!c.canPointTime} onClick={() => setSel(c)} className={`flex min-h-16 flex-col justify-center rounded-2xl px-4 py-2 text-left ${c.canPointTime ? 'border border-line bg-white' : 'bg-line/60 text-muted'}`}>
            <span className="text-lg font-bold">{c.activityTitle}</span>
            <span className="text-muted">
              {c.conveyorName}
              {c.plate ? ` · ${c.plate}` : ''} · {c.sectorTitle}
              {c.blockingReason ? ` · ${c.blockingReason}` : ''}
            </span>
          </button>
        ))}
        <button type="button" onClick={onVoltar} className="min-h-14 rounded-2xl bg-line text-lg font-bold">
          Voltar
        </button>
      </Cartao>
    )
  return (
    <Cartao>
      <h1 className="font-display text-3xl font-extrabold">{sel.activityTitle}</h1>
      <p className="text-lg text-muted">
        {sel.conveyorName} · {sel.sectorTitle}
      </p>
      <h2 className="text-xl font-bold">Quando?</h2>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" aria-pressed={!ontem} onClick={() => setOntem(false)} className={opcao(!ontem)}>
          Hoje
        </button>
        <button type="button" aria-pressed={ontem} onClick={() => setOntem(true)} className={opcao(ontem)}>
          Ontem
        </button>
      </div>
      <h2 className="text-xl font-bold">Quanto tempo?</h2>
      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((p) => (
          <button key={p} type="button" aria-pressed={min === p} onClick={() => setMin(p)} className={opcao(min === p)}>
            {p < 60 ? `${p}m` : `${p / 60}h`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setMin((m) => Math.max(15, m - 15))} className="min-h-16 flex-1 rounded-2xl border-2 border-ink bg-white text-lg font-bold">
          − 15 min
        </button>
        <span className="min-w-28 text-center font-display text-2xl font-extrabold">{fmtMin(min)}</span>
        <button type="button" onClick={() => setMin((m) => m + 15)} className="min-h-16 flex-1 rounded-2xl border-2 border-ink bg-white text-lg font-bold">
          + 15 min
        </button>
      </div>
      <button type="button" disabled={ocupado} onClick={() => onContinuar(sel, min, ontem ? somarDias(isoLocal(new Date()), -1) : undefined)} className="min-h-18 rounded-3xl bg-ok text-2xl font-extrabold text-white">
        REGISTRAR
      </button>
      <button type="button" onClick={() => setSel(null)} className="min-h-14 rounded-2xl bg-line text-lg font-bold">
        Escolher outra
      </button>
    </Cartao>
  )
}
