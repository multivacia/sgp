/**
 * Mensagens operacionais curtas — única fonte para domínio e UI (Nova Esteira).
 */

export const MSG = {
  faltaNomeEsteira: 'Informe um nome para a esteira.',
  faltaBaseOperacional: 'Defina a origem da estrutura (base operacional).',
  faltaBlocoNoPedido: 'Inclua ao menos um bloco no pedido.',
  apliqueBaseEsteira: 'Aplique uma base de esteira ao rascunho.',
  baseSemTarefas: 'A base escolhida não gerou tarefas — confira a seleção.',
  faltaBlocoReferencia: 'Inclua ao menos um bloco de referência na montagem.',
  obrigatorioFaltando: (nomeBloco: string, id: string) =>
    `Bloco obrigatório ausente ou incompleto: ${nomeBloco} (${id}).`,
  blocosInvalidosImpedem: 'Há blocos inválidos — corrija antes de criar.',
  bloqueadosPorPrereq: 'Um bloco depende de outro que ainda não está satisfeito na ordem.',
  revisePendentes: 'Ajuste os blocos pendentes antes de seguir.',
  montagemProntaOperacao: 'Montagem coerente — pronta para revisar e registrar.',
  conflitoIncompatibilidade: (outros: string) =>
    `Incompatível com: ${outros}.`,
  requerAntesNaEsteira: (nomes: string) =>
    `Depende de etapas anteriores na esteira (${nomes}).`,
  catalogoNaoEncontrado: 'Bloco não encontrado no catálogo.',
} as const

export function mensagemBaseAplicada(nome: string, id: string): string {
  return `Base operacional: «${nome}» (${id}).`
}

/** Textos de rodapé / CTA — alinhados ao domínio. */
/** Textos da tela Nova Esteira — persistência local, retomada e extremos do fluxo. */
export const MSG_JORNADA_UI = {
  retomadaNaoEncontrada:
    'Link de rascunho inválido ou rascunho não está neste navegador. Comece de novo ou salve outro rascunho.',
  persistenciaIndisponivel:
    'Não foi possível guardar no armazenamento local. Verifique espaço ou permissões do navegador.',
  cenarioNaoDisponivel: 'Cenário não disponível nesta versão.',
  rascunhoAtualizado: (quando: string) =>
    `Rascunho guardado neste navegador (${quando}).`,
  rascunhoNovo: (nome: string) => `Rascunho “${nome}” guardado neste navegador.`,
  montagemPorCenario: (nome: string) => `Montagem iniciada a partir de “${nome}”.`,
  copiaCriada: (nome: string) => `Cópia criada — “${nome}”.`,
  rascunhoArquivado: 'Rascunho arquivado neste navegador.',
  sucessoBacklog: 'Esteira criada e enviada ao backlog.',
  sucessoExec: 'Esteira criada e liberada para execução.',
  posSucessoExec: 'A esteira entrou em produção no mock — acompanhe no backlog.',
  posSucessoBacklog: 'A esteira está na fila para priorização e liberação.',
  revisaoBannerMock:
    'Última conferência: o registro é simulado — confira base e blocos antes de criar.',
  revisaoBannerServidor:
    'Última conferência: ao criar, os dados serão enviados ao servidor (registo oficial).',
  revisaoBannerAuto:
    'Última conferência: tentaremos o servidor primeiro. Se estiver indisponível, será simulado só neste navegador — não conta como registo oficial.',
  registrandoEsteira: 'Registrando esteira…',
  sucessoBacklogServidor: (id: string) =>
    `Esteira registada no servidor (referência ${id}). Prioridade de fila assinalada no fluxo atual.`,
  sucessoExecServidor: (id: string) =>
    `Esteira registada no servidor (referência ${id}). Liberação para execução assinalada no fluxo atual.`,
  posSucessoBacklogServidor:
    'A referência oficial está no servidor. O backlog local pode não refletir ainda a nova esteira.',
  posSucessoExecServidor:
    'A referência oficial está no servidor. Acompanhe a fila e a execução no fluxo habitual.',
  registroApenasLocalIndisponivel:
    'Não foi possível contactar o servidor. Foi criada uma simulação apenas neste navegador — não é registo oficial no sistema central. Tente de novo quando a ligação estiver restabelecida.',
  posSucessoLocalOnly:
    'Os dados não foram guardados no servidor. O que vê no backlog deste navegador é só simulação local.',
} as const

export const MSG_RODAPE = {
  continuarRevisao: 'Montagem ok — abra a revisão para conferir antes de criar.',
  revisaoConfirmar: 'Última conferência: escolha backlog ou liberação para execução.',
  montagemDeixouPronta: 'Volte à montagem e resolva:',
  /** Rótulos curtos para CTAs (acessibilidade / leitura rápida). */
  ctaContinuarRevisao: 'Continuar para revisão',
  ctaVoltarMontagem: 'Voltar à montagem',
  ctaCriarBacklog: 'Criar no backlog',
  ctaCriarExecucao: 'Criar e liberar execução',
} as const
