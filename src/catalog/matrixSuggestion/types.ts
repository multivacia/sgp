/** Item mínimo para autocomplete (Opção=TASK, Área=SECTOR, Atividade=ACTIVITY). */
export type LabelCatalogEntry = {
  id: string
  label: string
  code: string | null
}

/** Resposta do GET `/operation-matrix/suggestion-catalog` (campo `data` do envelope). */
export type MatrixSuggestionCatalogData = {
  options: LabelCatalogEntry[]
  areas: LabelCatalogEntry[]
  activities: LabelCatalogEntry[]
}
