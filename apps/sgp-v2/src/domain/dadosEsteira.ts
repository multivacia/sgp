/**
 * Dados básicos da esteira, os mesmos da V1 (aba "Dados básicos"):
 * nome, cliente, veículo, placa, modelo/versão, responsável, prioridade, prazo e observações.
 * Inclusão vai em `dados` do POST /conveyors; alteração em PATCH /conveyors/:id (só o que mudou).
 */
import type { ConveyorDetail } from './conveyors'

export type Prioridade = 'alta' | 'media' | 'baixa'

export type DadosEsteira = {
  nome: string
  cliente: string
  veiculo: string
  modeloVersao: string
  placa: string
  observacoes: string
  /** Nome do responsável (texto que a V1 grava). */
  responsavel: string
  /** Colaborador responsável (a V1 guarda no metadata; o detalhe não devolve). */
  colaboradorId: string | null
  /** YYYY-MM-DD ou ''. */
  prazoEstimado: string
  prioridade: Prioridade
}

export const PRIORIDADES: { v: Prioridade; label: string }[] = [
  { v: 'baixa', label: 'Baixa' },
  { v: 'media', label: 'Média' },
  { v: 'alta', label: 'Alta' },
]

export function dadosVazios(prazo: string, colaboradorId: string | null): DadosEsteira {
  return { nome: '', cliente: '', veiculo: '', modeloVersao: '', placa: '', observacoes: '', responsavel: '', colaboradorId, prazoEstimado: prazo, prioridade: 'media' }
}

/** Placa como a fábrica escreve: maiúsculas, sem espaços. */
export function placaLimpa(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8)
}

/** Nome sugerido: "veículo · PLACA" (ou o nome da matriz quando não há veículo). */
export function nomeSugerido(d: Pick<DadosEsteira, 'veiculo' | 'placa'>, matriz = ''): string {
  return [d.veiculo.trim() || matriz.trim(), placaLimpa(d.placa)].filter(Boolean).join(' · ')
}

/** Nome que vai para a V1: o digitado, senão o sugerido. */
export function nomeFinal(d: DadosEsteira, matriz = ''): string {
  return d.nome.trim() || nomeSugerido(d, matriz)
}

export function dadosDe(e: Pick<ConveyorDetail, 'name' | 'clientName' | 'vehicle' | 'modelVersion' | 'plate' | 'initialNotes' | 'responsible' | 'estimatedDeadline' | 'priority'>): DadosEsteira {
  return {
    nome: e.name,
    cliente: e.clientName ?? '',
    veiculo: e.vehicle ?? '',
    modeloVersao: e.modelVersion ?? '',
    placa: e.plate ?? '',
    observacoes: e.initialNotes ?? '',
    responsavel: e.responsible ?? '',
    colaboradorId: null,
    prazoEstimado: (e.estimatedDeadline ?? '').slice(0, 10),
    prioridade: e.priority ?? 'media',
  }
}

function norm(d: DadosEsteira) {
  return {
    nome: d.nome.trim(),
    cliente: d.cliente.trim(),
    veiculo: d.veiculo.trim(),
    modeloVersao: d.modeloVersao.trim(),
    placa: placaLimpa(d.placa),
    observacoes: d.observacoes.trim(),
    responsavel: d.responsavel.trim(),
    prazoEstimado: d.prazoEstimado.trim(),
    prioridade: d.prioridade,
  }
}

/** Corpo de `dados` no POST /conveyors. */
export function dadosParaCriar(d: DadosEsteira, matriz = '') {
  return { ...norm(d), nome: nomeFinal(d, matriz), colaboradorId: d.colaboradorId }
}

/** Só os campos que mudaram (como a V1 faz); vazio = nada a gravar. */
export function patchDados(antes: DadosEsteira, depois: DadosEsteira): Record<string, string | null> {
  const a = norm(antes)
  const b = norm(depois)
  const out: Record<string, string | null> = {}
  for (const k of Object.keys(b) as (keyof typeof b)[]) if (a[k] !== b[k]) out[k] = b[k]
  if (depois.colaboradorId && depois.colaboradorId !== antes.colaboradorId) out.colaboradorId = depois.colaboradorId
  return out
}

const ROTULO: Record<string, string> = {
  nome: 'Nome',
  cliente: 'Cliente',
  veiculo: 'Veículo',
  modeloVersao: 'Modelo / versão',
  placa: 'Placa',
  observacoes: 'Observações',
  responsavel: 'Responsável',
  prazoEstimado: 'Prazo',
  prioridade: 'Prioridade',
}

const mostrar = (k: string, v: string) => {
  if (!v) return 'vazio'
  if (k === 'prazoEstimado' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`
  if (k === 'prioridade') return PRIORIDADES.find((p) => p.v === v)?.label ?? v
  if (k === 'observacoes') return v.length > 40 ? `${v.slice(0, 40)}…` : v
  return v
}

/** Linhas para "O que muda". */
export function mudancasDados(antes: DadosEsteira, depois: DadosEsteira): string[] {
  const a = norm(antes)
  const p = patchDados(antes, depois)
  return Object.keys(p)
    .filter((k) => k in ROTULO)
    .map((k) => `${ROTULO[k]}: ${mostrar(k, a[k as keyof typeof a])} → ${mostrar(k, (p[k] ?? '') as string)}`)
}

/** Mesma exigência da V1: nome obrigatório. */
export function erroDados(d: DadosEsteira, matriz = ''): string | null {
  if (!nomeFinal(d, matriz)) return 'Informe o nome da esteira (ou a placa / o veículo).'
  if (d.prazoEstimado && !/^\d{4}-\d{2}-\d{2}$/.test(d.prazoEstimado)) return 'Prazo inválido.'
  return null
}
