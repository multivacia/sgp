import { PageCanvas } from '../../components/ui/PageCanvas'

/**
 * Casca inicial da Agenda da Semana — PR-1.
 * Leitura, grade, DnD e modo Fila entram nos PRs seguintes.
 */
export function WeeklyAgendaPage() {
  return (
    <PageCanvas>
      <header className="sgp-header-card">
        <h1 className="sgp-page-title">Agenda da Semana</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Nova experiência de planejamento semanal — grade colaborador × dia, backlog em gaveta e
          alocação em lote. Convive com a tela Planejamento até aposentarmos a versão anterior.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2 text-xs font-medium text-amber-100/90">
          <span
            className="size-1.5 shrink-0 rounded-full bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.35)]"
            aria-hidden
          />
          Em construção — próximo passo: visualização com dados reais da semana.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Semana e plano',
            description: 'Navegação de semana, status rascunho/publicado e publicar plano.',
          },
          {
            title: 'Grade da agenda',
            description: 'Colaboradores × dias úteis com cards compactos de atividade.',
          },
          {
            title: 'Backlog e fila',
            description: 'Gaveta de pendentes e modo Fila de alocação em lote.',
          },
        ].map((block) => (
          <section
            key={block.title}
            className="flex min-h-[8.5rem] flex-col rounded-2xl border border-dashed border-white/[0.12] bg-sgp-app-panel-deep/40 p-4 shadow-inner ring-1 ring-white/[0.04]"
          >
            <h2 className="text-sm font-semibold text-slate-200">{block.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{block.description}</p>
          </section>
        ))}
      </div>
    </PageCanvas>
  )
}
