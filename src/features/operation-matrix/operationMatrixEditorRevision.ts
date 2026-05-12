/**
 * Mensagens para a aba Revisão ao alterar uma matriz existente (sem duplicar regras de patch/save).
 */
export function revisaoAlterarMatrizPendencias(opts: {
  matrixStructureDirty: boolean
  matrixEditorHasUnsavedChanges: boolean
  /** Do agregado global da árvore (atividades sem responsável válido/definido) */
  activitiesWithoutResponsible: number
  orphanResponsibleAssignments: number
}): string[] {
  const out: string[] = []
  if (opts.matrixStructureDirty) {
    out.push('A ordem de tarefas, setores ou atividades foi alterada — clique em «Salvar alterações» para persistir.')
  }
  if (opts.matrixEditorHasUnsavedChanges) {
    out.push('Há alterações no formulário do nó atual que ainda não foram salvas.')
  }
  if (opts.activitiesWithoutResponsible > 0) {
    out.push(
      `${opts.activitiesWithoutResponsible} atividade(s) sem responsável padrão definido.`,
    )
  }
  if (opts.orphanResponsibleAssignments > 0) {
    out.push(`${opts.orphanResponsibleAssignments} atividade(s) com responsável padrão inativo ou inválido.`)
  }
  return out
}
