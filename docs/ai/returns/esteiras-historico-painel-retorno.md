# Retorno — esteiras-historico-painel

- **TASK_ID:** `esteiras-historico-painel`
- **Data/hora:** 2026-10-19 21:15 UTC
- **Objetivo:** separar o Painel operacional (`/app/backlog`) em abas **Operacional** e **Histórico**, com regra no backend, e criar arquivar/desarquivar manual de esteiras encerradas.
- **Status final:** IMPLEMENTADO E TESTADO LOCALMENTE — commits locais, **sem push, sem merge, sem deploy**.
- **Branch:** `feat/esteiras-historico-painel` (criada a partir de `develop`)
- **SHA inicial (`develop` = `origin/develop`):** `ba600949961b6900587e60af96ce8d8b14e85095`
- **SHA final:** último commit da branch (`git log -1 feat/esteiras-historico-painel`); os dois commits de código anteriores são `9503e7b5` (backend) e `3f9829ba` (frontend).
- **Prompt:** `docs/ai/prompts/esteiras-historico-painel.md`
- **Decisões do Gustavo (19/10/2026) aplicadas:** base `ba60094`; links do dashboard para Finalizadas/Canceladas **sem** `days` também abrem a lista combinada (regra, não pendência); sem push/merge.

## Regra final implementada

Seção efetiva calculada em SQL (`conveyorPanelSectionJoinsSql` em `conveyors.repository.ts`), mês corrente = `date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'`:

1. Status diferente de `FINALIZADA`/`CANCELADA` → **OPERACIONAL**.
2. Último evento de arquivamento = `CONVEYOR_ARCHIVED` → **HISTORICO** (manual).
3. Último evento = `CONVEYOR_UNARCHIVED` com `occurred_at` no mês corrente → **OPERACIONAL** (manual).
4. Senão, regra automática: data de encerramento (`completed_at` para `FINALIZADA`, `canceled_at` para `CANCELADA`) anterior ao início do mês, **ou nula** → **HISTORICO**; senão **OPERACIONAL**.

- Último evento via `LEFT JOIN LATERAL ... ORDER BY occurred_at DESC, created_at DESC LIMIT 1` — sem `JOIN` direto em eventos, sem duplicar linhas.
- `GET /api/v1/conveyors?view=operacional|historico|todas` (ausente = `operacional`; valor inválido = 422, padrão Zod do projeto). Aplicada **depois** do escopo por colaborador e junto com `q`, `priority`, `responsible`, `operationalStatus`. Cada item traz `panelSection` (`OPERACIONAL`/`HISTORICO`) e `panelSectionManual`.
- `POST /api/v1/conveyors/:id/archive` e `/unarchive` com `requirePermission('conveyors.edit_status')`. Transação com `FOR UPDATE OF conveyors`; status não encerrado → **422** (`CONVEYOR_ARCHIVE_STATUS_NOT_ALLOWED`, "Só é possível arquivar ou desarquivar esteiras finalizadas ou canceladas."); ação incoerente com a seção efetiva → **409** (`CONVEYOR_ARCHIVE_STATE_CONFLICT`); inexistente → 404. Evento com `source = 'USER_ACTION'`, `created_by` = usuário logado, `occurred_at = now()` do banco, `previous_value`/`new_value` = seção antes/depois.
- Transição para `CANCELADA` (`updateConveyorOperationalStatus`) grava `canceled_at = now()` quando o status anterior não era `CANCELADA`. Busca no backend: é o **único** ponto que grava `CANCELADA` em `conveyors` (PATCH `/status`; retornos de ciclo de vida e autoinício por apontamento usam a mesma função com outros destinos). O fixture de teste `setConveyorProductionStatusForIntegration` faz `UPDATE` direto, mas é só de teste e não foi alterado.

### Tela

