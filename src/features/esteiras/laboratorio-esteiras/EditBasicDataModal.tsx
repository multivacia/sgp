import type { LabBasicDataDraft } from './laboratorioEsteiras.types'

type Props = {
  open: boolean
  data: LabBasicDataDraft
  onChange: (patch: Partial<LabBasicDataDraft>) => void
  onClose: () => void
  onSave: () => void
}

export function EditBasicDataModal({ open, data, onChange, onClose, onSave }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-basic-data-title"
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-semantic-surface-panel-raised p-5"
      >
        <h2 id="edit-basic-data-title" className="font-heading text-lg font-bold text-white">
          Dados básicos
        </h2>
        <p className="mt-1 text-xs text-slate-400">Informações da esteira antes de salvar.</p>

        <div className="mt-4 space-y-3">
          <Field label="Cliente" value={data.cliente} onChange={(v) => onChange({ cliente: v })} />
          <Field
            label="Descrição"
            value={data.descricao}
            onChange={(v) => onChange({ descricao: v })}
            placeholder="Ex.: Esteira – Produção Sofá 3 lugares"
          />
          <Field
            label="Quantidade"
            value={data.quantidade}
            onChange={(v) => onChange({ quantidade: v })}
            placeholder="Ex.: 20 un"
          />
          <Field
            label="Prazo"
            value={data.prazo}
            onChange={(v) => onChange({ prazo: v })}
            placeholder="Ex.: 30/05/2025"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="sgp-cta-secondary py-2.5 text-sm">
            Cancelar
          </button>
          <button type="button" onClick={onSave} className="sgp-cta-primary py-2.5 text-sm">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="sgp-input-app w-full px-3 py-2.5 text-sm"
      />
    </div>
  )
}
