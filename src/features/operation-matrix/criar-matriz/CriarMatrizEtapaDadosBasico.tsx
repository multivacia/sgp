type Props = {
  name: string
  code: string
  description: string
  onChangeName: (v: string) => void
  onChangeCode: (v: string) => void
  onChangeDescription: (v: string) => void
  onContinuar: () => void
  onVoltarLista: () => void
  podeContinuar: boolean
}

export function CriarMatrizEtapaDadosBasico({
  name,
  code,
  description,
  onChangeName,
  onChangeCode,
  onChangeDescription,
  onContinuar,
  onVoltarLista,
  podeContinuar,
}: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <h2 className="font-heading text-lg text-slate-100">Dados básicos</h2>
      <p className="text-sm text-slate-500">
        Identifique a nova matriz. O nome é obrigatório; código e descrição são
        opcionais e ajudam em integrações e buscas.
      </p>
      <label className="block text-sm">
        <span className="text-slate-400">Nome *</span>
        <input
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100"
          value={name}
          onChange={(ev) => onChangeName(ev.target.value)}
          autoComplete="off"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Código (opcional)</span>
        <input
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100"
          value={code}
          onChange={(ev) => onChangeCode(ev.target.value)}
          autoComplete="off"
          placeholder="Ex.: CARPETE-01"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Descrição (opcional)</span>
        <textarea
          className="mt-1 min-h-[88px] w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100"
          value={description}
          onChange={(ev) => onChangeDescription(ev.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          className="sgp-cta-secondary"
          onClick={onVoltarLista}
        >
          Voltar
        </button>
        <button
          type="button"
          disabled={!podeContinuar}
          onClick={onContinuar}
          className="sgp-cta-primary disabled:opacity-40"
        >
          Continuar para estrutura
        </button>
      </div>
    </section>
  )
}
