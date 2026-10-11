/**
 * Busca parcial sem diferenciar maiúsculas/minúsculas nem acentos, sem depender da
 * extensão `unaccent` (não instalada — exigiria migration). O termo é normalizado em JS
 * e a coluna é dobrada no SQL com `translate(lower(...))` usando o mesmo mapa.
 */
const ACCENTED = 'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ'
const PLAIN = 'aaaaaaeeeeiiiiooooouuuucnyy'

/** Minúsculas, sem acentos e com espaços internos colapsados. */
export function foldSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Expressão SQL com a coluna dobrada (minúsculas, sem acentos). */
export function sqlFold(expr: string): string {
  return `translate(lower(COALESCE(${expr}, '')), '${ACCENTED}', '${PLAIN}')`
}

/**
 * Pesquisa "Esteira & atividade": o `&` separa o termo da esteira/OS (esquerda) do termo
 * da atividade (direita). Sem `&` → `null` (pesquisa livre atual, inalterada).
 * Espaços ao redor do `&` são removidos; lados vazios são ignorados.
 */
export function parseConveyorActivitySearch(
  raw: string | null | undefined,
): { conveyorTerm: string | null; activityTerm: string | null } | null {
  if (!raw || !raw.includes('&')) return null
  const idx = raw.indexOf('&')
  const left = foldSearchText(raw.slice(0, idx))
  const right = foldSearchText(raw.slice(idx + 1).replace(/&/g, ' '))
  return { conveyorTerm: left || null, activityTerm: right || null }
}
