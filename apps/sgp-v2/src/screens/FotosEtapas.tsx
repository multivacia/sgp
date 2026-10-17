import { useEffect, useState } from 'react'
import { enviarFoto, listarFotos, removerFoto } from '../api/etapaImagens'
import { getMatrixTree, listMatrices, type MatrixItem } from '../api/matrix'
import { useSession } from '../auth/context'
import { fotoDaEtapa, type FotoEtapa } from '../domain/fotosEtapas'
import { displayName, figuraDaEtapa, tasksOf, type MatrixNode } from '../domain/novaEsteira'
import { EscolherFoto } from '../ui/EscolherFoto'
import { aoMudarLocais, listarLocais, removerLocal, salvarLocal, type FotoLocal } from '../ui/fotosLocais'

type Local = FotoLocal & { url: string }

/**
 * Fotos das etapas da matriz. A foto tirada fica guardada **neste aparelho** até alguém tocar em
 * "Enviar para o banco"; depois de enviada, aparece no cardápio de todos.
 */
export function FotosEtapas() {
  const { state } = useSession()
  const pode = state.status === 'authenticated' && state.user.permissions.includes('operation_matrix.manage')
  const [matrizes, setMatrizes] = useState<MatrixItem[] | null>(null)
  const [matrizId, setMatrizId] = useState<string | null>(null)
  const [arvore, setArvore] = useState<MatrixNode | null>(null)
  const [fotos, setFotos] = useState<FotoEtapa[]>([])
  const [locais, setLocais] = useState<Local[]>([])
  const [etapa, setEtapa] = useState<MatrixNode | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!pode) return
    listMatrices()
      .then((m) => {
        setMatrizes(m)
        setMatrizId(m[0]?.id ?? null)
      })
      .catch(() => setErro('Não foi possível carregar as matrizes.'))
    void listarFotos(true).then(setFotos)
  }, [pode])

  useEffect(() => {
    let vivo = true
    let urls: string[] = []
    const carregar = () =>
      void listarLocais('etapa').then((ls) => {
        if (!vivo) return
        urls.forEach((u) => URL.revokeObjectURL(u))
        const comUrl = ls.map((l) => ({ ...l, url: URL.createObjectURL(l.blob) }))
        urls = comUrl.map((l) => l.url)
        setLocais(comUrl)
      })
    carregar()
    const parar = aoMudarLocais(carregar)
    return () => {
      vivo = false
      parar()
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])

  useEffect(() => {
    if (!matrizId) return
    let vivo = true
    getMatrixTree(matrizId)
      .then((t) => vivo && setArvore(t))
      .catch(() => vivo && setErro('Não foi possível abrir a matriz.'))
    return () => {
      vivo = false
    }
  }, [matrizId])

  if (!pode)
    return (
      <section className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold">Fotos das etapas</h1>
        <p className="text-muted">Só quem cuida da matriz troca as fotos.</p>
      </section>
    )

  async function fazer(acao: () => Promise<void>, fechar = false) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      setFotos(await listarFotos(true))
      if (fechar) setEtapa(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setOcupado(false)
    }
  }

  const localDe = (t: MatrixNode) => locais.find((l) => l.alvoId === t.id) ?? null
  const bancoDe = (t: MatrixNode) => fotoDaEtapa(fotos, t.name, t.id)
  const pendentes = arvore ? tasksOf(arvore).filter((t) => localDe(t)) : []

  return (
    <section className="flex flex-col gap-3">
      <h1 className="font-display text-3xl font-extrabold">Fotos das etapas</h1>
      <p className="text-muted">A foto fica guardada neste aparelho até você enviar para o banco. Depois de enviada, aparece no cardápio de todos. Sem foto, fica a ilustração.</p>
      {erro && !etapa ? <p role="alert" className="font-bold text-danger">{erro}</p> : null}
      {pendentes.length ? (
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-cta bg-accent-soft p-3">
          <p className="font-bold">
            {pendentes.length} {pendentes.length === 1 ? 'foto guardada só neste aparelho' : 'fotos guardadas só neste aparelho'}
          </p>
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              void fazer(async () => {
                for (const t of pendentes) {
                  const l = localDe(t)!
                  await enviarFoto(t.id, l.blob)
                  await removerLocal(l.chave)
                }
              })
            }
            className="btn-primary"
          >
            {ocupado ? 'Enviando…' : 'Enviar todas para o banco'}
          </button>
        </div>
      ) : null}
      {matrizes && matrizes.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Matriz">
          {matrizes.map((m) => (
            <button key={m.id} type="button" aria-pressed={m.id === matrizId} onClick={() => setMatrizId(m.id)} className={`min-h-12 rounded-2xl px-4 font-bold ${m.id === matrizId ? 'bg-ink text-white' : 'border-2 border-line bg-white'}`}>
              {m.name}
            </button>
          ))}
        </div>
      ) : null}
      {!arvore ? <p className="text-muted">Carregando…</p> : null}
      <div className="grid grid-cols-2 gap-2.5">
        {arvore
          ? tasksOf(arvore).map((t, i) => {
              const local = localDe(t)
              const banco = bancoDe(t)
              const fig = local?.url ?? banco ?? figuraDaEtapa(t.name)
              const [tag, tom] = local ? ['Neste aparelho', 'bg-cta text-ink'] : banco ? ['Foto', 'bg-ok text-white'] : ['Ilustração', 'border border-line bg-white text-muted']
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setErro(null)
                    setEtapa(t)
                  }}
                  className="card flex flex-col gap-1.5 p-2 text-left"
                >
                  <span className="relative block">
                    {fig ? <img src={fig} alt="" className="h-28 w-full rounded-xl bg-white object-cover" /> : <span className="block h-28 rounded-xl bg-ground" />}
                    <span className="absolute left-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                    <span className={`absolute right-1.5 top-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold ${tom}`}>{tag}</span>
                  </span>
                  <span className="font-bold leading-tight">{displayName(t.name)}</span>
                </button>
              )
            })
          : null}
      </div>

      {etapa ? <Folha etapa={etapa} local={localDe(etapa)} banco={bancoDe(etapa)} ocupado={ocupado} erro={erro} fazer={fazer} fechar={() => setEtapa(null)} /> : null}
    </section>
  )
}

