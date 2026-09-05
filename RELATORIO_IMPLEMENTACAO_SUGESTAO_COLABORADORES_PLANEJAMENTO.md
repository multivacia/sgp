# Relatório de implementação — sugestão de colaboradores no planejamento semanal

## Status final

**CONCLUÍDO COM RESSALVAS DE LINT PRÉ-EXISTENTE.**

A demanda foi implementada a partir de `origin/main`, com análise read-only de contexto/impacto/spec e implementação pelo papel `sgp-implementer`. Não houve push, pull request, merge, deploy nem execução de migration em ambiente compartilhado.

## SHA utilizado como base

`6c2834eeaca631788ed1029185893ba8168ce398`  
`fix(planning): inclui tempo apontado na visão semanal`

`git fetch origin --prune` foi executado. `origin/main` **não avançou** em relação à referência observada no prompt.

Working tree de partida: limpo. Nenhuma alteração local do usuário foi descartada, sobrescrita, stashada ou resetada.

## Branch

`feature/planning-sugestao-colaboradores`  
Criada de `origin/main` (`git checkout -b feature/planning-sugestao-colaboradores origin/main`).

## Commit local

Mensagem:

`feat(planning): sugere colaboradores por sequência e capacidade`

SHA: gravado em `git log -1` na branch `feature/planning-sugestao-colaboradores` (um único commit local; sem push).

## Resultado da inspeção de schema

**Confirmação feita apenas pelo histórico versionado do repositório.** Não há PostgreSQL local, `.env` nem `DATABASE_URL` neste ambiente. **O banco real não foi consultado.**

`team_members` é criada em `server/migrations/0016_teams_and_permissions.sql` com:

- `id`, `team_id`, `collaborator_id`, `role`, `is_primary`, `is_active`, `created_at`, `updated_at`

Índices relevantes preservados:

- `idx_team_members_team_collaborator_active`
- `idx_team_members_one_primary_active` (um principal ativo por time)

Migrations posteriores (`0017`, `0020`, `0029`) não adicionam coluna de sequência/ordem/prioridade/peso/posição/ranking.

Busca por `suggestion_order` no repositório antes desta entrega: **zero ocorrências**.

**Gate:** não havia coluna inequívoca reutilizável nem coluna ambígua. Seguiu-se com migration nova.

## Migration criada

**Sim.** `server/migrations/0052_team_members_suggestion_order.sql`

