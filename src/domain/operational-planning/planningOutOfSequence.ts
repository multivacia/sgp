export function formatPlanningOutOfSequenceTooltip(previousOpenCount: number): string {
  const count = Math.max(0, Math.floor(previousOpenCount))
  if (count === 0) {
    return 'Atividade fora da sequência recomendada nesta esteira.'
  }
  if (count === 1) {
    return '1 atividade anterior não concluída nesta esteira.'
  }
  return `${count} atividades anteriores não concluídas nesta esteira.`
}
