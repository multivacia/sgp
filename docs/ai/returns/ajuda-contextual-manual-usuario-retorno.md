# Retorno — ajuda-contextual-manual-usuario

- **TASK_ID:** `ajuda-contextual-manual-usuario`
- **Data/hora:** 2026-10-04 22:45 UTC
- **Objetivo:** menu "? Ajuda" na barra superior, ajuda contextual por tela e Manual do Usuário aberto dentro e fora do SGP+.
- **Status final:** implementado e validado em código, build e navegador (preview local com API simulada). **Não validado em produção.**
- **Branch:** `feature/ajuda-contextual-manual-usuario`
- **Base / SHA inicial:** `origin/develop` = `1924ae01b6840e70a7553efb639abab8ba997b8b` (manual promovido na tarefa `manual-usuario-sgp-promover-develop`)
- **SHA final do código:** `0b19d7e28386c03268a83f04249e30c48e2fc8ed` (o commit deste retorno vem logo depois; o SHA final da branch e de `origin/develop` está na resposta da sessão)
- Retorno anterior de bloqueio (mesma atividade, sessão anterior) fica na branch `ccr-cb361aed-hpqyg5`; este arquivo o substitui na entrega.

## O que foi feito

1. **Menu "? Ajuda"** (`src/components/shell/HelpMenu.tsx`, ligado em `AppHeader.tsx`), à direita, antes do menu do usuário. Itens, nesta ordem: **Como usar esta tela**, **Manual do usuário**, **Abrir chamado**.
   - "Abrir chamado" só aparece quando o módulo de chamados está habilitado (mesma regra do botão existente) e abre o **mesmo diálogo** já existente. O botão "Abrir chamado" do cabeçalho foi mantido, sem alteração.
   - Fecha com Esc (foco volta ao botão), clique fora e seleção; setas, Home e End percorrem os itens.
   - Desktop: ícone "?" + rótulo "Ajuda". Celular: só ícone, com nome acessível e tooltip "Ajuda", área de 44 px.
   - Usa as mesmas classes/tokens do menu do perfil, portanto os três temas do SGP+ (Argos Dark, Slate Dark, Light Executive) funcionam sem CSS novo.
2. **Mapa único e tipado** `src/lib/help/manual-help.ts` (`SCREEN_HELP`). Rotas com parâmetros resolvem pelo padrão da rota. Tela sem capítulo: só o item contextual fica desabilitado (`aria-disabled`) com o motivo visível e lido por leitor de tela; "Manual do usuário" continua ativo.
3. **Gerador do manual** (`scripts/generate-manual-usuario-html.mjs`): tokens de cor para tema claro e escuro, seletor **Claro / Escuro** (botões com `aria-pressed`, 44 px, teclado), tema definido por script no `<head>` antes da primeira pintura (sem piscar), `?tema=` e `?integrado=1`, botão "Voltar ao SGP+" só no modo integrado, foco visível, destaque do alvo da âncora. Sem CDN e sem requisição de rede (a validação do gerador agora também falha se houver `fetch`/XHR/cookies).
4. **Publicação sem duplicar arquivo:** `vite-plugin-manual-usuario.ts` serve `docs/manual/manual-usuario.html` em `/manual/manual-usuario.html` no `npm run dev` e o emite, byte a byte, em `dist/manual/` no `npm run build`. Constantes de caminho em `src/lib/help/manual-paths.ts` (lidas pelo app e pelo plugin).
5. **README do manual** com parâmetros de URL, publicação e manutenção do mapa.

## Arquivos

Alterados: `docs/manual/manual-usuario.html` (regenerado), `docs/manual/source/README.md`, `scripts/generate-manual-usuario-html.mjs`, `src/components/AppHeader.tsx`, `tsconfig.node.json`, `vite.config.ts`.
Criados: `src/components/shell/HelpMenu.tsx`, `src/components/shell/HelpMenu.test.tsx`, `src/lib/help/manual-help.ts`, `src/lib/help/manual-help.test.ts`, `src/lib/help/manual-paths.ts`, `vite-plugin-manual-usuario.ts`, este retorno.
Removidos: nenhum. `MANUAL_USUARIO_SGP.md` **não foi alterado**. Migrations: nenhuma. Backend, banco, `main`, `homol`: não tocados.

## Mapa rota/tela → âncora do manual

