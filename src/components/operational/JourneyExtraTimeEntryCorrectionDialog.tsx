import { useEffect, useState } from 'react'
import type { OperationalJourneyExtraTimeEntry } from '../../domain/operational-journey/operational-journey.types'
import { operationalTodayIso } from '../../domain/operational/workDate'
import { listExtraTimeEntryDescriptions } from '../../services/my-activities/extraTimeEntriesApiService'
import {
  deleteExtraTimeEntry,
  editExtraTimeEntry,
} from '../../services/operational-journey/extraTimeEntryCorrectionsApiService'

type DescriptionOption = { id: string; description: string }

type Props = {
  entry: OperationalJourneyExtraTimeEntry
  mode: 'edit' | 'delete'
  onClose: () => void
  onMutated: () => Promise<void>
}

export function JourneyExtraTimeEntryCorrectionDialog({
  entry,
  mode,
  onClose,
  onMutated,
}: Props) {
  const [descriptionId, setDescriptionId] = useState(entry.descriptionId ?? '')
  const [entryDate, setEntryDate] = useState(entry.entryDate)
  const [minutes, setMinutes] = useState(String(entry.minutes))
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [reason, setReason] = useState('')
  const [options, setOptions] = useState<DescriptionOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'edit') return
    let alive = true
    void listExtraTimeEntryDescriptions()
      .then((rows) => {
        if (alive) setOptions(rows)
      })
      .catch(() => {
        if (alive) setError('Não foi possível carregar as descrições disponíveis.')
      })
      .finally(() => {
        if (alive) setLoadingOptions(false)
      })
    return () => { alive = false }
  }, [mode])

  const oldDescriptionActive = options.some((o) => o.id === entry.descriptionId)
  const validMinutes = /^\d+$/.test(minutes) && Number.isSafeInteger(Number(minutes)) && Number(minutes) > 0
  const canSubmit = !saving && reason.trim().length > 0 && (
    mode === 'delete' || (
      !loadingOptions && descriptionId.length > 0 && entryDate.length === 10 &&
      validMinutes && notes.length <= 500
    )
  )

  async function submit() {
    if (!canSubmit) return
    if (!entry.updatedAt) {
      setError('Atualize a jornada para corrigir esse lançamento.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (mode === 'edit') {
        await editExtraTimeEntry(entry.id, {
          expectedUpdatedAt: entry.updatedAt,
          reason: reason.trim(),
          descriptionId,
          entryDate,
          minutes: Number(minutes),
          notes: notes.trim() || null,
        })
      } else {
        await deleteExtraTimeEntry(entry.id, {
          expectedUpdatedAt: entry.updatedAt,
          reason: reason.trim(),
        })
      }
      await onMutated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a correção.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'edit' ? 'Corrigir apontamento Extra Esteira' : 'Remover apontamento Extra Esteira'}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
    >
      <div className="sgp-panel w-full max-w-lg space-y-4 rounded-2xl border border-white/10 p-5 shadow-xl">
        <h3 className="font-heading text-lg font-bold text-white">
          {mode === 'edit' ? 'Corrigir apontamento Extra Esteira' : 'Remover apontamento Extra Esteira'}
        </h3>
        <p className="text-sm text-slate-300">
          {entry.collaboratorName ? `${entry.collaboratorName} · ` : ''}{entry.description}
          {' · '}{entry.origin === 'PRODUCTION' ? 'Modo Fábrica' : 'SGP'}
        </p>
        {mode === 'edit' ? (
          <>
            <label className="block text-sm text-slate-200">
              Descrição
              <select
                aria-label="Descrição Extra Esteira"
                className="sgp-input-app mt-1 w-full"
                value={descriptionId}
                disabled={loadingOptions || saving}
                onChange={(e) => setDescriptionId(e.target.value)}
              >
                {!oldDescriptionActive && entry.descriptionId ? (
                  <option value={entry.descriptionId}>{entry.description} (descrição anterior)</option>
                ) : null}
                {options.map((o) => <option key={o.id} value={o.id}>{o.description}</option>)}
              </select>
            </label>
            <label className="block text-sm text-slate-200">
              Data de realização
              <input
                type="date"
                aria-label="Data de realização"
                max={operationalTodayIso()}
                className="sgp-input-app mt-1 w-full"
                value={entryDate}
                disabled={saving}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </label>
            <label className="block text-sm text-slate-200">
              Minutos
              <input
                type="number"
                aria-label="Minutos Extra Esteira"
                min={1}
                step={1}
                className="sgp-input-app mt-1 w-full"
                value={minutes}
                disabled={saving}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </label>
            <label className="block text-sm text-slate-200">
              Observação (opcional)
              <textarea
                aria-label="Observação Extra Esteira"
                rows={2}
                maxLength={500}
                className="sgp-input-app mt-1 w-full"
                value={notes}
                disabled={saving}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </>
        ) : (
          <p className="text-sm text-rose-200">
            O lançamento será retirado dos totais da jornada. A remoção ficará registrada na auditoria.
          </p>
        )}
        <label className="block text-sm text-slate-200">
          Motivo obrigatório
          <textarea
            aria-label="Motivo da correção"
            rows={2}
            maxLength={4000}
            className="sgp-input-app mt-1 w-full"
            value={reason}
            disabled={saving}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error ? <p role="alert" className="text-sm text-rose-200">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="sgp-cta-secondary" disabled={saving} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="sgp-cta-primary disabled:opacity-40" disabled={!canSubmit} onClick={() => void submit()}>
            {saving ? 'Salvando…' : mode === 'edit' ? 'Salvar correção' : 'Confirmar remoção'}
          </button>
        </div>
      </div>
    </div>
  )
}
