/**
 * Runtime oficial mockado — mutação e validação centralizadas da fonte de colaboradores.
 * A UI chama apenas estes pontos; regras de integridade ficam aqui.
 */

export type ColaboradorOperacional = {
  colaboradorId: string
  nome: string
  codigo?: string
  matricula?: string
  apelido?: string
  ativo: boolean
  setorPrincipal?: string
  metadata?: Record<string, string>
}

export type ColaboradorOperacionalInput = {
  nome: string
  codigo?: string
  matricula?: string
  apelido?: string
  setorPrincipal?: string
  ativo?: boolean
  metadata?: Record<string, string>
}

export type ColaboradorOperacionalUpdate = {
  nome?: string
  codigo?: string
  matricula?: string
  apelido?: string
  setorPrincipal?: string
  ativo?: boolean
  metadata?: Record<string, string>
}

export type CodigoValidacaoColaborador =
  | 'nome_vazio'
  | 'nome_duplicado'
  | 'codigo_duplicado'
  | 'matricula_duplicada'
  | 'colaborador_nao_encontrado'
  | 'setor_obrigatorio'
  | 'funcao_obrigatorio'

export type ValidacaoColaboradorOperacional = {
  codigo: CodigoValidacaoColaborador
  mensagem: string
}

export type ResultadoMutacaoColaborador =
  | { ok: true; colaborador: ColaboradorOperacional }
  | { ok: false; erros: ValidacaoColaboradorOperacional[] }

const SEED: ColaboradorOperacional[] = [
  {
    colaboradorId: 'colab-joao',
    nome: 'João',
    codigo: 'JOA',
    ativo: true,
    setorPrincipal: 'Tapeçaria',
  },
  {
    colaboradorId: 'colab-ana',
    nome: 'Ana',
    codigo: 'ANA',
    ativo: true,
    setorPrincipal: 'Tapeçaria',
  },
  {
    colaboradorId: 'colab-carlos',
    nome: 'Carlos',
    codigo: 'CAR',
    ativo: true,
    setorPrincipal: 'Tapeçaria',
  },
  {
    colaboradorId: 'colab-juliana',
    nome: 'Juliana',
    codigo: 'JUL',
    ativo: true,
    setorPrincipal: 'Tapeçaria',
  },
  {
    colaboradorId: 'colab-marcos',
    nome: 'Marcos',
    codigo: 'MAR',
    ativo: true,
    setorPrincipal: 'Tapeçaria',
  },
  {
    colaboradorId: 'colab-pedro',
    nome: 'Pedro',
    codigo: 'PED',
    ativo: true,
    setorPrincipal: 'Tapeçaria',
  },
]

let store: ColaboradorOperacional[] = SEED.map((c) => ({ ...c }))
let version = 0
const listeners = new Set<() => void>()
let idSeq = 0