| Rota | Tela | Âncora |
|---|---|---|
| `/app/backlog` | Painel operacional | `#cap-5` |
| `/app/nova-esteira` | Nova esteira | `#cap-6-6-3-as-formas-de-criar-uma-esteira` |
| `/app/esteiras/:id` | Detalhe da esteira | `#cap-6-6-2-ler-o-detalhe-de-uma-esteira` |
| `/app/esteiras/:id/alterar` | Alterar esteira | `#cap-6-6-10-alterar-uma-esteira-existente` |
| `/app/importar-os` | Nova esteira por documento | `#cap-17` |
| `/app/gestao/esteiras/laboratorio` | Laboratório de Esteiras | — (item contextual desabilitado) |
| `/app/apontamento/:taskId` | Apontamento | `#cap-7` |
| `/app/gestao/apontamento/:stepNodeId` | Apontamento gerencial | `#cap-7-corrigir-remover-e-lancar-por-outra-pessoa` |
| `/app/planejamento-semanal` | Planejamento semanal | `#cap-8` |
| `/app/agenda-semanal` | Agenda da semana | `#cap-9` |
| `/app/gestao/evolucao-esteiras` | Evolução das Esteiras | `#cap-14` |
| `/app/minha-fila` | Minha fila | `#cap-10` |
| `/app/jornada` | Minha jornada | `#cap-11` |
| `/app/chamados` | Chamados | `#cap-19-19-9-acompanhar-os-seus-chamados` |
| `/app/minhas-atividades` | Minhas Atividades | — (item contextual desabilitado) |
| `/app/meu-trabalho` | Meu Trabalho | — (item contextual desabilitado) |
| `/app/gestao/jornada-colaborador` | Jornada por colaborador | `#cap-12` |
| `/app/dashboard` | Dashboard | `#cap-15` |
| `/app/colaboradores` | Colaboradores | `#cap-16-16-2-consultar-colaboradores` |
| `/app/colaboradores/saude-operacional` | Saúde operacional | `#cap-18` |
| `/app/equipes` | Equipes | `#cap-16-16-17-equipes-consultar-criar-e-alterar` |
| `/app/equipes/nova` | Nova equipe | `#cap-16-16-17-equipes-consultar-criar-e-alterar` |
| `/app/equipes/:id` | Equipe | `#cap-16-16-18-equipes-membros-e-referencia` |
| `/app/usuarios` | Usuários | `#cap-16-16-7-consultar-usuarios` |
| `/app/configuracoes-operacionais` | Configurações operacionais | `#cap-16-16-11-setores` |
| `/app/configuracoes/sistema` | Configurações do sistema | `#sec-3-6` |
| `/app/matrizes-operacao` | Matrizes de operação | `#cap-6-6-5-criar-a-partir-de-uma-matriz` |
| `/app/matrizes-operacao/nova` | Nova matriz de operação | `#cap-6-6-5-criar-a-partir-de-uma-matriz` |
| `/app/matrizes-operacao/:itemId` | Matriz de operação | `#cap-6-6-5-criar-a-partir-de-uma-matriz` |
| `/app/matrizes-operacao/:itemId/preview` | Pré-visualização da matriz | `#cap-6-6-5-criar-a-partir-de-uma-matriz` |
| `/app/permissoes-por-papel` | Permissões por papel | `#cap-4-4-7-consultar-e-alterar-as-permissoes-de-um-perfil` |
| `/app/usuarios/trilha` | Trilha administrativa | `#cap-4-4-8-conferir-alteracoes-de-permissao-na-trilha-administrativa` |
| `/app/conta/alterar-senha` | Alterar senha | `#sec-3-3` |

Modo Fábrica (`/app/producao/*`) e Kiosk (`/app/kiosk/*`) usam layouts próprios, sem a barra superior do SGP+. Por isolamento do kiosk e por não alterar a navegação por toque, **não receberam o menu**; o capítulo 13 do manual continua acessível pelo menu "Manual do usuário" das demais telas.

## Como abrir o manual

- **Dentro do SGP+:** menu **? Ajuda → Manual do usuário** (ou **Como usar esta tela**). Abre em `/manual/manual-usuario.html?integrado=1&tema=<claro|escuro>#<âncora>`, na mesma aba; Voltar do navegador retorna à tela anterior. Light Executive envia `claro`; Argos Dark e Slate Dark enviam `escuro`.
- **Fora do SGP+:** abrir `docs/manual/manual-usuario.html` no navegador (arquivo ou URL estática). Seletor **Claro / Escuro** no topo; a escolha fica em `localStorage` (`sgp.manual.tema`); sem escolha, vale o tema do sistema.

## Validações executadas (resultado real)

