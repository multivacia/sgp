/** Faixa da demonstração: deixa claro que os dados são de exemplo e troca entre gestora e tablet. */
export function DemoBar() {
  const link = 'rounded-lg bg-white/15 px-2.5 py-1 font-bold'
  return (
    <div className="flex flex-wrap items-center gap-2 bg-accent px-4 py-1.5 text-sm text-ink">
      <span className="font-bold">DEMONSTRAÇÃO · dados de exemplo</span>
      <span className="flex-1" />
      <a href="#/" className={link}>
        Gestora
      </a>
      <a href="#/tablet" className={link}>
        Tablet
      </a>
      <button type="button" onClick={() => window.location.reload()} className={`${link} underline`}>
        Recomeçar
      </button>
    </div>
  )
}
