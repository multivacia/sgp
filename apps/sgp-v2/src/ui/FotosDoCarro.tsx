import { useCallback, useEffect, useState } from 'react'
import { enviarFotoEsteira, listarFotosEsteira, removerFotoEsteira, urlFotoEsteira, type FotoEsteira } from '../api/esteiraFotos'
import { useSession } from '../auth/context'
import { EscolherFoto } from './EscolherFoto'
import { aoMudarLocais, guardarFotoDoCarro, listarLocais, removerLocal, type FotoLocal } from './fotosLocais'

const MAX = 10
type Local = FotoLocal & { url: string }

/**
 * Fotos do veículo na esteira: as já enviadas (todos veem) e as guardadas só neste aparelho,
 * que vão para o banco quando alguém tocar em "Enviar". Incluir/remover: `conveyors.create`.
 */
export function FotosDoCarro({ conveyorId }: { conveyorId: string }) {
  const { state } = useSession()
  const pode = state.status === 'authenticated' && state.user.permissions.includes('conveyors.create')
  const [banco, setBanco] = useState<FotoEsteira[] | null>(null)
  const [locais, setLocais] = useState<Local[]>([])
  const [ver, setVer] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [apagar, setApagar] = useState<string | null>(null)

  const recarregarBanco = useCallback(() => listarFotosEsteira(conveyorId).then(setBanco).catch(() => setBanco([])), [conveyorId])

  useEffect(() => {
    void recarregarBanco()
  }, [recarregarBanco])

  useEffect(() => {
    let vivo = true
    let urls: string[] = []
    const carregar = () =>
      void listarLocais('esteira', conveyorId).then((ls) => {
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
  }, [conveyorId])

  async function fazer(acao: () => Promise<void>) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      await recarregarBanco()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setOcupado(false)
    }
  }

  const enviar = (ls: Local[]) =>
    fazer(async () => {
      for (const l of ls) {
        await enviarFotoEsteira(conveyorId, l.blob)
        await removerLocal(l.chave)
      }
    })

  const total = (banco?.length ?? 0) + locais.length
  if (!pode && banco?.length === 0) return null

  return (
    <div className="card flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">Fotos do carro</span>
        <span className="text-sm text-muted">
          {total} de {MAX}
        </span>
      </div>
      {banco === null ? <p className="text-muted">Carregando…</p> : null}
      {total > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {banco?.map((f) => (
            <div key={f.id} className="relative">
              <button type="button" onClick={() => setVer(urlFotoEsteira(conveyorId, f))} className="block w-full" aria-label="Ver foto">
                <img src={urlFotoEsteira(conveyorId, f)} alt="" className="aspect-square w-full rounded-xl bg-ground object-cover" />
              </button>
              {pode ? (
                apagar === f.id ? (
                  <button type="button" disabled={ocupado} onClick={() => void fazer(() => removerFotoEsteira(conveyorId, f.id)).then(() => setApagar(null))} className="absolute inset-x-1 bottom-1 min-h-9 rounded-lg bg-danger text-sm font-bold text-white">
                    Confirmar remover
                  </button>
                ) : (
                  <button type="button" onClick={() => setApagar(f.id)} aria-label="Remover foto" className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-danger shadow">
                    ×
                  </button>
                )
              ) : null}
            </div>
          ))}
          {locais.map((l) => (
            <div key={l.chave} className="relative">
              <button type="button" onClick={() => setVer(l.url)} className="block w-full" aria-label="Ver foto">
                <img src={l.url} alt="" className="aspect-square w-full rounded-xl bg-ground object-cover ring-2 ring-cta" />
              </button>
              <span className="absolute inset-x-1 top-1 rounded-md bg-cta px-1 text-center text-xs font-bold text-ink">Neste aparelho</span>
              <button type="button" onClick={() => void removerLocal(l.chave)} aria-label="Descartar foto deste aparelho" className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-danger shadow">
                ×
              </button>
            </div>
          ))}
        </div>
      ) : banco ? (
        <p className="text-muted">Nenhuma foto ainda.</p>
      ) : null}
      {locais.length ? (
        <button type="button" disabled={ocupado} onClick={() => void enviar(locais)} className="min-h-14 rounded-xl bg-ok text-lg font-bold text-white">
          {ocupado ? 'Enviando…' : `Enviar ${locais.length === 1 ? 'a foto' : `as ${locais.length} fotos`} para o banco`}
        </button>
      ) : null}
      {locais.length ? <p className="text-sm text-muted">As fotos marcadas "Neste aparelho" só aparecem aqui até serem enviadas.</p> : null}
      {erro ? <p role="alert" className="font-bold text-danger">{erro}</p> : null}
      {pode && total < MAX ? <EscolherFoto desativado={ocupado} onFoto={(b) => guardarFotoDoCarro(conveyorId, b)} /> : null}

      {ver ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/80 p-4" onClick={() => setVer(null)}>
          <img src={ver} alt="Foto do carro" className="max-h-full max-w-full rounded-2xl" />
        </div>
      ) : null}
    </div>
  )
}
