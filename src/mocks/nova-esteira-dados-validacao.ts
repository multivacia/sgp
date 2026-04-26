/**
 * Validação alinhada ao POST /api/v1/conveyors (Zod) e às regras de UX da Nova Esteira.
 * Evita divergência entre “Pronta para registrar” na jornada e falha no submit.
 */

import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'

/** Padrão UUID v4 (aceita também variantes comuns em minúsculas). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidV4Like(value: string): boolean {
  return UUID_RE.test(value.trim())
}

/**
 * Prazo estimado: vazio é permitido; se preenchido, apenas valor numérico (dias),
 * opcionalmente com separador decimal (`.` ou `,`).
 */
const PRAZO_ESTIMADO_NUMERICO = /^\d+([.,]\d+)?$/

export function prazoEstimadoFormatoAceito(valor: string): boolean {
  const t = valor.trim()
  if (t.length === 0) return true
  return PRAZO_ESTIMADO_NUMERICO.test(t)
}

/**
 * Primeiro impeditivo dos dados iniciais para avançar à revisão / registrar
 * (nome obrigatório + prazo no formato aceite).
 */
export function impeditivoCamposDadosParaRegistro(
  dados: NovaEsteiraDadosIniciais,
): string {
  if (!dados.nome.trim()) {
    return 'Informe um nome para a esteira.'
  }
  if (!prazoEstimadoFormatoAceito(dados.prazoEstimado)) {
    return 'Prazo estimado deve ser numérico (ex.: dias) ou deixe em branco.'
  }
  return ''
}

export function dadosCamposOkParaRegistro(dados: NovaEsteiraDadosIniciais): boolean {
  return impeditivoCamposDadosParaRegistro(dados) === ''
}
