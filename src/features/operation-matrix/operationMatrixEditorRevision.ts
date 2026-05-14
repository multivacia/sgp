/**
 * Mensagens para a aba Revisão ao alterar uma matriz existente (sem duplicar regras de patch/save).
 */
export function revisaoAlterarMatrizPendencias(opts: {
  matrixStructureDirty: boolean
  matrixEditorHasUnsavedChanges: boolean
  /** Do agregado global da árvore (atividades sem equipe padrão). */
  activitiesWithoutDefaultTeam: number
  /** Equipe padrão referenciada mas não existe no catálogo carregado. */
  activitiesWithOrphanDefaultTeam: number
}): string[] {
  const out: string[] = []
  if (opts.matrixStructureDirty) {
    out.push('A ordem de tarefas, setores ou atividades foi alterada — clique em «Salvar alterações» para persistir.')
  }
  if (opts.matrixEditorHasUnsavedChanges) {
    out.push('Há alterações no formulário do nó atual que ainda não foram salvas.')
  }
  if (opts.activitiesWithoutDefaultTeam > 0) {
    out.push(
      `${opts.activitiesWithoutDefaultTeam} atividade(s) sem equipe padrão.`,
    )
  }
  if (opts.activitiesWithOrphanDefaultTeam > 0) {
    out.push(
      `${opts.activitiesWithOrphanDefaultTeam} atividade(s) com equipe padrão inativa ou inválida.`,
    )
  }
  return out
}
