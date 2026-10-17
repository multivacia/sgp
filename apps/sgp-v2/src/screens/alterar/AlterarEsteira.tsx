import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { getConveyor, patchConveyorDados, patchConveyorStructure } from '../../api/conveyors'
import { getMatrixTree, listCollaborators } from '../../api/matrix'
import {
  buildPatchBody,
  changesOf,
  currentResp,
  emptyEdit,
  isLocked,
  primaryId,
  reasonText,
  setStepResp,
  toggleStep,
  toggleSteps,
  type Edit,
} from '../../domain/alterarEsteira'
import { primaryAssignee, stepState, type ConveyorDetail, type ConveyorStep } from '../../domain/conveyors'
import { fmtMin } from '../../domain/format'
import {
  activitiesOf,
  displayName,
  figuraDaEtapa,
  minutesOf,
  nomeCurto,
  responsavelDe,
  sectorsOf,
  setResponsavel,
  taskActivities,
  tasksOf,
  toggleActivity,
  toggleGroup,
  type Collaborator,
  type MatrixNode,
} from '../../domain/novaEsteira'
import { dadosDe, erroDados, mudancasDados, patchDados, PRIORIDADES, type DadosEsteira } from '../../domain/dadosEsteira'
import { FormDados } from '../../ui/FormDados'
import { ResponsavelPicker } from '../../ui/ResponsavelPicker'
import { AtividadeRow, AtividadeTravada, BottomBar, EtapaCard, SetorBox, WizardHeader } from '../../ui/wizard'

/** Motivos padronizados (o texto vai no campo "motivo" que a V1 já exige fora do backlog). */
const MOTIVOS = ['Cliente pediu mudança', 'Falta de peça ou material', 'Erro na montagem da esteira', 'Retrabalho', 'Mudança de prioridade', 'Outro motivo']

type Tela = { t: 'etapas' } | { t: 'etapa'; optionId: string } | { t: 'nova'; taskId: string } | { t: 'dados' } | { t: 'motivo' }
type Picker = { titulo: string; setor: string; padraoId: string | null; atualId: string | null; onPick: (id: string) => void }

