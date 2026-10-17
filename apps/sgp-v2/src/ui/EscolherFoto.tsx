import { useState } from 'react'
import { prepararFoto } from './redimensionar'

/** Dois botões grandes: abrir a câmera (traseira) ou escolher da galeria. Devolve a foto já reduzida. */
export function EscolherFoto({ onFoto, rotulo = 'Tirar foto', desativado = false }: { onFoto: (b: Blob) => void | Promise<void>; rotulo?: string; desativado?: boolean }) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

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
      {erro ? <p role="alert" className="font-bold text-danger">{erro}</p> : null}
    </div>
  )
}
