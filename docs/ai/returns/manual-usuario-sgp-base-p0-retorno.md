# Retorno — `manual-usuario-sgp-base-p0`

- **TASK_ID:** `manual-usuario-sgp-base-p0`
- **Data/hora:** 2026-10-03 (UTC)
- **Status final:** concluída
- **Branch:** `docs/manual-usuario-sgp-base-p0`
- **SHA base:** `1a951e4e5f65a958bbf22fec64c79e915164c4ed` (tip de `origin/docs/auditoria-cobertura-funcional-manual-sgp`, conferido)
- **SHA final:** ver seção "Commit e push"
- **Working tree ao encerrar:** limpo

## Objetivo

Normalizar a base documental do manual do SGP+: corrigir na matriz técnica apenas divergências factuais já comprovadas, criar o artefato canônico do manual de usuário e documentar a separação entre os dois.

## Etapa A — conferência da base

| Verificação | Resultado |
|---|---|
| `git fetch origin --prune` | OK |
| `origin/docs/auditoria-cobertura-funcional-manual-sgp` existe | sim |
| SHA da branch de auditoria | `1a951e4e5f65a958bbf22fec64c79e915164c4ed` — **idêntico ao informado** |
| `git cat-file -t 1a951e4e…` | `commit` |
| Branch criada de `1a951e4e` | `docs/manual-usuario-sgp-base-p0` |
| `main` / `develop` / `homol` | intactas (`c611d10f`, `c611d10f`, `6b768c85`) |

Nenhuma divergência entre a instrução e o estado real do repositório na Etapa A. A auditoria permanece ancestral desta branch.

## Arquivos alterados / criados

| Arquivo | Ação |
|---|---|
| `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` | alterado (correções B1–B8) |
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | **criado** |
| `docs/manual/source/README.md` | reescrito (Etapa E) |
| `docs/ai/returns/manual-usuario-sgp-base-p0-retorno.md` | criado (este arquivo) |

Nenhum outro arquivo foi tocado.

## DIVERGÊNCIA ENCONTRADA — B2 executado de forma corrigida

**Esta é a única divergência relevante entre a instrução recebida e o código real, e precisa de leitura humana.**

A instrução B2 pedia corrigir a afirmação de que "apenas `COMPLETED` pode ser reaberto", porque a auditoria anterior concluiu que o código também aceita `ABORTED`. **Ao reconferir o código, essa conclusão da auditoria está imprecisa** e aplicá-la literalmente introduziria um erro factual na matriz técnica.

O que o código realmente faz:

| Ação | Pré-condição | Destino | Serviço | Mensagem de bloqueio |
|---|---|---|---|---|
| **Reabrir atividade** | `current !== 'COMPLETED'` → recusa | `REOPENED` | `conveyor-step-operational.service.ts:366` | “A etapa só pode ser reaberta quando estiver concluída.” |
| **Restaurar atividade dispensada** | `current !== 'ABORTED'` → recusa | `REOPENED` | `conveyor-step-abort.service.ts:458` | “A atividade só pode ser restaurada quando estiver dispensada.” |

A máquina de estados (`canTransitionStepStatus`) aceita `→ REOPENED` a partir de `COMPLETED` **ou** `ABORTED` — foi isso que a auditoria observou. Mas as duas rotas de API restringem cada **ação** a uma única origem. Portanto:

- a mensagem `MSG-ATI-005` **está correta** para a ação Reabrir e não deveria ser "corrigida";
- a imprecisão real da matriz era outra, e foi essa que corrigi: ATI-003 afirmava "Somente atividade `COMPLETED` pode ser reaberta" enquanto ATI-005 documentava `ABORTED → REOPENED`, sem explicar que são **duas ações distintas com o mesmo destino**.

**Decisão aplicada,** conforme `CLAUDE.md` §2/§6 e `AGENTS.md` ("se houver conflito entre IA e código real, o código real vence"): ATI-003 passou a apresentar as duas ações em tabela, com pré-condição e serviço de cada uma; ATI-005 ganhou a pré-condição explícita; `MSG-ATI-005` foi reescrita para deixar claro que se aplica à ação Reabrir e remete à ação Restaurar; e foram catalogadas duas mensagens antes ausentes (`MSG-ATI-006` e `MSG-ATI-007`).

**Consequência para o relatório da auditoria:** os itens **D3** e **#19** da matriz daquele relatório estão imprecisos. Não os alterei — o relatório é fotografia histórica de uma tarefa já encerrada e as restrições desta tarefa não autorizam editá-lo. Fica registrado aqui para correção em rodada própria, se o time julgar necessário.

## Etapa B — correções factuais na matriz técnica

