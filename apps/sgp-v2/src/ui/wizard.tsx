import type { ReactNode } from 'react'
import { fmtMin } from '../domain/format'
import { ehIlustracao } from '../domain/novaEsteira'

/** Peças visuais comuns a "Nova esteira" e "Alterar esteira" (as duas telas devem ser iguais). */

export function WizardHeader({ sobre, pergunta, passo, total, onBack }: { sobre: string; pergunta: string; passo: number; total: number; onBack: () => void }) {
  return (
    <header className="brand-band sticky top-0 z-10 flex flex-col gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),16px)] shadow-[0_8px_24px_-14px_rgba(5,10,18,0.8)]">
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Voltar" onClick={onBack} className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold uppercase tracking-wider text-white/65">{sobre}</p>
          <h1 className="font-display text-2xl font-extrabold leading-tight">{pergunta}</h1>
        </div>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < passo ? 'bg-cta' : 'bg-white/20'}`} />
        ))}
      </div>
    </header>
  )
}

export function BottomBar({ titulo, sub, label, enabled, verde, onClick }: { titulo: string; sub: string; label: string; enabled: boolean; verde?: boolean; onClick: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 border-t border-line bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 shadow-[0_-10px_28px_-14px_rgba(15,23,42,0.25)] backdrop-blur">
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl font-extrabold">{titulo}</p>
        <p className="text-muted">{sub}</p>
      </div>
      <button type="button" disabled={!enabled} onClick={onClick} className={`min-h-15 rounded-xl px-6 text-lg font-bold transition-colors ${enabled ? (verde ? 'bg-ok text-white shadow-[0_8px_22px_-10px_rgba(21,128,61,0.7)]' : 'bg-cta text-ink shadow-[var(--shadow-cta)] hover:bg-cta-hover') : 'bg-line text-muted'}`}>
        {label}
      </button>
    </div>
  )
}

type EtapaCardProps = {
  numero: number
  nome: string
  figura: string | null
  on: boolean
  tag: string
  tagTone?: 'ok' | 'feita' | 'fora'
  info: string
  mudancas: number
  toggleLabel: string
  onToggle: () => void
  onPersonalizar?: () => void
}

export function EtapaCard({ numero, nome, figura, on, tag, tagTone = on ? 'ok' : 'fora', info, mudancas, toggleLabel, onToggle, onPersonalizar }: EtapaCardProps) {
  const tone = tagTone === 'ok' ? 'bg-ok text-white' : tagTone === 'feita' ? 'bg-ink text-white' : 'border border-line bg-white text-muted'
  return (
    <div className={`rounded-2xl p-2 ${on ? 'border-[3px] border-blue bg-white' : 'border-[3px] border-transparent bg-line/60'}`}>
      <button type="button" aria-pressed={on} aria-label={toggleLabel} onClick={onToggle} className="flex w-full flex-col gap-1.5 text-left">
        <span className="relative block">
          {figura ? <img src={figura} alt="" className={`h-28 w-full rounded-xl bg-white object-contain ${ehIlustracao(figura) ? 'px-6 pb-2 pt-9' : ''} ${on ? '' : 'opacity-40 grayscale'}`} /> : <span className="block h-28 w-full rounded-xl bg-ground" />}
          <span className="absolute left-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{numero}</span>
          <span className={`absolute right-1.5 top-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold ${tone}`}>{tag}</span>
        </span>
        <span className={`font-bold leading-tight ${on ? '' : 'text-muted'}`}>{nome}</span>
        <span className="text-sm text-muted">{info}</span>
      </button>
      {on ? (
        <>
          {mudancas > 0 ? <span className="mt-1.5 block rounded-lg bg-late-soft px-2 py-1 text-sm font-bold text-late-ink">{mudancas} {mudancas === 1 ? 'mudança' : 'mudanças'}</span> : null}
          {onPersonalizar ? (
            <button type="button" onClick={onPersonalizar} className="mt-2 min-h-11 w-full rounded-xl border-2 border-line-strong bg-white font-bold">
              Personalizar
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function SetorBox({ nome, info, ativo, toggle, trocarTodos, children }: { nome: string; info: string; ativo: boolean; toggle?: { label: string; onClick: () => void }; trocarTodos?: () => void; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 rounded-2xl p-3 ${ativo ? 'border border-line bg-white' : 'border border-dashed border-muted bg-line/60'}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="block text-sm font-bold tracking-wide text-muted">SETOR</span>
          <span className="block font-display text-xl font-extrabold">{nome}</span>
          <span className="block text-muted">{info}</span>
        </div>
        {toggle ? (
          <button type="button" onClick={toggle.onClick} className={`min-h-11 shrink-0 rounded-xl px-3 font-bold ${ativo ? 'border-2 border-line bg-white' : 'bg-ink text-white'}`}>
            {toggle.label}
          </button>
        ) : null}
      </div>
      {trocarTodos ? (
        <button type="button" onClick={trocarTodos} className="min-h-11 rounded-xl border-2 border-line-strong bg-white font-bold">
          Trocar responsável de todo o setor
        </button>
      ) : null}
      {children}
    </div>
  )
}

export function AtividadeRow({ nome, min, on, onToggle, resp }: { nome: string; min: number; on: boolean; onToggle: () => void; resp?: { texto: string; trocado: boolean; onTrocar: () => void } }) {
  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" aria-pressed={on} onClick={onToggle} className={`flex min-h-14 items-center gap-3 rounded-2xl px-2.5 py-2 text-left ${on ? 'border-2 border-line-strong bg-white' : 'border-2 border-line bg-ground'}`}>
        <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-ok text-white' : 'border-2 border-muted bg-white'}`}>
          {on ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
          ) : null}
        </span>
        <span className="min-w-0">
          <span className={`block font-bold leading-snug ${on ? '' : 'text-muted line-through'}`}>{nome}</span>
          <span className="block text-sm text-muted">{min ? fmtMin(min) : 'sem tempo previsto'}</span>
        </span>
      </button>
      {on && resp ? (
        <button type="button" onClick={resp.onTrocar} className={`ml-11 flex min-h-11 items-center gap-2 rounded-xl px-3 text-left font-bold ${resp.trocado ? 'border-2 border-late bg-late-soft text-late-ink' : 'border border-line bg-ground'}`}>
          <span className="flex-1">{resp.texto}</span>
          <span className="text-sm underline">Trocar</span>
        </button>
      ) : null}
    </div>
  )
}

/** Atividade feita/em andamento: aparece no mesmo lugar, com cadeado, sem ação. */
export function AtividadeTravada({ nome, texto, tone }: { nome: string; texto: string; tone: 'feito' | 'andando' | 'parado' }) {
  const box = tone === 'feito' ? 'bg-ok' : tone === 'parado' ? 'bg-danger' : 'bg-[#a16207]'
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-dashed border-muted bg-ground px-2.5 py-2">
      <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-white ${box}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block font-bold leading-snug text-muted">{nome}</span>
        <span className={`block text-sm font-bold ${tone === 'feito' ? 'text-ok' : 'text-late-ink'}`}>{texto}</span>
      </span>
    </div>
  )
}
