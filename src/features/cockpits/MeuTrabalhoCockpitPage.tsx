import { CockpitPlaceholderShell } from './CockpitPlaceholderShell'

export function MeuTrabalhoCockpitPage() {
  return (
    <CockpitPlaceholderShell
      title="Meu Trabalho"
      subtitle="A sua fila de trabalho — trilha nova em evolução; independente de Minhas atividades e da Jornada."
      blocks={[
        { title: 'Hoje', description: 'Reservado para foco do dia.' },
        { title: 'Em curso', description: 'Reservado para itens ativos.' },
        { title: 'Bloqueios', description: 'Reservado para impedimentos e dependências.' },
      ]}
    />
  )
}