| Item | O que foi feito |
|---|---|
| **B1** | ATI-001 reescrito em três blocos: (1) tabela das **quatro** situações efetivamente persistidas (`PENDING`, `COMPLETED`, `REOPENED`, `ABORTED`) com o serviço que grava cada uma; (2) `IN_PROGRESS` e `BLOCKED` declarados como códigos **sem caminho de escrita**; (3) nota sobre os seis rótulos derivados da camada de apresentação, com a advertência de não confundi-los com situações persistidas. |
| **B2** | Executado de forma corrigida — ver a seção de divergência acima. |
| **B3** | VAL-017 ampliado: o rótulo `Mês atual (UTC)` aparece em **três** pontos (exportação da Jornada, seletor de período do Dashboard e catálogo de rótulos de período), não só no arquivo exportado. Título do VAL ajustado. Nenhuma correção de produto foi inventada. |
| **B4** | 45.4/45.5 reescritos no vocabulário de **alocação**, com a regra de contagem uma vez por alocação colaborador × atividade e os textos reais da interface. JOG-001 ganhou rota e permissão; JOG-002 passou de "evolução prevista" para entrega em produção, com teto de **20** na consulta; JOG-003 registrou o teto de **50** na exportação. 45.8 ganhou tabela comparando os dois tetos. |
| **B5** | Nova seção **1.3 Convenções de vocabulário**, com tabela conceito → termo preferencial → termos técnicos/legados: **atividade** (não `STEP`), **Modo Fábrica** (não Kiosk/Produção Web), **alocação**, **situação da atividade**. Aplicada de forma semântica nos títulos das seções 14, 15 e 44, na tabela 2.1, no identificador `ATI-*` e na lista de prioridade. Nenhuma substituição cega: evidências, caminhos de arquivo, nomes de código e citações literais de mensagens foram preservados. |
| **B6** | VAL-004 reconfirmado e mantido aberto, com o efeito prático explicitado. VAL-006 e VAL-014 marcados como **resolvidos para fins documentais**, com a evidência de ausência de escritor/produtor, preservando a decisão técnica pendente. VAL-015 reescrito e ampliado para as **três** rotas sem ponto de entrada. Nova legenda de status no cabeçalho da seção 49, com o quadro de situação de todos os VAL. Nenhum VAL que depende de decisão humana foi decidido. |
| **B7** | Referente das classificações tornado explícito em três lugares: aviso na seção 1.1, nota acima da tabela 2.1 e nota na seção 37 — deixando claro que "Cobertura atual" avalia os HTML derivados, não a matriz nem o manual de usuário. |
| **B8** | Cabeçalho atualizado: commit analisado `c611d10f`, data da fotografia 2026-10-03, fotografia anterior registrada, natureza declarada como matriz técnica, apontamento para o manual de usuário, método de auditoria (**declarando explicitamente que nenhuma tela foi executada e nenhum banco consultado**) e lista das correções desta revisão com link para o relatório. |

Acréscimo além de B1–B8, derivado de C4: **CRT-007** registra o Laboratório de Esteiras como funcionalidade implementada e não exposta, com fonte e regra documental.

## Etapa C — decisões de produto aplicadas

| Decisão | Como foi aplicada |
|---|---|
| **C1** — enums crus na interface | O manual de usuário usa **"situação da atividade"** como conceito. `PENDING` e `ABORTED` não aparecem no manual de usuário (verificado: 0 ocorrências). A inconsistência está registrada apenas no anexo 21.3, como tradução de tela. |
| **C2** — parâmetros de URL e nomes internos | `completed_at`, `days=` e `scope=ativas` não aparecem no manual de usuário (0 ocorrências). O anexo 21.3 descreve a situação em português funcional, sem reproduzir os nomes. Nenhuma alteração na aplicação. |
| **C3** — reset de PIN com texto "nova senha" | O manual trata o recurso como **PIN do Modo Fábrica** em todo o texto. A inconsistência está registrada no anexo 21.3 como pendência editorial. Nenhuma alteração na aplicação. |
| **C4** — Laboratório de Esteiras | **Não** apresentado como disponível no manual de usuário; consta apenas no anexo 21.1. Registrado na matriz técnica em CRT-007 e VAL-015. |
| **C5** — Minhas Atividades e Meu Trabalho | Nenhuma instrução de acesso por endereço. Os capítulos da estrutura não os incluem como recurso operacional; constam do anexo 21.1. Na matriz técnica, VAL-015 registra rota existente e ausência de entrada de navegação. |

## Etapa D — estrutura criada no manual de usuário

`docs/manual/source/MANUAL_USUARIO_SGP.md` — 21 capítulos, na ordem exigida, sem redução de cobertura.

**Com conteúdo real nesta rodada:**

| Capítulo | Conteúdo |
|---|---|
| 1. Sobre o SGP+ | hierarquia esteira → tarefa → setor → atividade e os três eixos de uso (curto, conforme D1) |
| 2. Como usar este manual | público, dependência de permissão, **padrão de seis blocos** que os capítulos pendentes deverão seguir, convenções de texto, limites do manual |
| 3. Acesso e navegação | login e mensagens reais, barra superior, **os 5 agrupamentos do menu com os rótulos reais**, tabela "você quer… vá em", sessão e inatividade |
| 20. Glossário do usuário | 27 termos funcionais, incluindo os 11 exigidos, mais a nota sobre `STEP` como termo técnico/legado |
| 21. Anexo | telas sem entrada no menu, elementos sem funcionamento, ajustes de texto pendentes, divergência de PIN, recursos inexistentes |

