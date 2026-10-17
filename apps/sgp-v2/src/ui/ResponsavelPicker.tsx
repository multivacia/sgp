import { nomeCurto, type Collaborator } from '../domain/novaEsteira'

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

type Props = {
  titulo: string
  setor: string
  padraoId: string | null
  padraoLabel: string
  atualId: string | null
  colaboradores: Collaborator[]
  onPick: (id: string) => void
  onClose: () => void
}

/** "Quem vai fazer?": padrão (da matriz), do setor (pelo setor do cadastro) e os demais. */
export function ResponsavelPicker({ titulo, setor, padraoId, padraoLabel, atualId, colaboradores, onPick, onClose }: Props) {
  const padrao = colaboradores.filter((c) => c.id === padraoId)
  const doSetor = colaboradores.filter((c) => c.id !== padraoId && norm(c.sector_name) !== '' && norm(c.sector_name) === norm(setor))
  const outros = colaboradores.filter((c) => c.id !== padraoId && !doSetor.includes(c))
  const grupos = [
    { titulo: padraoLabel, lista: padrao },
    { titulo: `Do setor ${setor}`, lista: doSetor },
    { titulo: 'Outros colaboradores', lista: outros },
  ].filter((g) => g.lista.length > 0)

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end bg-ink/55">
      <button type="button" aria-label="Fechar" onClick={onClose} className="min-h-20 flex-1" />
      <div role="dialog" aria-label="Quem vai fazer?" className="flex max-h-[80dvh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white px-4 pb-8 pt-3">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-line" />
        <p className="font-bold text-muted">{titulo}</p>
        <h2 className="font-display text-2xl font-extrabold">Quem vai fazer?</h2>
        {grupos.map((g) => (
          <div key={g.titulo} className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-muted">{g.titulo}</span>
            <div className="grid grid-cols-2 gap-2">
              {g.lista.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === atualId}
                  onClick={() => onPick(c.id)}
                  className={`flex min-h-14 items-center gap-2 rounded-2xl px-2 text-left font-bold ${c.id === atualId ? 'border-[3px] border-blue bg-accent-soft' : 'border-2 border-line bg-white'}`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-soft text-navy-blue font-extrabold">{nomeCurto(c).charAt(0)}</span>
                  <span className="leading-tight">{nomeCurto(c)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={onClose} className="min-h-12 font-bold underline">
          Cancelar
        </button>
      </div>
    </div>
  )
}