- Coluna `suggestion_order INTEGER NOT NULL DEFAULT 1`
- `CHECK (suggestion_order >= 1)` (`chk_team_members_suggestion_order_min`)
- Sem unique / unique index
- Backfill das linhas existentes para `1` (mesmo nível inicial; sem ordem alfabética)
- Idempotente (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`)
- **Não executada** em HML/PRD nem em banco compartilhado

Última migration pré-existente: `0051_conveyor_step_abort_reasons.sql`.

## Decisão de modelagem da sequência

Nome adotado: **`suggestion_order`**, conforme a demanda.

Justificativa: o repositório não tinha convenção equivalente em `team_members`. `sort_order` existe em catálogos administrativos (justificativas, motivos de abort), domínio distinto. `order_index` pertence a nós/assignees da esteira, não a membros de time.

Regras persistidas:

- Inteiro ≥ 1
- Valores repetidos permitidos
- Um principal ativo por time permanece restrito por índice existente
- Novo membro sem ordem explícita: `MAX(suggestion_order) + 1` (ou `1` se o time não tem membros)
- Promoção a principal **preserva** `suggestion_order`
- Listagem de membros: `is_primary DESC`, `suggestion_order ASC`, código, ID — **nunca** `full_name`

## Arquivos alterados

Novos:

- `server/migrations/0052_team_members_suggestion_order.sql`
- `server/src/modules/teams/teams.suggestion-order.ts`
- `server/src/modules/operational-planning/planningSuggestionContext.ts`
- `server/src/tests/planningSuggestionContext.test.ts`
- `server/src/tests/team-members-suggestion-order.test.ts`
- `server/src/tests/planning-suggestion-facts-batch.test.ts`
- `src/domain/operational-planning/planningCollaboratorSuggestion.ts`
- `src/domain/operational-planning/planningCollaboratorSuggestion.test.ts`
- `src/domain/teams/team.mappers.test.ts`
- `src/features/operational-planning/PlanningCollaboratorSuggestionCards.tsx`
- `src/features/operational-planning/planningSuggestionPresentation.ts`
- `src/features/operational-planning/planningSuggestionPresentation.test.ts`
- `RELATORIO_IMPLEMENTACAO_SUGESTAO_COLABORADORES_PLANEJAMENTO.md`

Alterados:

- `server/src/modules/teams/teams.dto.ts`
- `server/src/modules/teams/teams.schemas.ts`
- `server/src/modules/teams/teams.repository.ts`
- `server/src/modules/teams/teams.service.ts`
- `server/src/modules/operational-planning/operational-planning.repository.ts`
- `server/src/modules/operational-planning/operational-planning.service.ts`
- `server/src/tests/teams.test.ts`
- `server/src/tests/operational-planning.backlog-eligibility.test.ts`
- `server/src/tests/operational-planning.factory-intake.test.ts`
- `src/domain/teams/team.types.ts`
- `src/domain/teams/team.mappers.ts`
- `src/domain/operational-planning/operational-planning.types.ts`
- `src/features/gestor/equipes/EquipeDetalhePage.tsx`
- `src/features/operational-planning/OperationalPlanningPage.tsx`
- `src/features/weekly-agenda/weeklyAgendaBatchQueue.ts`
- `src/features/weekly-agenda/weeklyAgendaBatchQueue.test.ts`
- `src/features/weekly-agenda/components/WeeklyAgendaBatchQueueOverlay.tsx`
- `src/features/operation-matrix/matrixPreviewResponsibleLogic.test.ts`

## Regra implementada

Fonte da atividade no planejamento: **`conveyor_node_assignees` do STEP da esteira**. A Matriz não é consultada para gerar sugestões.

Aplicar uma sugestão altera **somente** colaborador e dia do item do plano semanal (rascunho/formulário). Não altera:

- `conveyor_node_assignees`
- responsável estrutural / time da atividade
- Matriz
- membros do time (exceto edição explícita de `suggestion_order` na ficha da equipe)

Responsável concreto (backend, fatos canônicos):

1. colaborador direto ativo marcado como principal;
2. primeiro colaborador direto ativo (`is_primary`, `order_index`, `created_at`, id);
3. principal ativo do time efetivo;
4. primeiro membro ativo da sequência do time.

Resolvedor puro no frontend (`resolvePlanningCollaboratorSuggestion`):

- Cabe no dia: manter responsável e dia.
- Não cabe: alternativa A (mesmo responsável no próximo dia da semana exibida) e alternativa B (próximo da sequência no mesmo dia).
- Sem atravessar semana, sem circular, sem parar no primeiro indisponível.
- Capacidade desconhecida ≠ encaixe; não usa fallback de 480 min para classificar fit.
- Encaixe considera rascunho vivo (`draftItems`) + minutos do modal.
- Desempate: capacidade livre, depois código, depois ID. Nunca nome.

`findBestBatchQueueSuggestion` deixou de ranquear todos os colaboradores por folga semanal + nome. Passa a delegar ao resolvedor com o contexto do item.

## Comportamento para múltiplos times

V1: usa **somente o primeiro time ativo** pela ordenação concreta dos assignees `TEAM` (`is_primary`, `order_index`, `created_at`).  
Não há união silenciosa dos membros de vários times.  
O DTO expõe `multipleTeamsAssigned: true` quando há mais de um TEAM elegível. Coberto por teste em `planningSuggestionContext.test.ts`.

## Mudanças de UX

**Equipe (`/app/equipes/:id`):**

- Coluna “Prioridade de sugestão” (número ≥ 1, valores iguais permitidos).
- Texto explicando que menor valor aparece primeiro e que iguais formam o mesmo nível.
- Principal destacado por rótulo “★ Referência”, `aria-label` e borda — não só cor.
- Edição com `teams.manage_members`; visualização com `teams.view`.
- Controles `min-h-11`, teclado, `sr-only` / `aria-describedby`, toast de confirmação/erro, estado “A guardar…”.

**Planejamento tradicional e Agenda:**

- Cartões selecionáveis no modal “Adicionar ao plano” e na alocação em lote.
- Um clique preenche colaborador/dia; **não salva**.
- Responsável original permanece visível.
- Mensagem de capacidade (“precisa de Xh e o responsável possui Yh”).
- Capacidade indisponível explicada; seleção manual preservada.
- Factory intake usa o contexto do STEP quando existe; senão permanece o fluxo manual (`plannedCollaboratorId` / primeiro colaborador ativo).

## Testes adicionados

- Migration 0052 (SQL: DEFAULT 1, CHECK ≥ 1, sem unique, backfill 1).
- `nextTeamMemberSuggestionOrder` e Zod `suggestionOrder`.
- Contexto canônico: principal direto, `order_index`, múltiplos times, inelegíveis, ordenação sem nome.
- Lote de fatos: no máximo 2 queries para N steps.
- Resolvedor: cabe no dia, igualdade, próximo dia, não atravessa semana, próxima sequência, pula sem capacidade, níveis, empate capacidade/código/ID, nomes duplicados, responsável ausente, capacidade desconhecida, rascunho não salvo, minutos do modal, ausência de time.
- Aplicação da sugestão altera só `{ collaboratorId, day }`.
- Seed inicial não aplica alternativas automaticamente.
- Agenda em lote: deixa de escolher o colaborador com maior folga semanal.
- Integração de times (quando há DB): create/update/list `suggestionOrder`, rejeição `< 1`, preservação de principal.
- Fixture da Matriz atualizada só para o novo campo obrigatório do tipo `TeamMember` (sem mudança de regra da Matriz).

Não há suíte DOM/jsdom no frontend (`vitest` em `node`, `src/**/*.test.ts`). Acessibilidade e cartões foram cobertos no view-model (`aria-pressed`, títulos, mensagem de capacidade). Verificação visual em browser **não foi executada** neste ambiente.

## Comandos executados e exit codes

| Comando | Onde | Exit code | Resultado |
|---|---|---:|---|
| `git fetch origin --prune` | /workspace | 0 | `origin/main` = `6c2834ee…` |
| `npx vitest run` | /workspace | 0 | 194 arquivos, **1287** testes passed |
| `npx vitest run` | /workspace/server | 0 | 108 passed / 41 skipped; **768** testes passed / 369 skipped (skip = sem DB) |
| `npx tsc -b` | /workspace | 0 | typecheck frontend OK |
| `npx tsc -p tsconfig.json` | /workspace/server | 0 | typecheck/build server OK |
| `npx eslint .` | /workspace | **1** | 144 problemas (121 errors, 23 warnings), **pré-existentes** no repositório |
| `npx eslint` nos arquivos novos de times/sugestão (server) | /workspace/server | 0 | limpo |
| `npx vite build` | /workspace | 0 | build frontend OK |
| SQL `information_schema` em `team_members` | — | **não executado** | sem Postgres local |

## Typecheck, lint e build

- **Typecheck:** frontend `tsc -b` exit 0; server `tsc -p tsconfig.json` exit 0.
- **Lint:** `npm run lint` / `npx eslint .` exit **1**. Falhas são majoritariamente pré-existentes (argos-integration regex, print-agent, refs em shell, etc.). O overlay da Agenda mantém um `react-hooks/set-state-in-effect` **já existente** no `useEffect` de inicialização da fila; fora de escopo refatorar o ciclo de vida do overlay. Arquivos novos do resolvedor/times/migration testes: lint limpo.
- **Build:** `tsc -b && vite build` exit 0; server `tsc -p tsconfig.json` exit 0.

## Limitações conhecidas

- V1 não une membros de vários times.
- V1 não atravessa semana nem circulariza a sequência.
- Cards já planejados não são reagendados automaticamente.
- Sem contexto de esteira (factory intake sem assignees), o fluxo permanece manual.
- Capacidade “desconhecida” = ausência de linha em `capacityByCollaboratorDay`; o GET da semana costuma preencher ativos com fallback 480 no backend, então o estado unknown é raro na UI hidratada.
- Testes HTTP de times e migration real dependem de banco; neste ambiente foram skipped (369 testes server).
- Browser/end-to-end e toque real na Agenda não foram executados (sem app/dev server autenticado neste fluxo).

## Pendências

- Aplicar `0052` em bancos de desenvolvimento/HML/PRD **com aprovação humana**.
- Gestores precisam ajustar `suggestion_order` na ficha da equipe; o backfill deixa todos no nível `1` até reordenação consciente.
- Lint global do repositório continua vermelho por dívidas anteriores; não foi “limpo” nesta demanda.
- Revisão humana antes de merge.

## Confirmação de processo

- Push: **não realizado**
- Pull request: **não realizado**
- Merge em `main` ou `develop`: **não realizado**
- Deploy: **não realizado**
- Migration em ambiente compartilhado/produção: **não executada**
- Alteração de versão da aplicação: **não realizada**
