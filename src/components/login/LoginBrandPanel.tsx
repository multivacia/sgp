import { FineGridOverlay } from '../shell/FineGridOverlay'
import { HexPatternBackground } from './HexPatternBackground'
import { SgpMark } from './SgpMark'

const highlights = [
  {
    title: 'Clareza operacional',
    text: 'Fila e prioridades visíveis para toda a equipe.',
  },
  {
    title: 'Execução eficiente',
    text: 'Esteiras alinhadas ao chão de fábrica e ao tempo real.',
  },
  {
    title: 'Gestão inteligente',
    text: 'Decisões sustentadas por dados, sem ruído.',
  },
] as const

export function LoginBrandPanel() {
  return (
    <div className="relative flex min-h-[44vh] flex-1 flex-col justify-between overflow-hidden bg-sgp-void px-8 py-10 text-[color:var(--semantic-login-brand-fg)] lg:min-h-dvh lg:max-w-[48%] lg:px-12 lg:py-14">
      <HexPatternBackground />
      <FineGridOverlay />

      <div
        className="pointer-events-none absolute -right-28 top-1/4 h-[28rem] w-[28rem] rounded-full bg-sgp-blue/25 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-20 h-72 w-72 rounded-full bg-sgp-gold-warm/12 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-sgp-navy-deep/90 to-transparent"
        aria-hidden
      />

      <div className="relative">
        <div className="flex items-start gap-4">
          <SgpMark className="size-12 shrink-0 md:size-[3.25rem]" />
          <div className="min-w-0 pt-0.5">
            <p className="font-heading text-[10px] font-bold uppercase tracking-[0.26em] text-sgp-gold-warm">
              Multivacia
            </p>
            <h1 className="sgp-page-title mt-1">
              SGP
            </h1>
            <p className="mt-1 text-[13px] font-medium leading-snug text-[color:var(--semantic-login-brand-muted)]">
              Sistema de Gestão da Produção
            </p>
          </div>
        </div>

        <div className="mt-12 max-w-lg border-l-2 border-sgp-gold-warm/50 pl-5">
          <p className="font-heading text-xl font-bold leading-tight tracking-tight md:text-2xl">
            Inteligência para governar a execução
          </p>
          <p className="mt-1 font-heading text-sm font-semibold text-sgp-blue-bright/95 md:text-base">
            Bem-vindo ao SGP
          </p>
        </div>

        <p className="mt-6 max-w-lg text-sm leading-relaxed text-[color:var(--semantic-login-brand-muted)]">
          Uma experiência corporativa da mesma família visual do ecossistema
          ARGOS — profundidade, contraste e foco no que move a produção.
        </p>

        <ul className="mt-10 space-y-3">
          {highlights.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-[color:var(--semantic-border-glass)] bg-[var(--semantic-white-overlay-04)] px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
            >
              <p className="font-heading text-sm font-semibold">
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[color:var(--semantic-login-brand-muted)]">
                {item.text}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-12 hidden lg:block">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent via-sgp-gold-warm/55 to-sgp-amber/90" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--semantic-login-brand-muted)]">
            Software industrial moderno
          </span>
        </div>
        <p className="mt-5 max-w-md text-[11px] leading-relaxed text-[color:var(--semantic-login-brand-muted)]">
          Plataforma industrial integrada ao ecossistema Multivacia · identidade
          visual alinhada ao manual ARGOS para consistência de marca.
        </p>
      </div>
    </div>
  )
}