function Folha({ etapa, local, banco, ocupado, erro, fazer, fechar }: { etapa: MatrixNode; local: Local | null; banco: string | null; ocupado: boolean; erro: string | null; fazer: (a: () => Promise<void>, fechar?: boolean) => Promise<void>; fechar: () => void }) {
  const src = local?.url ?? banco ?? figuraDaEtapa(etapa.name)
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={() => !ocupado && fechar()}>
      <div role="dialog" aria-label={`Foto de ${displayName(etapa.name)}`} onClick={(e) => e.stopPropagation()} className="flex max-h-[90dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        <h2 className="font-display text-2xl font-extrabold">{displayName(etapa.name)}</h2>
        {src ? <img src={src} alt="" className="max-h-72 w-full rounded-2xl bg-ground object-contain" /> : null}
        <p className="font-bold text-muted">{local ? `Guardada só neste aparelho (${Math.round(local.blob.size / 1024)} KB), ainda não enviada.` : banco ? 'Foto no banco: todos veem.' : 'Sem foto: mostra a ilustração.'}</p>
        {erro ? <p role="alert" className="font-bold text-danger">{erro}</p> : null}
        {local ? (
          <>
            <button
              type="button"
              disabled={ocupado}
              onClick={() =>
                void fazer(async () => {
                  await enviarFoto(etapa.id, local.blob)
                  await removerLocal(local.chave)
                }, true)
              }
              className="min-h-16 rounded-xl bg-ok text-lg font-bold text-white"
            >
              {ocupado ? 'Enviando…' : 'Enviar para o banco'}
            </button>
            <button type="button" disabled={ocupado} onClick={() => void removerLocal(local.chave)} className="min-h-14 rounded-xl border-2 border-danger font-bold text-danger">
              Descartar a foto deste aparelho
            </button>
          </>
        ) : null}
        <EscolherFoto
          rotulo={local || banco ? 'Tirar outra' : 'Tirar foto'}
          desativado={ocupado}
          onFoto={(blob) => salvarLocal({ chave: `etapa:${etapa.id}`, tipo: 'etapa', alvoId: etapa.id, nome: etapa.name, blob, criadaEm: new Date().toISOString() })}
        />
        {banco && !local ? (
          <button type="button" disabled={ocupado} onClick={() => void fazer(() => removerFoto(etapa.id), true)} className="min-h-14 rounded-xl border-2 border-danger font-bold text-danger">
            Voltar à ilustração
          </button>
        ) : null}
        <button type="button" disabled={ocupado} onClick={fechar} className="min-h-14 rounded-xl bg-line font-bold">
          Fechar
        </button>
      </div>
    </div>
  )
}
