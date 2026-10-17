import { useState } from 'react'
import { patchConveyorStatus } from '../api/conveyors'
import { useSession } from '../auth/context'
import { liberacaoDe, type ConveyorStatus } from '../domain/conveyors'

/** Botão "Liberar" da esteira (status da V1, um passo por vez). Só para quem tem `conveyors.edit_status`. */
export function Liberar({ id, status, onFeito }: { id: string; status: ConveyorStatus; onFeito: (novo: ConveyorStatus) => void }) {
  const { state } = useSession()
  const pode = state.status === 'authenticated' && state.user.permissions.includes('conveyors.edit_status')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const lib = liberacaoDe(status)
  if (!pode || !lib) return null
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border-2 border-ok bg-ok-soft p-3">
      <button
        type="button"
        disabled={ocupado}
        onClick={async () => {
          setOcupado(true)
          setErro(null)
          try {
            for (const p of lib.passos) await patchConveyorStatus(id, p)
            onFeito(lib.passos[lib.passos.length - 1])
          } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível liberar.')
          } finally {
            setOcupado(false)
          }
        }}
        className="min-h-14 rounded-xl bg-ok text-lg font-bold text-white"
      >
        {ocupado ? 'Liberando…' : lib.label}
      </button>
      <p className="text-ok">{lib.explica}</p>
      {erro ? <p role="alert" className="font-bold text-danger">{erro}</p> : null}
    </div>
  )
}