| Comando / verificação | Resultado |
|---|---|
| `npm run manual:usuario:html` | ok — 21 capítulos, 112 seções |
| `npm run manual:usuario:html:check` | ok — em dia com a fonte |
| `git diff -- docs/manual/source/MANUAL_USUARIO_SGP.md` | vazio |
| `npm run build` (`tsc -b && vite build`) | ok; `dist/manual/manual-usuario.html` idêntico ao gerado (`cmp`) |
| ESLint nos arquivos criados/alterados | ok, 0 problemas |
| Testes novos (`manual-help.test.ts`, `HelpMenu.test.tsx`) | 26 passaram |
| `npm test` completo | 1408 passaram, 5 falharam (preexistentes, abaixo) |
| `npm run lint` completo | 117 problemas (94 erros, 23 avisos) — **idêntico à base** |
| `git diff --check` | ok |

Verificação em navegador (Chromium + Playwright, servidor de desenvolvimento, API simulada): **78/78 checagens ok**, nos temas Argos Dark e Light Executive:
- menu abre/fecha por clique, Esc, clique fora e setas; foco volta ao botão; ordem dos itens; "Abrir chamado" abre o diálogo existente;
- "Como usar esta tela" em **6 telas de 5 grupos** (Painel, Agenda da semana, Minha fila, Jornada por colaborador, Trilha administrativa e uma **rota com parâmetro**, `/app/equipes/42`): URL com a âncora certa, alvo existente e visível no topo, tema e modo integrado corretos, Voltar retorna à rota de origem; recarregar mantém a âncora;
- tela sem capítulo (`/app/minhas-atividades`): item contextual desabilitado, manual continua;
- celular 375 px: ícone com 44 px, menu dentro da tela, sem rolagem horizontal, no SGP+ e no manual;
- manual autônomo (`file://`): segue o tema do sistema, alterna por teclado, `aria-pressed` correto, preferência persiste após recarregar, `?tema=` prevalece, nenhuma requisição de rede.
Contrastes calculados (WCAG): todos os pares de texto/link/foco ≥ 4,5:1 nos dois temas (mínimo 4,86).

## Falhas preexistentes (não introduzidas por esta tarefa)

Medidas na base `c611d10f` (worktree separado) e no commit `1924ae01`, com os mesmos números:
- `npm run lint`: 117 problemas (94 erros, 23 avisos), todos em `src/`/`server/` fora dos arquivos desta tarefa.
- `npm test`: 5 falhas em `ApontamentoPage.test.tsx` (3) e `ApontamentoGestorPage.test.tsx` (2), todas em "data de realização".
- Testes do backend (`server/`) não foram executados: nada ali mudou.

## Decisões e limitações

- **Cor de link do manual no tema escuro** passou de #3e7baa para #6fa8d6 (contraste 4,4 → 7,8). Mudança visual pequena e intencional.
- **Âncoras derivadas de título** (por exemplo `cap-16-16-7-consultar-usuarios`) mudam se o título for renomeado. O teste do mapa acusa isso. Capítulos (`cap-N`) e seções `sec-N-M` são estáveis.
- **Matrizes de operação** (lista, nova, editor, pré-visualização) apontam para 6.5 "Criar a partir de uma matriz", a única parte do manual que explica matrizes. **Não há capítulo sobre criar/editar matrizes**; vale decidir se o manual ganha um.
- **Configurações do sistema** aponta para 3.6 (sessão e inatividade) e **Alterar senha** para 3.3 (barra superior): são as seções que as descrevem.
- **Sem ajuda contextual (item desabilitado):** Laboratório de Esteiras, Minhas Atividades e Meu Trabalho (sem entrada no menu e sem capítulo, ver seção 21.1).
- O botão "Abrir chamado" aparece duas vezes (botão do cabeçalho e atalho no menu) porque o botão existente foi preservado, como pedido.
- Não validado: produção, impressão do manual a partir do tema claro (o CSS de impressão não foi alterado), páginas do app que quebram com a API simulada (Dashboard, Planejamento, Minha jornada, Detalhe da esteira): o mapa delas é coberto por teste unitário, não por navegador.
- O build depende de `docs/manual/manual-usuario.html` estar gerado e commitado; se estiver desatualizado em relação ao Markdown, o build publica a versão antiga. Rode `npm run manual:usuario:html:check` antes de publicar.

## Como reverter

`git revert <SHA do commit feat(ajuda)>` (e do commit deste retorno, se desejado) em `develop`; é um commit isolado e sem migrations. Reverter restaura o HTML do manual anterior (apenas tema escuro) e remove o menu e o plugin. Nenhum dado é afetado.

## Estado final

- Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
- `git status`: limpo após o commit deste retorno.
- Commit/push/PR: ver resposta final da sessão (sem PR, conforme autorizado).
