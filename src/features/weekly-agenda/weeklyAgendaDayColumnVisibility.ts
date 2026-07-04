/**
 * Visibilidade de colunas da grade por breakpoint — mesma fonte que `lg:hidden` nas abas.
 * Abaixo de `lg`: só o dia selecionado; em `lg+`: semana inteira.
 */
export function weeklyAgendaDayColumnClass(selectedDay: string, dateIso: string): string {
  return dateIso === selectedDay ? 'table-cell' : 'hidden lg:table-cell'
}
