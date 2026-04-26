/**
 * Modo oficial de criação — Nova Esteira (Bloco 2A).
 * Não confundir com `origin_register` da esteira persistida (BASE / MANUAL / HYBRID).
 */
export type NovaEsteiraCreationMode =
  | 'full_matrix'
  | 'matrix_plus_extras'
  | 'manual'

export const NOVA_ESTEIRA_MODE_LABEL: Record<
  NovaEsteiraCreationMode,
  { title: string; description: string }
> = {
  full_matrix: {
    title: 'Usar matriz inteira',
    description:
      'Escolha uma matriz ativa e crie a esteira com toda a estrutura dela, sem montar etapa a etapa.',
  },
  matrix_plus_extras: {
    title: 'Matriz como base e complementos',
    description:
      'Carrega uma matriz base e permite acrescentar blocos vindos de outras matrizes, com rótulos claros na composição.',
  },
  manual: {
    title: 'Montar manualmente',
    description:
      'Começa vazio: você define opções, áreas e etapas sem depender de uma matriz base.',
  },
}

export function novaEsteiraModeShortLabel(
  mode: NovaEsteiraCreationMode | null,
): string {
  if (!mode) return '—'
  return NOVA_ESTEIRA_MODE_LABEL[mode].title
}