- Abas **Operacional** (padrão) / **Histórico** no padrão visual de abas do Dashboard. Aba na URL: `aba=historico`; `aba=todas` = lista combinada. `scope`, `situacao`, `days`, `q`, `priority`, `responsible`, `pageSize` preservados; `page` zera ao trocar de aba.
- Lista combinada: sem `aba`, a URL `situacao=finalizadas&days=N` (link atual do dashboard) já abre combinada; os links do dashboard para Finalizadas e Canceladas, com ou sem `days`, passam a gravar `aba=todas`. Aviso "Exibindo Operacional + Histórico" e botão "Voltar às abas" (vai para Operacional). Os demais links do dashboard não mudaram (abrem Operacional).
- Filtros, cards, colunas, paginação e textos existentes inalterados; passam a valer sobre o conjunto da aba (o servidor já devolve só a aba). Ao trocar o filtro Situação, a aba vigente é mantida (`preserveBacklogTab`), para a lista combinada não cair ao remover `days`.
- Ação **Arquivar**/**Desarquivar** no menu "Ações" da linha, só com `conveyors.edit_status`, só para finalizada/cancelada e conforme `panelSection`; confirmação simples no mesmo padrão do diálogo de exclusão; toast de sucesso/erro e recarga da lista.
- Linha do tempo de eventos: "Esteira arquivada" / "Esteira desarquivada" com descrição em português.

## Migration

`server/migrations/0054_conveyors_canceled_at.sql` (última existente era `0053`), idempotente:

- `ALTER TABLE conveyors ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ NULL;`
- `UPDATE conveyors SET canceled_at = updated_at WHERE operational_status = 'CANCELADA' AND canceled_at IS NULL;`
- `COMMENT ON COLUMN conveyors.canceled_at` explicando o backfill por `updated_at`.

Executada **somente** em PostgreSQL 16 local descartável (porta 55432, `trust`). Não executada em ambiente compartilhado.

## Encerradas sem data de encerramento (base de teste)

A base de teste é descartável e só contém dados gerados pelos testes de integração (sem dado real).

| Momento | FINALIZADA (total / sem `completed_at`) | CANCELADA (total / sem `canceled_at`) |
| --- | --- | --- |
| Após a suíte da `develop`, antes da 0054 | 9 / **6** | 4 / 4 (coluna ainda não existia) |
| Logo após a 0054 | 9 / **6** | 4 / **0** (backfill) |
| Ao final (após suítes completas desta branch) | 102 / **17** | 38 / **0** |

As finalizadas sem `completed_at` vêm de fixtures que fazem `UPDATE operational_status` direto. Pela regra, vão ao Histórico. **Antes de produção, medir a mesma contagem na base real**: `SELECT operational_status, count(*) FILTER (WHERE completed_at IS NULL) FROM conveyors WHERE operational_status = 'FINALIZADA' AND deleted_at IS NULL GROUP BY 1;`

## Arquivos

| Arquivo | Motivo |
| --- | --- |
| `server/migrations/0054_conveyors_canceled_at.sql` (novo) | Coluna `canceled_at`, backfill e comentário |
| `server/src/modules/conveyors/conveyors.repository.ts` | SQL da seção efetiva (LATERAL); `view` em `listConveyors`; `panel_section(_manual)` no item; `lockConveyorPanelSection`; `canceled_at` na transição para `CANCELADA` |
| `server/src/modules/conveyors/conveyor-panel-archive.service.ts` (novo) | Arquivar/desarquivar: validação 422/409, evento e transação |
| `server/src/modules/conveyors/conveyor-panel-archive.controller.ts` (novo) | Controllers dos dois POST (padrão do `conveyor-lifecycle.controller`) |
| `server/src/modules/conveyors/conveyors.routes.ts` | Rotas `archive`/`unarchive` com `conveyors.edit_status` |
| `server/src/modules/conveyors/conveyors.schemas.ts` | `view` no schema Zod do GET |
| `server/src/modules/conveyors/conveyors.list.controller.ts` | Repassa `view` |
| `server/src/modules/conveyors/conveyors.dto.ts`, `conveyors.service.ts` | `panelSection` e `panelSectionManual` no item da lista |
| `server/src/modules/conveyors/operational-events/conveyor-operational-events.types.ts` | Tipos `CONVEYOR_ARCHIVED` e `CONVEYOR_UNARCHIVED` |
| `server/src/shared/errors/errorCodes.ts` | Códigos de erro 422/409 |
| `server/src/tests/conveyors-panel-history.integration.test.ts` (novo) | 15 testes de integração (critérios 1–11) |
| `src/pages/BacklogPage.tsx` | Abas, aviso da lista combinada, carga por `view`, recarga após arquivar |
| `src/lib/backlog/backlogUrlParams.ts` | `parseBacklogTab`, `withBacklogTab`, `preserveBacklogTab`; normalização de `aba` inválida |
| `src/lib/backlog/backlogCopy.ts` | Textos em português (abas, aviso, diálogos, toasts) |
| `src/components/backlog/backlogRowActions.ts` | `resolveBacklogArchiveAction` (permissão + ação válida) |
| `src/components/backlog/BacklogTable.tsx` | Item Arquivar/Desarquivar no menu e diálogo |
| `src/components/backlog/BacklogArchiveConveyorDialog.tsx` (novo) | Confirmação simples (padrão do diálogo de exclusão) |
| `src/lib/dashboard/dashboardNavigation.ts` | Destino dos links Finalizadas/Canceladas → `aba=todas` |
| `src/services/conveyors/conveyorsApiService.ts` | `view` na query; `postConveyorArchive`/`postConveyorUnarchive` |
| `src/domain/conveyors/conveyor.types.ts`, `src/mocks/backlog.ts`, `src/lib/backlog/mapConveyorListToBacklog.ts` | Tipos e mapeamento de `panelSection` |
| `src/domain/conveyors/operationalEventTaxonomy.ts`, `formatConveyorOperationalEvent.ts` | Tradução dos tipos novos na linha do tempo |
| Testes frontend: `backlogUrlParams.test.ts`, `backlogRowActions.test.ts`, `operationalEventTaxonomy.test.ts`, `formatConveyorOperationalEvent.test.ts`; novos `dashboardNavigation.test.ts`, `BacklogPage.tabs.test.ts` | Critérios de frontend 1–3 e tradução de eventos |
| `docs/manual/gestor-esteira.html` | Seções 2.1 (abas) e 2.2 (arquivar/desarquivar) do Painel operacional |
| `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` | CIC-007 e CIC-008; AUD-002 cita os eventos novos |

O HTML do manual é escrito à mão e publicado pelo plugin de Vite sem geração; não há etapa de regeneração no repositório.

### Telas congeladas

Não alterados: Minha fila, Minha jornada, Apontamento de horas, Kiosk, Planejamento semanal, Agenda da semana, `DashboardPage` e gráficos do dashboard, Evolução das esteiras, `EsteiraDetalhePage`. Do dashboard mudou só `dashboardNavigation.ts` (destino dos links, permitido). `formatConveyorOperationalEvent`/`operationalEventTaxonomy` são usados pela linha do tempo exibida no detalhe da esteira; a alteração apenas adiciona os dois tipos novos, exigida pelo item 8 do prompt. Regra de status, transições e escopo por colaborador não foram alterados.

## Critérios de aceite

| # | Critério | Atendido | Onde |
| --- | --- | --- | --- |
| B1 | Finalizada no mês corrente → Operacional | Sim | teste `1)` |
| B2 | Finalizada no mês anterior → Histórico | Sim | teste `2)` |
| B3 | Criada mês anterior, finalizada no corrente → Operacional (agosto/19-10) | Sim | testes `3)` e `3b)` (31/10 Operacional, 01/11 Histórico, relógio de referência) |
| B4 | Cancelada mês anterior/corrente via `canceled_at` | Sim | teste `4)` |
| B5 | 31/10 23h30 (SP) conta como outubro | Sim | teste `5)` (referência 01/11 02:45 UTC = 31/10 SP) |
| B6 | Arquivar encerrada do mês → Histórico | Sim | teste `6)` (evento, `source`, `created_by`) |
| B7 | Desarquivar no mês → Operacional; evento de mês anterior → regra automática | Sim | teste `7)` |
| B8 | 422 aberta, 409 incoerente, 403 sem permissão | Sim | teste `8)` (+404; nenhum evento gravado nas recusas) |
| B9 | `todas` = união sem duplicar; vários eventos não duplicam | Sim | teste `9)` |
| B10 | Escopo de colaborador em `operacional`, `historico`, `todas` | Sim | teste `10)` |
| B11 | `CANCELADA` grava `canceled_at`; migration idempotente | Sim | testes `11a)` (PATCH `/status`) e `11b)` (0054 executada 2x + backfill); também `migrate:file` 2x e runner completo em base nova |
| F1 | Aba na URL sem quebrar `scope`, `situacao`, `days` | Sim | `backlogUrlParams.test.ts`, `BacklogPage.tabs.test.ts` |
| F2 | `situacao=finalizadas&days=N` abre combinada com aviso | Sim | `backlogUrlParams.test.ts`, `dashboardNavigation.test.ts`, `BacklogPage.tabs.test.ts` |
| F3 | Arquivar/Desarquivar só com permissão e ação válida | Sim | `backlogRowActions.test.ts` (`resolveBacklogArchiveAction`) |

## Validação (saída real)

Ambiente: PostgreSQL 16 descartável local (porta 55432), `server/.env` local (ignorado pelo Git, não commitado).

| Comando | Resultado |
| --- | --- |
| `npm run lint` | exit **1** — 117 problemas (94 erros, 23 avisos). **Idêntico ao baseline da `develop`** (mesmo conjunto, comparado ignorando linha:coluna). Nenhum problema novo nos arquivos tocados. |
| `npm run build` (`tsc -b && vite build`) | exit **0** |
| `npx vitest run` (frontend) | exit **0** — 221 arquivos, 1457 testes (baseline: 219 / 1438) |
| `npm run server:build` (`tsc -p tsconfig.json`) | exit **0** |
| `npx vitest run` (server, suíte completa) | exit **1** — 1313 aprovados, **2 falhas preexistentes**, 17 ignorados (baseline: 1298 aprovados, as mesmas 2 falhas) |
| Testes direcionados server: `conveyors-panel-history`, `conveyors-list-collaborator-scope`, `conveyors.test`, `conveyors.delete`, `conveyor-lifecycle-return`, `conveyor-lifecycle`, `conveyor-progress`, `dashboard.integration` | exit **0** — 8 arquivos, 84 testes |
| `npm run migrate:file -- migrations/0054_conveyors_canceled_at.sql` (2x) | exit 0 / exit 0 |
| `npm run migrate` em base nova | exit 0 (0001–0054) |

### Falhas preexistentes (iguais na `develop` `ba60094`)

- `src/tests/env.test.ts` — `resolveAppVersionMetadata > usa fallback seguro` (já registrada: espera versão antiga).
- `src/tests/operational-planning.weekly-view.http.test.ts` — exportação XLSX da visão semanal (já registrada: `=SUM`).
- Lint: 94 erros / 23 avisos já existentes na `develop`.

## Pendências, riscos e ressalvas

- **Legado sem `completed_at`:** finalizadas sem data vão ao Histórico. Medir a contagem na base real antes de publicar (consulta acima).
- **Backfill aproximado:** `canceled_at` de canceladas antigas = `updated_at`. Se a esteira foi editada depois de cancelada, a data fica mais recente que o cancelamento real e ela pode aparecer no Operacional no mês da edição; o Gestor pode arquivá-la.
- **Runner de migrations:** `npm run migrate` sobre base já migrada falha na `0002` (`relation "app_roles" already exists`) — **preexistente**, não idempotente desde a `0002`. A `0054` em si é idempotente; em base existente use `npm run migrate:file -- migrations/0054_conveyors_canceled_at.sql`. O prompt dizia que o runner reexecuta todas; o código real mostra que isso só funciona em base nova.
- **Cards (KPI):** continuam somando "todas as esteiras carregadas", agora = esteiras da aba ativa. O card Finalizadas no Operacional mostra só as do mês corrente (e as desarquivadas). Comportamento coerente com "valem dentro da aba", mas muda o número que o gestor vê hoje.
- **Link "Finalizadas — últimos N dias":** a janela de N dias continua calculada no cliente sobre `completed_at`; com a lista combinada, o total volta a bater com o dashboard.
- **SESSION_CHECKPOINT.md:** não atualizado (fora do escopo autorizado; não houve troca de sessão).
- **Ambiente:** a primeira instância local do PostgreSQL caiu às 17:36 (permissão do diretório temporário); a suíte de baseline do servidor terminou às 17:29, antes da queda, sem erro de conexão. A instância foi recriada em `/var/lib/postgresql/sgp-esteiras-55432` (descartável).

## Próximo passo recomendado

Revisão do Gustavo (diff dos três commits), medição dos legados na base real, homologação visual da tela (abas, lista combinada pelos links do dashboard, Arquivar/Desarquivar como Gestor e ausência da ação como Colaborador) e, se aprovado, push da branch e PR para `develop`.

## Git

- Commits locais na `feat/esteiras-historico-painel`: backend (`9503e7b5`), frontend (`3f9829ba`), documentação + este retorno (último commit).
- Push/PR/merge: **não feitos** (sem autorização). Este retorno está apenas no commit local, ainda não publicado.
- `git status` final: working tree limpo (o `server/.env` local é ignorado pelo Git).

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.

## Validação independente (sgp-test-reviewer, 19/10/2026)

- **Veredito:** APROVADO COM RESSALVAS. Os 14 critérios do prompt têm teste e passam; nenhuma regressão (comparação teste a teste com a `develop`).
- **Reexecutado:** build frontend e servidor (exit 0), testes frontend (1457 aprovados), testes do servidor de esteiras/dashboard (457 aprovados), suíte completa do servidor com as mesmas falhas preexistentes da `develop` (`env.test`, exportação XLSX `=SUM`, `production-auth` por collation do ambiente).
- **Lint:** sem problema novo nos fontes. O total maior (146) vem de `server/dist/` gerado pelo build, que o `eslint.config` não ignora (preexistente).
- **Lacunas de teste:** ação Arquivar/Desarquivar só coberta no helper (sem teste de renderização); transição FINALIZADA → CANCELADA sem teste dedicado; virada de mês testada no repositório, não pela rota HTTP.
- **Comportamento a observar na homologação:** esteira arquivada que passa de FINALIZADA para CANCELADA continua no Histórico; ao limpar o filtro Situação a partir do link do dashboard, a tela volta para a aba Operacional.
- **Publicação:** autorizada pelo Gustavo direto na `develop` por fast-forward.
