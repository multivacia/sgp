import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createConveyor } from '../../api/conveyors'
import type { ConveyorStatus } from '../../domain/conveyors'
import { Liberar } from '../../ui/Liberar'
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
  type Draft,
  type MatrixNode,
} from '../../domain/novaEsteira'
import { fmtMin } from '../../domain/format'
import { dadosVazios, erroDados, nomeFinal, type DadosEsteira } from '../../domain/dadosEsteira'
import { FormDados } from '../../ui/FormDados'
import { useFiguras } from '../../ui/useFiguras'
import { ResponsavelPicker } from '../../ui/ResponsavelPicker'
import { AtividadeRow, BottomBar, EtapaCard, SetorBox, WizardHeader } from '../../ui/wizard'

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
  const [dados, setDados] = useState<DadosEsteira>(() => dadosVazios(prazoPara('sexta'), meuColab))
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const figura = useFiguras()
  const [criada, setCriada] = useState<{ id: string; name: string; operationalStatus?: ConveyorStatus } | null>(null)

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
      const resp = dados.colaboradorId ? colabPorId.get(dados.colaboradorId) : undefined
      const body = buildCreateBody(arvore, draft, { ...dados, responsavel: resp?.full_name ?? dados.responsavel })
      setCriada(await createConveyor(body))
      setPasso('pronto')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a esteira.')
    } finally {
      setSalvando(false)
    }
  }

  const podeSeguir = passo === 'etapas' ? tot.atividades > 0 : passo === 'carro' ? (dados.placa.trim() !== '' || dados.veiculo.trim() !== '') && !erroDados(dados, arvore ? displayName(arvore.name) : '') : passo === 'quando' ? dados.prazoEstimado !== '' && !salvando : true
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
        <WizardHeader sobre={`Nova esteira · passo ${NUM[passo]} de 4`} pergunta={PERGUNTA[passo]} passo={NUM[passo]} total={4} onBack={() => (VOLTA[passo] ? setPasso(VOLTA[passo]!) : navigate('/'))} />
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
              const fig = figuraDaEtapa(m.name) ?? `${import.meta.env.BASE_URL}etapas/18.webp`
              return (
                <button key={m.id} type="button" onClick={() => void escolherMatriz(m)} className="flex min-h-24 items-center gap-3 card p-2.5 text-left">
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
                return (
                  <EtapaCard
                    key={t.id}
                    numero={i + 1}
                    nome={displayName(t.name)}
                    figura={figura(t.name, t.id)}
                    on={on}
                    tag={on ? 'Incluída' : 'Fora'}
                    info={`${sectorsOf(t).length} setor${sectorsOf(t).length === 1 ? '' : 'es'} · ${ligadas.length} ativ. · ~${fmtMin(ligadas.reduce((x, a) => x + minutesOf(a), 0))}`}
                    mudancas={mudancas}
                    toggleLabel={`${on ? 'Tirar' : 'Incluir'} ${displayName(t.name)}`}
                    onToggle={() => setDraft(toggleGroup(draft, ativs))}
                    onPersonalizar={() => {
                      setEtapaId(t.id)
                      setPasso('etapa')
                    }}
                  />
                )
              })}
            </div>
          </>
        ) : null}

        {passo === 'etapa' && etapa ? (
          <>
            <div className="flex items-center gap-3 card p-2.5">
              {figura(etapa.name, etapa.id) ? <img src={figura(etapa.name, etapa.id)!} alt="" className="size-20 shrink-0 rounded-xl object-cover" /> : null}
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
                <SetorBox
                  key={s.id}
                  nome={displayName(s.name)}
                  info={`${ligadas.length} de ${ativs.length} · ${fmtMin(ligadas.reduce((x, a) => x + minutesOf(a), 0))}`}
                  ativo={ligadas.length > 0}
                  toggle={{ label: ligadas.length ? 'Tirar setor' : 'Incluir setor', onClick: () => setDraft(toggleGroup(draft, ativs)) }}
                  trocarTodos={ligadas.length > 1 ? () => setPicker({ titulo: `Setor ${displayName(s.name)} · ${ligadas.length} atividades`, setor: displayName(s.name), atividades: ligadas }) : undefined}
                >
                  {ativs.map((a) => {
                    const resp = responsavelDe(draft, a)
                    const trocado = !!draft.resp[a.id]
                    return (
                      <AtividadeRow
                        key={a.id}
                        nome={a.name}
                        min={minutesOf(a)}
                        on={!draft.off.has(a.id)}
                        onToggle={() => setDraft(toggleActivity(draft, a))}
                        resp={{
                          texto: `${resp ? nomeCurto(colabPorId.get(resp)) : 'Sem responsável'} ${trocado ? `(trocado · matriz: ${nomeCurto(colabPorId.get(a.default_responsible_id ?? ''))})` : resp ? '(da matriz)' : ''}`.trim(),
                          trocado,
                          onTrocar: () => setPicker({ titulo: a.name, setor: displayName(s.name), atividades: [a] }),
                        }}
                      />
                    )
                  })}
                </SetorBox>
              )
            })}
          </>
        ) : null}

        {passo === 'carro' ? (
          <FormDados parte="carro" dados={dados} onChange={setDados} matriz={arvore ? displayName(arvore.name) : ''} nomeResponsavel="" onEscolherResponsavel={() => undefined} />
        ) : null}

        {passo === 'quando' ? (
          <div className="flex flex-col gap-3">
            <FormDados
              parte="quando"
              dados={dados}
              onChange={setDados}
              nomeResponsavel={dados.colaboradorId ? nomeCurto(colabPorId.get(dados.colaboradorId)) : ''}
              onEscolherResponsavel={() => setPicker({ titulo: 'Responsável pela esteira', setor: '', atividades: [] })}
            />
            {arvore ? (
              <div className="mt-2 card p-3">
                <span className="text-sm font-bold text-muted">RESUMO</span>
                <p className="font-display text-xl font-extrabold">{arvore.name}</p>
                <p className="font-bold">{nomeFinal(dados, displayName(arvore.name))}</p>
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
              {tot.etapas} etapas · {tot.atividades} atividades · ~{fmtMin(tot.minutos)}. Ela nasce em elaboração: libere quando quiser planejar.
            </p>
            {criada.operationalStatus ? <Liberar id={criada.id} status={criada.operationalStatus} onFeito={(novo) => setCriada({ ...criada, operationalStatus: novo })} /> : null}
            <Link to={`/esteiras/${criada.id}`} className="btn-primary flex w-full items-center justify-center">
              Ver esteira
            </Link>
            <button
              type="button"
              onClick={() => {
                setDados({ ...dados, placa: '', cliente: '', nome: '' })
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
        <BottomBar
          titulo={`${tot.etapas} etapas`}
          sub={`${tot.atividades} atividades · ~${fmtMin(tot.minutos)}`}
          label={passo === 'quando' ? (salvando ? 'Criando…' : 'Criar esteira') : passo === 'etapa' ? 'Pronto' : 'Continuar'}
          enabled={podeSeguir}
          verde={passo === 'quando'}
          onClick={seguir}
        />
      ) : null}

      {picker ? (
        <ResponsavelPicker
          titulo={picker.titulo}
          setor={picker.setor}
          padraoId={picker.atividades.length ? picker.atividades[0].default_responsible_id : meuColab}
          padraoLabel={picker.atividades.length ? 'Da matriz' : 'Você'}
          atualId={picker.atividades.length ? responsavelDe(draft, picker.atividades[0]) : dados.colaboradorId}
          colaboradores={colabs}
          onPick={(id) => {
            if (picker.atividades.length) setDraft(setResponsavel(draft, picker.atividades, id))
            else setDados({ ...dados, colaboradorId: id, responsavel: colabPorId.get(id)?.full_name ?? '' })
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </div>
  )
}