/** Normalização para match de nome (trim + colapso de espaços). */
export function normalizarNomeColaboradorBusca(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

function bump() {
  version += 1
  listeners.forEach((l) => l())
}

function clone(c: ColaboradorOperacional): ColaboradorOperacional {
  return {
    ...c,
    metadata: c.metadata ? { ...c.metadata } : undefined,
  }
}

function novoColaboradorId(): string {
  idSeq += 1
  return `colab-n-${idSeq}`
}

function nomeDuplicado(
  nomeNorm: string,
  excetoId?: string,
): ColaboradorOperacional | undefined {
  return store.find(
    (c) =>
      normalizarNomeColaboradorBusca(c.nome) === nomeNorm &&
      c.colaboradorId !== excetoId,
  )
}

function codigoDuplicado(
  valor: string | undefined,
  _campo: 'codigo' | 'matricula',
  excetoId?: string,
): boolean {
  if (!valor?.trim()) return false
  const t = valor.trim()
  return store.some(
    (c) =>
      c.colaboradorId !== excetoId &&
      (c.codigo?.trim() === t || c.matricula?.trim() === t),
  )
}

export function subscribeColaboradores(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getColaboradoresVersion(): number {
  return version
}

export function listColaboradoresOperacionais(): ColaboradorOperacional[] {
  return store.map(clone)
}

/** Novas seleções (dropdowns, reatribuição) — apenas cadastros ativos. */
export function listColaboradoresOperacionaisAtivosParaSelecao(): ColaboradorOperacional[] {
  return store.filter((c) => c.ativo).map(clone)
}

export function getColaboradorById(
  id: string | undefined,
): ColaboradorOperacional | undefined {
  if (!id?.trim()) return undefined
  const c = store.find((x) => x.colaboradorId === id)
  return c ? clone(c) : undefined
}

function validarInputCriacao(
  input: ColaboradorOperacionalInput,
): ValidacaoColaboradorOperacional[] {
  const erros: ValidacaoColaboradorOperacional[] = []
  const nome = input.nome?.trim() ?? ''
  if (!nome) {
    erros.push({
      codigo: 'nome_vazio',
      mensagem: 'Informe o nome do colaborador.',
    })
    return erros
  }
  if (!input.setorPrincipal?.trim()) {
    erros.push({
      codigo: 'setor_obrigatorio',
      mensagem: 'Escolha um setor.',
    })
  }
  if (!input.metadata?.roleId?.trim()) {
    erros.push({
      codigo: 'funcao_obrigatorio',
      mensagem: 'Escolha uma função / papel operacional.',
    })
  }
  if (erros.length) return erros
  const nn = normalizarNomeColaboradorBusca(nome)
  if (nomeDuplicado(nn)) {
    erros.push({
      codigo: 'nome_duplicado',
      mensagem: 'Já existe colaborador com o mesmo nome (após normalização).',
    })
  }
  if (input.codigo?.trim() && codigoDuplicado(input.codigo, 'codigo')) {
    erros.push({
      codigo: 'codigo_duplicado',
      mensagem: 'Código já usado por outro colaborador.',
    })
  }
  if (input.matricula?.trim() && codigoDuplicado(input.matricula, 'matricula')) {
    erros.push({
      codigo: 'matricula_duplicada',
      mensagem: 'Matrícula já usada por outro colaborador.',
    })
  }
  return erros
}

function validarInputAtualizacao(
  id: string,
  input: ColaboradorOperacionalUpdate,
): ValidacaoColaboradorOperacional[] {
  const erros: ValidacaoColaboradorOperacional[] = []
  if (input.nome !== undefined) {
    const nome = input.nome.trim()
    if (!nome) {
      erros.push({
        codigo: 'nome_vazio',
        mensagem: 'Nome não pode ficar vazio.',
      })
    } else {
      const nn = normalizarNomeColaboradorBusca(nome)
      if (nomeDuplicado(nn, id)) {
        erros.push({
          codigo: 'nome_duplicado',
          mensagem: 'Já existe outro colaborador com o mesmo nome (normalizado).',
        })
      }
    }
  }
  if (input.codigo !== undefined && input.codigo.trim()) {
    if (codigoDuplicado(input.codigo, 'codigo', id)) {
      erros.push({
        codigo: 'codigo_duplicado',
        mensagem: 'Código já usado por outro colaborador.',
      })
    }
  }
  if (input.matricula !== undefined && input.matricula.trim()) {
    if (codigoDuplicado(input.matricula, 'matricula', id)) {
      erros.push({
        codigo: 'matricula_duplicada',
        mensagem: 'Matrícula já usada por outro colaborador.',
      })
    }
  }
  return erros
}

export function criarColaboradorOperacional(
  input: ColaboradorOperacionalInput,
): ResultadoMutacaoColaborador {
  const erros = validarInputCriacao(input)
  if (erros.length) return { ok: false, erros }
  const nome = input.nome.trim()
  const colaborador: ColaboradorOperacional = {
    colaboradorId: novoColaboradorId(),
    nome,
    codigo: input.codigo?.trim() || undefined,
    matricula: input.matricula?.trim() || undefined,
    apelido: input.apelido?.trim() || undefined,
    ativo: input.ativo !== false,
    setorPrincipal: input.setorPrincipal?.trim() || undefined,
    metadata: input.metadata ? { ...input.metadata } : undefined,
  }
  store = [...store, colaborador]
  bump()
  return { ok: true, colaborador: clone(colaborador) }
}

export function atualizarColaboradorOperacional(
  colaboradorId: string,
  input: ColaboradorOperacionalUpdate,
): ResultadoMutacaoColaborador {
  const idx = store.findIndex((c) => c.colaboradorId === colaboradorId)
  if (idx < 0) {
    return {
      ok: false,
      erros: [
        {
          codigo: 'colaborador_nao_encontrado',
          mensagem: 'Colaborador não encontrado.',
        },
      ],
    }
  }
  const erros = validarInputAtualizacao(colaboradorId, input)
  if (erros.length) return { ok: false, erros }
  const cur = store[idx]!
  const next: ColaboradorOperacional = {
    ...cur,
    colaboradorId: cur.colaboradorId,
    nome: input.nome !== undefined ? input.nome.trim() : cur.nome,
    codigo:
      input.codigo !== undefined
        ? input.codigo.trim() || undefined
        : cur.codigo,
    matricula:
      input.matricula !== undefined
        ? input.matricula.trim() || undefined
        : cur.matricula,
    apelido:
      input.apelido !== undefined
        ? input.apelido.trim() || undefined
        : cur.apelido,
    setorPrincipal:
      input.setorPrincipal !== undefined
        ? input.setorPrincipal.trim() || undefined
        : cur.setorPrincipal,
    ativo: input.ativo !== undefined ? input.ativo : cur.ativo,
    metadata:
      input.metadata !== undefined
        ? { ...input.metadata }
        : cur.metadata
          ? { ...cur.metadata }
          : undefined,
  }
  store = store.map((c, i) => (i === idx ? next : c))
  bump()
  return { ok: true, colaborador: clone(next) }
}

export function definirAtivoColaboradorOperacional(
  colaboradorId: string,
  ativo: boolean,
): ResultadoMutacaoColaborador {
  return atualizarColaboradorOperacional(colaboradorId, { ativo })
}

/** Testes — restaura seed e versão. */
export function __resetColaboradoresRepositoryForTests() {
  store = SEED.map((c) => ({ ...c, metadata: c.metadata ? { ...c.metadata } : undefined }))
  idSeq = 0
  bump()
}
