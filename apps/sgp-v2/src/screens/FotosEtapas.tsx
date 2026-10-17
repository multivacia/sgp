import { useEffect, useState } from 'react'
import { enviarFoto, listarFotos, removerFoto } from '../api/etapaImagens'
import { getMatrixTree, listMatrices, type MatrixItem } from '../api/matrix'
import { useSession } from '../auth/context'
import { fotoDaEtapa, type FotoEtapa } from '../domain/fotosEtapas'
import { displayName, figuraDaEtapa, tasksOf, type MatrixNode } from '../domain/novaEsteira'
import { prepararFoto } from '../ui/redimensionar'

/** Fotos das etapas da matriz: a gestora tira/escolhe a foto e ela aparece no cardápio da Nova esteira. */
export function FotosEtapas() {
  const { state } = useSession()
  const pode = state.status === 'authenticated' && state.user.permissions.includes('operation_matrix.manage')
  const [matrizes, setMatrizes] = useState<MatrixItem[] | null>(null)
  const [matrizId, setMatrizId] = useState<string | null>(null)
  const [arvore, setArvore] = useState<MatrixNode | null>(null)
  const [fotos, setFotos] = useState<FotoEtapa[]>([])
  const [etapa, setEtapa] = useState<MatrixNode | null>(null)
  const [nova, setNova] = useState<{ blob: Blob; url: string } | null>(null)
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
    if (!matrizId) return
    let vivo = true
    getMatrixTree(matrizId)
      .then((t) => vivo && setArvore(t))
      .catch(() => vivo && setErro('Não foi possível abrir a matriz.'))
    return () => {
      vivo = false
    }
  }, [matrizId])

  useEffect(
    () => () => {
      if (nova) URL.revokeObjectURL(nova.url)
    },
    [nova],
  )

  if (!pode)
    return (
      <section className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold">Fotos das etapas</h1>
        <p className="text-muted">Só quem cuida da matriz troca as fotos.</p>
      </section>
    )

  async function escolher(f: File | undefined) {
    if (!f) return
    setErro(null)
    setOcupado(true)
    try {
      const blob = await prepararFoto(f)
      setNova({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a foto.')
    } finally {
      setOcupado(false)
    }
  }

  async function gravar(acao: () => Promise<void>) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      setFotos(await listarFotos(true))
      setNova(null)
      setEtapa(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setOcupado(false)
    }
  }

  const temFoto = (t: MatrixNode) => fotoDaEtapa(fotos, t.name, t.id)

  return (
    <section className="flex flex-col gap-3">
      <h1 className="font-display text-3xl font-extrabold">Fotos das etapas</h1>
      <p className="text-muted">A foto aparece no cardápio da Nova esteira e na alteração. Sem foto, fica a ilustração.</p>
      {erro && !etapa ? <p role="alert" className="font-bold text-danger">{erro}</p> : null}
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
              const foto = temFoto(t)
              const fig = foto ?? figuraDaEtapa(t.name)
              return (
                <button key={t.id} type="button" onClick={() => setEtapa(t)} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-2 text-left">
                  <span className="relative block">
                    {fig ? <img src={fig} alt="" className="h-28 w-full rounded-xl bg-white object-cover" /> : <span className="block h-28 rounded-xl bg-ground" />}
                    <span className="absolute left-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                    <span className={`absolute right-1.5 top-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold ${foto ? 'bg-ok text-white' : 'border border-line bg-white text-muted'}`}>{foto ? 'Foto' : 'Ilustração'}</span>
                  </span>
                  <span className="font-bold leading-tight">{displayName(t.name)}</span>
                </button>
              )
            })
          : null}
      </div>

      {etapa ? (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={() => !ocupado && (setEtapa(null), setNova(null))}>
          <div role="dialog" aria-label={`Foto de ${displayName(etapa.name)}`} onClick={(e) => e.stopPropagation()} className="flex max-h-[90dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            <h2 className="font-display text-2xl font-extrabold">{displayName(etapa.name)}</h2>
            {(() => {
              const src = nova?.url ?? temFoto(etapa) ?? figuraDaEtapa(etapa.name)
              return src ? <img src={src} alt="" className="max-h-72 w-full rounded-2xl bg-ground object-contain" /> : null
            })()}
            {erro ? <p role="alert" className="font-bold text-danger">{erro}</p> : null}
            {nova ? (
              <>
                <p className="text-muted">Foto nova, ainda não salva ({Math.round(nova.blob.size / 1024)} KB).</p>
                <button type="button" disabled={ocupado} onClick={() => void gravar(() => enviarFoto(etapa.id, nova.blob))} className="min-h-16 rounded-2xl bg-ok text-lg font-bold text-white">
                  {ocupado ? 'Salvando…' : 'Salvar foto'}
                </button>
              </>
            ) : null}
            <label className="flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 border-ink text-lg font-bold">
              {ocupado && !nova ? 'Preparando…' : nova ? 'Escolher outra' : 'Tirar ou escolher foto'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => void escolher(e.target.files?.[0])} />
            </label>
            {temFoto(etapa) && !nova ? (
              <button type="button" disabled={ocupado} onClick={() => void gravar(() => removerFoto(etapa.id))} className="min-h-14 rounded-2xl border-2 border-danger font-bold text-danger">
                Voltar à ilustração
              </button>
            ) : null}
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                setEtapa(null)
                setNova(null)
              }}
              className="min-h-14 rounded-2xl bg-line font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