**Marcados como pendentes** (capítulos 4 a 19), cada um só com o marcador exigido e de 3 a 6 bullets de tópicos:

`> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]`

Nenhum capítulo pendente recebeu texto genérico de preenchimento.

Observação sobre D3: o capítulo 1 recebeu conteúdo curto e o capítulo 4 ficou pendente. A exigência de D1 (explicar público e dependência de permissão) foi atendida em 2.1 e 2.2, que é onde o leitor a encontra primeiro.

## Etapa E — README

`docs/manual/source/README.md` **existia** e foi reescrito. Deixa explícito: manual de usuário como fonte canônica e origem de HTML/PDF; matriz técnica como fonte auditável de rastreabilidade; o fluxo `código → matriz → manual → HTML/PDF`; e que o caminho inverso não é válido.

## Validações realmente executadas

| Validação | Resultado real |
|---|---|
| `git fetch origin --prune` | OK |
| SHA base conferido contra o informado | idêntico |
| `git status --short` antes do commit | 2 modificados + 2 novos, todos em `docs/` |
| `git diff --check` | **5 avisos de trailing whitespace**, todos no bloco de metadados do cabeçalho da matriz. São quebras de linha do Markdown (dois espaços ao final), **convenção já existente no arquivo**: o cabeçalho original em `HEAD` tem 6 linhas no mesmo formato. Mantidas por consistência; nenhum outro aviso. |
| `git diff --name-only 1a951e4e..HEAD` após o commit | somente os 4 arquivos de `docs/` listados acima |
| Nenhuma alteração fora de `docs/` | confirmado |
| Termos proibidos em `MANUAL_USUARIO_SGP.md` | `PENDING` 0 · `ABORTED` 0 · `migration` 0 · `endpoint` 0 · `completed_at` 0 · `scope=ativas` 0 · `days=` 0 · `COMPLETED` 0 · `REOPENED` 0 · `DRAFT` 0 · `PUBLISHED` 0 · `overwrite` 0 · `is_active` 0 · `Kiosk` 0 · `Produção Web` 0 |
| `STEP` em `MANUAL_USUARIO_SGP.md` | **2 ocorrências, ambas declaradas.** (1) nota ao final do capítulo 20, classificando-o como termo técnico/legado que o usuário não precisa conhecer — exceção expressamente permitida; (2) linha do anexo 21.3, cuja função é traduzir o que aparece na tela, com nota remetendo à mesma declaração do capítulo 20. |

**Build, lint e testes da aplicação: não executados.** Tarefa exclusivamente documental; nenhum arquivo sob build, lint ou teste foi tocado. Nenhum resultado de pipeline é alegado.

## Confirmação de não alteração

Verificado por `git diff --name-only` contra a base: **não** foram alterados `src/`, `server/`, migrations, testes, `package.json`, `app-version.json`, os HTML do manual (`docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`), CSS ou assets. `main`, `develop` e `homol` permanecem nos SHAs registrados na Etapa A. Nenhum problema de interface identificado pela auditoria foi corrigido nesta tarefa. Nenhum screenshot, HTML ou PDF foi gerado.

## Pendências que continuam abertas

**Decisões de produto (bloqueiam capítulos do manual de usuário):**
1. Expor, remover ou manter ocultas as três rotas sem entrada de navegação — Minhas Atividades, Meu Trabalho e Laboratório de Esteiras (VAL-015).
2. Corrigir na interface o rótulo "Mês atual (UTC)" nos três pontos (VAL-017).
3. Corrigir a mensagem de reset de PIN que diz "nova senha" (C3).
4. Padronizar a regra de PIN entre totem e navegador (VAL-004).
5. Tratar a exibição do código interno de situação no painel de encaixe do planejamento (C1).
6. Decidir sobre os textos de filtro do Painel operacional que citam nomes internos de parâmetro (C2).

**Decisões técnicas:** remover ou destinar `IN_PROGRESS` e `BLOCKED` (VAL-006) e os quatro eventos de bloqueio/pausa sem produtor (VAL-014).

**VAL que seguem dependendo de decisão humana, sem alteração:** VAL-001, VAL-002, VAL-003, VAL-005, VAL-007 a VAL-013, VAL-016.

**Documental:** capítulos 4 a 19 do manual de usuário aguardam enriquecimento, na ordem proposta na seção J do relatório da auditoria. Os itens D3/#19 daquele relatório precisam de correção, conforme a seção de divergência acima.

## Commit e push

- Commit: `docs(manual): separa matriz técnica e base do manual de usuário`
- Branch remota: `origin/docs/manual-usuario-sgp-base-p0`
- PR: não criado. Merge: não realizado. Force-push: não realizado.
- SHA final: `<preenchido no commit de registro>`

## Uso de contexto / sessão

`Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.`

`SESSION_CHECKPOINT.md` não foi atualizado: não houve handoff, não há métrica confiável de consumo de contexto e a atividade foi concluída nesta sessão.
