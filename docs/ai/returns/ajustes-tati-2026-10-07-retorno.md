# Retorno — ajustes-tati-2026-10-07

- **TASK_ID:** `ajustes-tati-2026-10-07`
- **Data/hora:** 2026-10-07 23:59 UTC (20:59 em São Paulo)
- **Prompt:** `docs/ai/prompts/ajustes-tati-2026-10-07.md`
- **Escopo desta rodada (instrução humana):** **somente o item 1** — revisar e reconstruir os Guias Práticos de Colaborador e Gestor, com capturas. Itens 2 a 10 **não** foram implementados.
- **Status final:** item 1 concluído; commit local; **não publicado** (sem push, sem PR).

## Git

| Item | Valor |
|---|---|
| Branch | `ccr-8b9d5816-zloyfa` (branch designada pela sessão) |
| SHA inicial da sessão | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` (= `origin/main`) |
| Base de trabalho | `ecb26da78c4a4dbfefcfab7f5de494a31445555d` (= tip de `origin/develop`, avanço fast-forward) |
| `origin/main` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `origin/develop` | `ecb26da78c4a4dbfefcfab7f5de494a31445555d` |
| `origin/homol` | `6b768c852a18b7428e3dadf761bad7e35c1d61ef` |
| SHA final | ver o commit local que contém este arquivo (`git log -1`) |

**Divergência de processo:** o prompt pede um worktree novo e uma branch como `fix/ajustes-tati-2026-10-07`. A sessão remota só permite trabalhar na branch `ccr-8b9d5816-zloyfa`. O checkout estava limpo. A branch foi avançada por fast-forward até o tip de `origin/develop`, sem rebase nem force. `main`, `develop` e `homol` não foram alterados.

## O que foi feito

1. Localizei os dois guias canônicos: `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html`. Eles são escritos à mão e não são gerados (ver `docs/manual/source/README.md`). Não criei uma terceira fonte e não alterei o manual completo.
2. Montei um ambiente local descartável: PostgreSQL 16 local, migrations `0001`–`0053`, seed oficial e um seed complementar com **dados 100% fictícios** via API: colaboradores "Ana Exemplo", "Bruno Fictício", "Carla Modelo", "Diego Teste" e "Gabriela Gestora"; esteiras OS 7070 a 7073; plano semanal publicado; apontamentos e Extra Esteira. Também rodei o backend real e o frontend em modo `real`.
3. Rodei cada jornada com Playwright (Chromium local, `pt-BR`, `America/Sao_Paulo`) nos perfis padrão **COLABORADOR** e **GESTOR**, além do totem (`/app/kiosk`) e do navegador da fábrica (`/app/producao`). Gerei **40 capturas** (21 do Colaborador e 19 do Gestor). Depois otimizei as imagens para PNG de 256 cores: de 8,7 MB para 3,4 MB.
4. Conferi cada orientação contra o código e contra a execução. Reescrevi os dois guias em jornadas curtas (o que fazer, onde clicar, o que deve acontecer, bloqueios e recuperação), com índice, âncoras e uma captura por passo importante.
5. Criei em cada guia o capítulo final **"Divergências, ressalvas e decisões pendentes"**, com IDs estáveis: `GUIA-COL-001…010` e `GUIA-GES-001…010`. Cada item traz tela, perfil, evidência, comportamento observado, impacto, risco e decisão necessária. Os itens são referenciados nas seções do guia.
6. Validei a renderização dos HTML em 1280px e 390px: nenhuma imagem quebrada e nenhuma rolagem horizontal.

## Arquivos

- **Alterados:** `docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`. Ambos foram reescritos e o CSS é embutido, sem CDN de fontes.
- **Criados:** `docs/manual/img/guia-colaborador/*.png` (21), `docs/manual/img/guia-gestor/*.png` (19), `docs/ai/prompts/ajustes-tati-2026-10-07.md` e este retorno.
- **Removidos:** nenhum.
- **Não alterados:** `src/`, `server/`, migrations, testes, `package.json`, `app-version.json`, `docs/manual/manual-usuario.html` e `docs/manual/source/*`.
- **Migrations envolvidas:** nenhuma.

## Principais divergências encontradas (guia anterior × sistema)

| Guia anterior dizia | Sistema real (código/execução) |
|---|---|
| Menu "Minhas Atividades" é a tela principal | fora do menu; o colaborador usa **Minha fila** e **Minha jornada** (`GUIA-COL-001`) |
| Kiosk aceita "PIN 4+ dígitos"; Produção web "similar ao Kiosk" | totem exige exatamente 4 dígitos; o navegador aceita de 4 a 8 e não conclui atividade nem lança Extra Esteira (`GUIA-COL-008`) |
| Jornada com filtros "Hoje / Esta semana / Este mês" | 7/15/30 dias, Mês atual (UTC) e Intervalo personalizado |
| Justificativa aparece na tela de apontamento "quando necessário" | a página `/app/apontamento/:id` não tem justificativa nem conclusão (`GUIA-COL-007`) |
| Designar pelo "+" na aba Estrutura do detalhe; "Ver carga de trabalho" | o detalhe só lê as alocações; alocação é feita em Nova esteira ou Alterar esta esteira (`GUIA-GES-002`) |
| Criar apontamento em nome do colaborador com `time_entries.create_on_behalf` | a permissão não é criada por nenhuma migration; em base limpa, ninguém lança em nome de outro (`GUIA-GES-001`) |
| Toda transição de status exige motivo | Cancelar e Finalizar não pedem confirmação nem motivo (`GUIA-GES-006`) |
| PIN: Resetar, Desbloquear, Ativar/Inativar acesso | só existe **Redefinir PIN**, com PIN provisório fixo 1234 (`GUIA-GES-008`) |
| Plano operacional: "Gerar plano / Aprovar" | a tela mostra "Criar plano operacional"; o fluxo não foi auditado e o texto foi retirado (`GUIA-GES-007`) |
| Evolução: "Imprimir" e "Imprimir Fichas" | **Gerar PDF** por seleção de esteiras e **Imprimir ticket** por atividade (`GUIA-GES-009`) |

Inconsistências observadas na execução e registradas sem correção (fora do escopo desta rodada):

- `GUIA-COL-002` / `GUIA-GES-003`: o previsto aparece por unidade em umas telas e pelo total em outras.
- `GUIA-COL-003`: o papel aparece como "Apoio" para a responsável principal quando a gaveta é aberta pela fila.
- `GUIA-COL-004`: a Minha jornada agrupa pela situação da esteira e mostra o rótulo "Concluída" de forma indevida.
- `GUIA-COL-005`: Extra Esteira não aparece na Minha jornada (item 7 da lista).
- `GUIA-COL-006` / `GUIA-GES-004`: as justificativas não são exibidas (item 8).
- `GUIA-GES-005`: cards do Dashboard não reproduzidos (item 9).

## Tabela de cobertura

| Jornada do guia | Perfil | Tela / captura | Regra comprovada no código | Divergência corrigida | Ressalva |
|---|---|---|---|---|---|
| Entrar no SGP+ | Colaborador | Login / `col 01` | `server/src/modules/auth/*.schemas.ts` (senha mín. 8) | — | — |
| Conhecer a tela / alterar senha | Colaborador | Menu do usuário, Alterar senha / `col 12, 13` | `src/lib/shell/app-nav-config.ts`; `AppHeader.tsx` | menu "Minhas Atividades" → Minha fila | GUIA-COL-001, 009 |
| Ver o trabalho do dia | Colaborador | Minha fila / `col 02, 03` | fila nasce do plano publicado (`my-work-queue`) | caminho e botões ("Apontar horas", não ícone de relógio) | — |
| Apontar pela fila | Colaborador | Registrar tempo / `col 04, 05` | `postTimeEntryBodySchema` (min ≥ 1, qtd ≥ 0, data não futura) | campos e nomes reais | GUIA-COL-002, 003 |
| Justificativa | Colaborador | Fora de sequência / `col 06` | `conveyorAssignments.schemas.ts` (out-of-sequence/exception) | web não exige justificativa por tempo excedido | — |
| Concluir | Colaborador | gaveta (texto) | `markAsDone`; `Concluir atividade` só para alocado | — | — |
| Fora da fila / fora da alocação | Colaborador | Apontar horas / `col 07, 08` | `listTimeEntryUnassignedOpenStepsForCollaborator` | — | — |
| Extra Esteira | Colaborador | aba Extra esteira / `col 09` | `/me/extra-time-entries` | — | GUIA-COL-005 |
| Minha jornada | Colaborador | Jornada / `col 10, 11` | `JornadaPage.tsx` (bucket da esteira; 20 registros) | períodos reais (não Hoje/Esta semana) | GUIA-COL-004, 006, 007 |
| Totem | Colaborador | Kiosk / `col 14–20` | `KioskPinPad.tsx` (`PIN_LENGTH = 4`); justificativa por tempo excedido | PIN de 4 dígitos; fluxo de criação de PIN | GUIA-COL-008 |
| Navegador da fábrica | Colaborador | SGP+ Produção / `col 21` | `production.schemas.ts` (PIN 4–8) | Concluir etapa desativado | GUIA-COL-008 |
| Correção pelo colaborador | Colaborador | (texto) | rota gerencial exige `edit_any`/`delete_any`/`create_on_behalf` | "fale com o gestor" mantido, com evidência | GUIA-COL-010 |
| Menu e permissões | Gestor | (texto) | `app_role_permissions` do perfil GESTOR | nomes atuais do menu | GUIA-GES-009 |
| Painel operacional | Gestor | Painel / `ges 01` | cartões não respondem aos filtros | "Backlog" → Painel operacional | — |
| Criar esteira | Gestor | Nova esteira / `ges 02, 02b` | `postConveyorStepSchema` (Qtd ≥ 1, um principal) | alocação na criação/alteração | GUIA-GES-002 |
| Ciclo de vida | Gestor | Detalhe / `ges 03, 06` | `conveyorOperationalStatus.ts` (transições) | volta exige motivo; cancelar/finalizar não | GUIA-GES-006 |
| Ações de atividade | Gestor | Estrutura operacional / `ges 05` | `EsteiraDetalhePage.tsx` (confirmações) | — | GUIA-GES-003 |
| Planejamento | Gestor | Planejamento / `ges 07, 07b` | `saveOperationalWeekPlanBodySchema` (seg–sex) | salvar ≠ publicar | GUIA-GES-010 |
| Agenda da semana | Gestor | Agenda / `ges 08` | mesmo plano semanal | — | GUIA-GES-010 |
| Evolução das Esteiras | Gestor | Evolução / `ges 09` | botão Gerar PDF | "Imprimir/Imprimir Fichas" removidos | GUIA-GES-009 |
| Dashboard | Gestor | Dashboard / `ges 10` | `dashboard.view_operational` | visão Gerencial só para ADMIN | GUIA-GES-005 |
| Jornada por colaborador | Gestor | Jornada gestão / `ges 11` | exibe Extra Esteira | — | GUIA-GES-003 |
| Corrigir apontamento | Gestor | Apontamento gerencial / `ges 12, 12b` | `patchTimeEntryBodySchema` (um campo por vez) | lançamento em nome de outro indisponível | GUIA-GES-001, 004 |
| PIN do Modo Fábrica | Gestor | Colaboradores / `ges 13, 13c` | `ColaboradoresPage.tsx` (Redefinir PIN, 1234) | ações inexistentes removidas | GUIA-GES-008 |
| Equipes | Gestor | Nova equipe / `ges 14` | equipe = alocação de apoio | — | — |
| Saúde operacional | Gestor | Saúde / `ges 15` | — | — | — |
| Configurações operacionais | Gestor | Descrições / `ges 16` | catálogos de Extra Esteira, justificativas e dispensa | — | — |
| Plano operacional da esteira | Gestor | não capturado | `ConveyorOperationalPlanEmptyState.tsx` | texto antigo retirado | GUIA-GES-007 |

## Validação (execução real)

| Comando | Resultado |
|---|---|
| `npm run manual:usuario:html:check` | exit 0 (manual integral intacto) |
| `npx vitest run src/lib/help` | 1 arquivo, 19 testes passando |
| `npm run build` | exit 0 (só avisos de tamanho de chunk, preexistentes) |
| `npx eslint .` | **exit 1 — 94 erros e 23 avisos, todos preexistentes**, em `src/features`, `server/src`, `src/components`, `src/lib`, `sgp-print-agent`, `src/pages` e `src/mocks`. Nenhum arquivo desta entrega é analisado pelo ESLint (só HTML/PNG/MD) |
| Renderização dos guias (Playwright, 1280px e 390px) | 0 imagens quebradas; 0 elementos com rolagem horizontal |
| Checagem de âncoras e imagens referenciadas | 0 âncoras quebradas; 0 imagens ausentes; 0 imagens sem uso |

Não foram executados testes de backend nem typecheck do servidor, porque nenhum código foi alterado.

## Pendências, riscos e ressalvas

- **Itens 2 a 10 do prompt não foram feitos**, por instrução desta rodada. As divergências que se relacionam a eles (7, 8 e 9) estão registradas nos guias como ressalvas, não como entregas.
- `GUIA-GES-001` exigiria uma migration de permissão. Pelo prompt, isso depende de autorização humana. Antes de decidir, confirmar se o ambiente real já tem `time_entries.create_on_behalf` cadastrada à mão.
- O logotipo exibido no menu lateral das capturas faz parte da interface do produto (asset do app), não de dados de cliente. Todos os demais dados nas imagens são fictícios.
- As capturas refletem a configuração **padrão** dos perfis GESTOR e COLABORADOR. Ambientes com permissões ajustadas em "Permissões por papel" podem mostrar outros itens de menu.
- O Plano Operacional da Esteira e a Importação por documento não foram reauditados nesta rodada.
- Os guias continuam fora do app: não há link no menu **? Ajuda**. A abertura é pelo arquivo, como antes.
- Os scripts de seed e captura ficaram fora do repositório (scratchpad da sessão). Para atualizar as capturas depois das correções dos itens 2 a 10, será preciso refazer o roteiro descrito na seção "O que foi feito".

## Roteiro objetivo de validação com a Tati (08/10, 09:00–09:30)

1. Abrir `docs/manual/colaborador.html` e percorrer as seções 3 a 9, comparando cada captura com a tela real em homologação.
2. Abrir `docs/manual/gestor-esteira.html` e percorrer as seções 3, 4, 6 e 9.
3. Ler os dois capítulos de divergências e decidir, item por item: corrigir no sistema, aceitar como regra ou ajustar o texto.
4. Confirmar se `time_entries.create_on_behalf` existe em produção (`GUIA-GES-001`).

## Próximo passo recomendado

Com a autorização para publicar, enviar a branch e abrir PR para `develop`. Em seguida, iniciar o item 2 (pesquisa `esteira & atividade`) em uma nova rodada.

## Estado final

- `git status`: limpo após o commit local. Ficam apenas os arquivos ignorados `.env.local`, `server/.env` e `dist/`, usados na execução local e não versionados.
- Commit: local na branch `ccr-8b9d5816-zloyfa`. **Push: não realizado** (o prompt exige autorização explícita após a revisão). **PR: não aberto.**
- Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
