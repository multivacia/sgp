import { useState } from 'react'
import { fotosExemplo } from './fotosExemplo'
import { prepararFoto } from './redimensionar'

/** Dois botões grandes: abrir a câmera (traseira) ou escolher da galeria. Devolve a foto já reduzida. */
export function EscolherFoto({ onFoto, rotulo = 'Tirar foto', desativado = false }: { onFoto: (b: Blob) => void | Promise<void>; rotulo?: string; desativado?: boolean }) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [verExemplos, setVerExemplos] = useState(false)
  const exemplos = fotosExemplo()

  async function usarExemplo(url: string) {
    setVerExemplos(false)
    setOcupado(true)
    setErro(null)
    try {
      await onFoto(await prepararFoto(await (await fetch(url)).blob()))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível usar a foto.')
    } finally {
      setOcupado(false)
    }
  }

  async function receber(f: File | undefined, input: HTMLInputElement) {
    input.value = ''
    if (!f) return
    setOcupado(true)
    setErro(null)
    try {
      await onFoto(await prepararFoto(f))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a foto.')
    } finally {
      setOcupado(false)
    }
  }

  const botao = `flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-xl text-lg font-bold ${desativado || ocupado ? 'pointer-events-none opacity-50' : ''}`
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2.5">
        <label className={`${botao} bg-cta text-ink shadow-[var(--shadow-cta)]`}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h3l2-3h6l2 3h3v13H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
          </svg>
          {ocupado ? 'Preparando…' : rotulo}
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={desativado || ocupado} onChange={(e) => void receber(e.target.files?.[0], e.target)} />
        </label>
        <label className={`${botao} border-2 border-line-strong bg-white`}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 1 0 0-.01" />
          </svg>
          Galeria
          <input type="file" accept="image/*" className="sr-only" disabled={desativado || ocupado} onChange={(e) => void receber(e.target.files?.[0], e.target)} />
        </label>
      </div>
      {exemplos.length ? (
        <button type="button" disabled={desativado || ocupado} onClick={() => setVerExemplos(true)} className="min-h-12 rounded-xl border-2 border-dashed border-line-strong bg-white font-bold">
          Escolher entre as fotos de exemplo ({exemplos.length})
        </button>
      ) : null}
      {erro ? <p role="alert" className="font-bold text-danger">{erro}</p> : null}
      {verExemplos ? (
        <div className="fixed inset-0 z-40 flex items-end bg-ink/50" onClick={() => setVerExemplos(false)}>
          <div role="dialog" aria-label="Fotos de exemplo" onClick={(e) => e.stopPropagation()} className="flex max-h-[85dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            <h2 className="font-display text-2xl font-extrabold">Fotos de exemplo</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {exemplos.map((f) => (
                <button key={f.url} type="button" onClick={() => void usarExemplo(f.url)} className="card flex flex-col gap-1 p-1.5 text-left">
                  <img src={f.url} alt="" className="aspect-[4/3] w-full rounded-lg bg-ground object-cover" />
                  <span className="px-1 text-sm font-bold leading-tight">{f.nome}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setVerExemplos(false)} className="min-h-14 rounded-xl bg-line font-bold">
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