const norm = (s: string) => displayName(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function AlterarEsteira() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [d, setD] = useState<ConveyorDetail | null>(null)
  const [matriz, setMatriz] = useState<MatrixNode | null>(null)
  const [colabs, setColabs] = useState<Collaborator[]>([])
  const [edit, setEdit] = useState<Edit>(emptyEdit)
  const [dados, setDados] = useState<DadosEsteira | null>(null)
  const [tela, setTela] = useState<Tela>({ t: 'etapas' })
  const [picker, setPicker] = useState<Picker | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    getConveyor(id, true)
      .then((x) => {
        setD(x)
        setDados(dadosDe(x))
        if (x.matrixRootItemId) getMatrixTree(x.matrixRootItemId).then(setMatriz).catch(() => setMatriz(null))
      })
      .catch(() => setErro('Não foi possível abrir a esteira.'))
    listCollaborators().then(setColabs).catch(() => setColabs([]))
  }, [id])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tela])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2500)
    return () => clearTimeout(t)
  }, [aviso])

  const colabPorId = useMemo(() => new Map(colabs.map((c) => [c.id, c])), [colabs])
  const nome = (cid: string | null) => (cid ? nomeCurto(colabPorId.get(cid)) : 'sem responsável')

  if (erro && !d) return <p role="alert" className="p-6 font-bold text-danger">{erro}</p>
  if (!d || !dados) return <p className="p-6 text-muted">Carregando…</p>

  const dadosAntes = dadosDe(d)
  const mudEstrutura = changesOf(d, edit, nome)
  const mudDados = mudancasDados(dadosAntes, dados)
  const patchD = patchDados(dadosAntes, dados)
  const mud = { ...mudEstrutura, lista: [...mudDados, ...mudEstrutura.lista] }
  const emElaboracao = d.operationalStatus === 'EM_ELABORACAO'
  const erroD = erroDados(dados)
  const nomesNaEsteira = new Set(d.structure.options.map((o) => norm(o.name)))
  const deFora = matriz ? tasksOf(matriz).filter((t) => !nomesNaEsteira.has(norm(t.name))) : []

  // totais da esteira como vai ficar
  const ativasExist = d.structure.options.flatMap((o) => o.areas.flatMap((a) => a.steps)).filter((s) => stepState(s.operationalStatus) !== 'interrompido' && (isLocked(s) || !edit.off.has(s.id)))
  const ativasNovas = edit.add.flatMap((t) => taskActivities(t).filter((a) => !edit.addDraft.off.has(a.id)))
  const etapasCount =
    d.structure.options.filter((o) => o.areas.some((a) => a.steps.some((s) => isLocked(s) || !edit.off.has(s.id)))).length +
    edit.add.filter((t) => taskActivities(t).some((a) => !edit.addDraft.off.has(a.id))).length
  const minutos =
    ativasExist.reduce((x, s) => x + (s.plannedMinutes ?? 0) * (s.plannedQuantity ?? 1), 0) + ativasNovas.reduce((x, a) => x + minutesOf(a), 0)
  const reason = reasonText(motivo, detalhe)
  // V1: motivo só é exigido depois que a esteira sai da elaboração (MSG-EST-001)
  const podeConfirmar = (emElaboracao || !!reason) && !erroD && !salvando

  async function salvar() {
    if (!d || !podeConfirmar) return
    setSalvando(true)
    setErro(null)
    try {
      // mesmo motivo para dados e estrutura no mesmo salvamento (manual da V1, §41.2)
      if (Object.keys(patchD).length) await patchConveyorDados(d.id, { ...patchD, ...(reason ? { reason } : {}) })
      if (mudEstrutura.lista.length) await patchConveyorStructure(d.id, buildPatchBody(d, edit, reason))
      navigate(`/esteiras/${d.id}`, { replace: true })
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  function voltar() {
    if (tela.t === 'etapas') {
      if (mud.lista.length) setAviso('Continue para salvar, ou use "Descartar todas as mudanças".')
      else navigate(`/esteiras/${id}`)
    } else setTela({ t: 'etapas' })
  }

  const passo = tela.t === 'motivo' ? 2 : 1
  const pergunta = tela.t === 'etapas' ? 'Confira as etapas' : tela.t === 'motivo' ? (emElaboracao ? 'Confira e salve' : 'Por que está alterando?') : tela.t === 'dados' ? 'Dados da esteira' : 'Personalizar etapa'
  const placa = d.plate || d.name

  function travadaTexto(s: ConveyorStep): { texto: string; tone: 'feito' | 'andando' | 'parado' } {
    const st = stepState(s.operationalStatus)
    if (st === 'feito') return { texto: `Feito por ${s.completedByName ?? primaryAssignee(s) ?? '—'} · não muda`, tone: 'feito' }
    if (st === 'parado') return { texto: `Parado com ${primaryAssignee(s) ?? '—'} · não muda`, tone: 'parado' }
    if (st === 'interrompido') return { texto: 'Interrompida · não muda', tone: 'parado' }
    return { texto: `Em andamento com ${primaryAssignee(s) ?? '—'} · não muda`, tone: 'andando' }
  }

  const option = tela.t === 'etapa' ? d.structure.options.find((o) => o.id === tela.optionId) : null
  const novaTask = tela.t === 'nova' ? edit.add.find((t) => t.id === tela.taskId) ?? null : null

  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <WizardHeader sobre={`Alterar ${placa} · passo ${passo} de 2`} pergunta={pergunta} passo={passo} total={2} onBack={voltar} />

      <main className="flex flex-1 flex-col gap-3 px-4 pb-40 pt-4">
        {erro ? <p role="alert" className="rounded-2xl border-2 border-danger bg-danger-soft p-3 font-bold text-danger">{erro}</p> : null}

        {tela.t === 'etapas' ? (
          <>
            <button type="button" onClick={() => setTela({ t: 'dados' })} className="flex flex-col gap-1 rounded-2xl border-2 border-ink bg-white p-3 text-left">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold tracking-wide text-muted">DADOS DA ESTEIRA</span>
                {mudDados.length ? <span className="rounded-lg bg-late-soft px-2 py-0.5 text-sm font-bold text-late-ink">{mudDados.length} {mudDados.length === 1 ? 'mudança' : 'mudanças'}</span> : <span className="text-sm font-bold underline">Alterar</span>}
              </span>
              <span className="font-display text-xl font-extrabold leading-tight">{dados.nome || d.name}</span>
              <span className="text-muted">
                {[dados.placa, dados.cliente, dados.prazoEstimado ? `prazo ${dados.prazoEstimado.slice(8, 10)}/${dados.prazoEstimado.slice(5, 7)}` : 'sem prazo', `prioridade ${PRIORIDADES.find((p) => p.v === dados.prioridade)?.label.toLowerCase()}`, dados.responsavel].filter(Boolean).join(' · ')}
              </span>
            </button>
            <p className="text-muted">Marcadas vão ser feitas. Toque na figura para tirar ou incluir. "Personalizar" mostra setores e atividades. O cadeado marca o que já foi feito.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {d.structure.options.map((o, i) => {
                const steps = o.areas.flatMap((a) => a.steps)
                const travadas = steps.filter(isLocked)
                const feitas = steps.filter((s) => stepState(s.operationalStatus) === 'feito').length
                const ligadas = steps.filter((s) => isLocked(s) || !edit.off.has(s.id))
                const on = ligadas.length > 0
                const toda = feitas === steps.length && steps.length > 0
                const situacao = toda ? 'feita · com cadeado' : travadas.length ? `${feitas}/${steps.length} feitas · em andamento` : 'não começou'
                return (
                  <EtapaCard
                    key={o.id}
                    numero={i + 1}
                    nome={displayName(o.name)}
                    figura={figuraDaEtapa(o.name)}
                    on={on}
                    tag={toda ? 'Feita' : on ? 'Incluída' : 'Fora'}
                    tagTone={toda ? 'feita' : on ? 'ok' : 'fora'}
                    info={on ? `${ligadas.length} ativ. · ~${fmtMin(ligadas.reduce((x, s) => x + (s.plannedMinutes ?? 0) * (s.plannedQuantity ?? 1), 0))} · ${situacao}` : 'Tirada desta esteira'}
                    mudancas={mud.porEtapa[o.id] ?? 0}
                    toggleLabel={`${on ? 'Tirar' : 'Incluir'} ${displayName(o.name)}`}
                    onToggle={() => {
                      if (travadas.length) {
                        setTela({ t: 'etapa', optionId: o.id })
                        setAviso(toda ? 'Etapa feita: tudo com cadeado.' : 'Etapa já começou: tire só o que falta.')
                      } else setEdit(toggleSteps(edit, steps))
                    }}
                    onPersonalizar={() => setTela({ t: 'etapa', optionId: o.id })}
                  />
                )
              })}
              {deFora.map((t, i) => {
                const incluida = edit.add.find((x) => x.id === t.id)
                const ativs = taskActivities(t)
                const ligadas = incluida ? ativs.filter((a) => !edit.addDraft.off.has(a.id)) : []
                return (
                  <EtapaCard
                    key={t.id}
                    numero={d.structure.options.length + i + 1}
                    nome={displayName(t.name)}
                    figura={figuraDaEtapa(t.name)}
                    on={!!incluida}
                    tag={incluida ? 'Incluída agora' : 'Fora'}
                    info={incluida ? `${ligadas.length} ativ. · ~${fmtMin(ligadas.reduce((x, a) => x + minutesOf(a), 0))}` : 'Não está na esteira'}
                    mudancas={incluida ? 1 : 0}
                    toggleLabel={`${incluida ? 'Tirar' : 'Incluir'} ${displayName(t.name)}`}
                    onToggle={() => setEdit({ ...edit, add: incluida ? edit.add.filter((x) => x.id !== t.id) : [...edit.add, t] })}
                    onPersonalizar={() => setTela({ t: 'nova', taskId: t.id })}
                  />
                )
              })}
            </div>
            {mud.lista.length ? (
              <button type="button" onClick={() => navigate(`/esteiras/${id}`)} className="min-h-12 self-center font-bold text-danger underline">
                Descartar todas as mudanças
              </button>
            ) : null}
          </>
        ) : null}

        {option ? (
          <>
            <EtapaTopo nome={option.name} info={`${option.areas.flatMap((a) => a.steps).filter((s) => isLocked(s) || !edit.off.has(s.id)).length} de ${option.areas.flatMap((a) => a.steps).length} atividades`} />
            <p className="text-muted">Toque para tirar o que não vai mais ser feito. O que tem cadeado já foi feito ou está em andamento e não muda.</p>
            {option.areas.map((a) => {
              const livres = a.steps.filter((s) => !isLocked(s))
              const livresOn = livres.filter((s) => !edit.off.has(s.id))
              const ativas = a.steps.filter((s) => isLocked(s) || !edit.off.has(s.id))
              return (
                <SetorBox
                  key={a.id}
                  nome={displayName(a.name)}
                  info={`${ativas.length} de ${a.steps.length} · ${fmtMin(ativas.reduce((x, s) => x + (s.plannedMinutes ?? 0) * (s.plannedQuantity ?? 1), 0))}${livres.length < a.steps.length ? ` · ${a.steps.length - livres.length} com cadeado` : ''}`}
                  ativo={ativas.length > 0}
                  toggle={livres.length && livres.length === a.steps.length ? { label: livresOn.length ? 'Tirar setor' : 'Incluir setor', onClick: () => setEdit(toggleSteps(edit, a.steps)) } : undefined}
                  trocarTodos={
                    livresOn.length > 1
                      ? () =>
                          setPicker({
                            titulo: `Setor ${displayName(a.name)} · ${livresOn.length} atividades`,
                            setor: displayName(a.name),
                            padraoId: primaryId(livresOn[0]),
                            atualId: currentResp(edit, livresOn[0]),
                            onPick: (cid) => setEdit(setStepResp(edit, livresOn, cid)),
                          })
                      : undefined
                  }
                >
                  {a.steps.map((s) =>
                    isLocked(s) ? (
                      <AtividadeTravada key={s.id} nome={s.name} {...travadaTexto(s)} />
                    ) : (
                      <AtividadeRow
                        key={s.id}
                        nome={s.name}
                        min={(s.plannedMinutes ?? 0) * (s.plannedQuantity ?? 1)}
                        on={!edit.off.has(s.id)}
                        onToggle={() => setEdit(toggleStep(edit, s))}
                        resp={{
                          texto: `${nome(currentResp(edit, s))} ${edit.resp[s.id] ? `(trocado · antes: ${nome(primaryId(s))})` : ''}`.trim(),
                          trocado: !!edit.resp[s.id],
                          onTrocar: () =>
                            setPicker({ titulo: s.name, setor: displayName(a.name), padraoId: primaryId(s), atualId: currentResp(edit, s), onPick: (cid) => setEdit(setStepResp(edit, [s], cid)) }),
                        }}
                      />
                    ),
                  )}
                </SetorBox>
              )
            })}
          </>
        ) : null}

        {novaTask ? (
          <>
            <EtapaTopo nome={novaTask.name} info="Etapa incluída agora (vem da matriz)" />
            {sectorsOf(novaTask).map((sec) => {
              const ativs = activitiesOf(sec)
              const ligadas = ativs.filter((x) => !edit.addDraft.off.has(x.id))
              const upd = (draft: Edit['addDraft']) => setEdit({ ...edit, addDraft: draft })
              return (
                <SetorBox
                  key={sec.id}
                  nome={displayName(sec.name)}
                  info={`${ligadas.length} de ${ativs.length} · ${fmtMin(ligadas.reduce((x, a) => x + minutesOf(a), 0))}`}
                  ativo={ligadas.length > 0}
                  toggle={{ label: ligadas.length ? 'Tirar setor' : 'Incluir setor', onClick: () => upd(toggleGroup(edit.addDraft, ativs)) }}
                  trocarTodos={
                    ligadas.length > 1
                      ? () =>
                          setPicker({
                            titulo: `Setor ${displayName(sec.name)} · ${ligadas.length} atividades`,
                            setor: displayName(sec.name),
                            padraoId: ligadas[0].default_responsible_id,
                            atualId: responsavelDe(edit.addDraft, ligadas[0]),
                            onPick: (cid) => upd(setResponsavel(edit.addDraft, ligadas, cid)),
                          })
                      : undefined
                  }
                >
                  {ativs.map((a) => (
                    <AtividadeRow
                      key={a.id}
                      nome={a.name}
                      min={minutesOf(a)}
                      on={!edit.addDraft.off.has(a.id)}
                      onToggle={() => upd(toggleActivity(edit.addDraft, a))}
                      resp={{
                        texto: `${nome(responsavelDe(edit.addDraft, a))} ${edit.addDraft.resp[a.id] ? '(trocado)' : '(da matriz)'}`,
                        trocado: !!edit.addDraft.resp[a.id],
                        onTrocar: () =>
                          setPicker({ titulo: a.name, setor: displayName(sec.name), padraoId: a.default_responsible_id, atualId: responsavelDe(edit.addDraft, a), onPick: (cid) => upd(setResponsavel(edit.addDraft, [a], cid)) }),
                      }}
                    />
                  ))}
                </SetorBox>
              )
            })}
          </>
        ) : null}

        {tela.t === 'dados' ? (
          <>
            <FormDados
              parte="tudo"
              dados={dados}
              onChange={setDados}
              nomeResponsavel={dados.responsavel}
              onEscolherResponsavel={() =>
                setPicker({
                  titulo: 'Responsável pela esteira',
                  setor: '',
                  padraoId: null,
                  atualId: dados.colaboradorId,
                  onPick: (cid) => setDados({ ...dados, colaboradorId: cid, responsavel: colabPorId.get(cid)?.full_name ?? dados.responsavel }),
                })
              }
            />
            {erroD ? <p className="font-bold text-danger">{erroD}</p> : null}
          </>
        ) : null}

        {tela.t === 'motivo' ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted">{emElaboracao ? 'A esteira ainda está em elaboração: não precisa de motivo.' : 'Esta esteira já saiu do Backlog. Informe o motivo da alteração para manter a rastreabilidade operacional.'}</p>
            <div className="rounded-2xl border border-line bg-white p-3">
              <span className="text-sm font-bold text-muted">O QUE MUDA</span>
              {mud.lista.map((m) => (
                <p key={m}>· {m}</p>
              ))}
            </div>
            <span className="text-lg font-bold">{emElaboracao ? 'Motivo (opcional)' : 'Motivo'}</span>
            <div className="grid grid-cols-2 gap-2.5">
              {MOTIVOS.map((m) => (
                <button key={m} type="button" aria-pressed={motivo === m} onClick={() => setMotivo(m)} className={`min-h-16 rounded-2xl px-3 text-left font-bold ${motivo === m ? 'bg-ink text-white' : 'border-2 border-line bg-white'}`}>
                  {m}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-2 text-lg font-bold">
              {motivo === 'Outro motivo' ? 'Explique o motivo (obrigatório)' : 'Detalhe (opcional)'}
              <textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value.slice(0, 480))} rows={3} placeholder="Ex.: cliente pediu para manter o volante original" className="rounded-2xl border-2 border-ink bg-white p-3 text-lg font-normal" />
            </label>
          </div>
        ) : null}
      </main>

      <BottomBar
        titulo={`${etapasCount} etapas`}
        sub={`~${fmtMin(minutos)} · ${mud.lista.length ? `${mud.lista.length} ${mud.lista.length === 1 ? 'mudança' : 'mudanças'}` : 'sem mudanças'}`}
        label={tela.t === 'motivo' ? (salvando ? 'Salvando…' : 'Confirmar alteração') : tela.t === 'etapas' ? 'Continuar' : 'Pronto'}
        verde={tela.t === 'motivo'}
        enabled={tela.t === 'motivo' ? podeConfirmar : tela.t === 'etapas' ? mud.lista.length > 0 && !erroD : tela.t === 'dados' ? !erroD : true}
        onClick={() => (tela.t === 'motivo' ? void salvar() : tela.t === 'etapas' ? setTela({ t: 'motivo' }) : setTela({ t: 'etapas' }))}
      />

      {picker ? (
        <ResponsavelPicker
          titulo={picker.titulo}
          setor={picker.setor}
          padraoId={picker.padraoId}
          padraoLabel="Atual / da matriz"
          atualId={picker.atualId}
          colaboradores={colabs}
          onPick={(cid) => {
            picker.onPick(cid)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      ) : null}

      {aviso ? (
        <div role="status" className="fixed inset-x-4 bottom-28 z-30 rounded-2xl bg-ink p-4 text-center font-bold text-white">
          {aviso}
        </div>
      ) : null}
    </div>
  )
}

function EtapaTopo({ nome, info }: { nome: string; info: string }) {
  const fig = figuraDaEtapa(nome)
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-2.5">
      {fig ? <img src={fig} alt="" className="size-20 shrink-0 object-contain" /> : null}
      <div>
        <p className="font-display text-xl font-extrabold leading-tight">{displayName(nome)}</p>
        <p className="text-muted">{info}</p>
      </div>
    </div>
  )
}
