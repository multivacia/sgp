/** Tela reservada para as próximas fases (ver docs/v2/SGP_V2.md §4). */
export function Placeholder({ title, fase }: { title: string; fase: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      <p className="text-muted">Chega na {fase}.</p>
    </section>
  )
}
