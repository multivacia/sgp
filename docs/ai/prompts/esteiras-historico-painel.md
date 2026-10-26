# Claude Code — Painel operacional: aba Histórico para esteiras encerradas

- **TASK_ID:** `esteiras-historico-painel`
- **Solução aprovada por:** Gustavo, em 19/10/2026.
- **Base analisada:** `develop` em `22a45be`.

## Modelo e esforço recomendados

- Modelo: o mais capaz disponível no Claude Code (preferencialmente Opus).
- Esforço: alto.

## Objetivo

Hoje o Painel operacional (`/app/backlog`) mostra todas as esteiras juntas, inclusive as finalizadas e canceladas de meses anteriores. Separe a tela em duas abas, **Operacional** e **Histórico**, com regra aplicada no backend, e crie a opção de arquivar e desarquivar manualmente.

## Regra de negócio (fechada)

### Em qual aba a esteira aparece

1. **Histórico**: esteira com status `FINALIZADA` ou `CANCELADA` cuja **data de encerramento** é anterior ao 1º dia do mês corrente, no fuso `America/Sao_Paulo`.
   - Data de encerramento de `FINALIZADA`: `conveyors.completed_at` (já existe).
   - Data de encerramento de `CANCELADA`: `conveyors.canceled_at` (coluna nova, ver Migration).
2. **Operacional**: todas as demais. Isso inclui todas as abertas e as encerradas no mês corrente.
3. Exemplo obrigatório: esteira criada em agosto e finalizada em 19/10 fica no Operacional até 31/10 e passa ao Histórico em 01/11.
4. Início do mês corrente em SQL: `date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'`.
5. Se uma esteira encerrada não tiver data de encerramento (dado legado nulo), trate-a como Histórico e registre esse caso no retorno com a contagem encontrada na base de teste.

### Arquivar e desarquivar manualmente

1. Só é permitido para esteiras `FINALIZADA` ou `CANCELADA`. Para os demais status, o backend recusa (422) com mensagem em português.
2. **Arquivar**: a esteira passa ao Histórico imediatamente, mesmo que tenha sido encerrada no mês corrente.
3. **Desarquivar**: a esteira volta ao Operacional **até a próxima virada de mês**, ou até ser arquivada de novo.
4. Permissão: reusar `conveyors.edit_status` (Gestor e Admin). Não criar permissão nova.
5. Persistência **sem coluna nova**: registrar eventos em `conveyor_operational_events` com os tipos novos `CONVEYOR_ARCHIVED` e `CONVEYOR_UNARCHIVED`, `source = 'USER_ACTION'`, `created_by` = usuário logado e `occurred_at = now()`.
6. Estado efetivo, avaliado nesta ordem:
   - último evento de arquivamento da esteira = `CONVEYOR_ARCHIVED` → **Histórico**;
   - último evento = `CONVEYOR_UNARCHIVED` com `occurred_at` no mês corrente (fuso São Paulo) → **Operacional**;
   - sem evento, ou `CONVEYOR_UNARCHIVED` de mês anterior → regra automática acima.
7. A ação disponível acompanha o estado efetivo: esteira encerrada no Operacional oferece **Arquivar**; esteira no Histórico oferece **Desarquivar**. Pedido incoerente com o estado efetivo retorna 409.
8. Inclua os dois tipos novos onde a tela de eventos/linha do tempo da esteira traduz os tipos, para não exibir o código cru.

### Tela

1. Duas abas no Painel operacional: **Operacional** (padrão) e **Histórico**. A aba escolhida fica na URL (por exemplo `aba=historico`), sem quebrar os parâmetros atuais.
2. **Não remover nem alterar** filtros, cards, colunas, paginação, textos ou comportamentos atuais. Eles passam a valer dentro do conjunto da aba ativa. Isso inclui as opções Finalizadas e Canceladas do filtro Situação e o card Finalizadas.
3. Ação Arquivar/Desarquivar na linha da tabela, visível só para quem tem `conveyors.edit_status` e só quando a ação é válida. Usar confirmação simples, no padrão de diálogos já existente na tela.
4. **Links do dashboard**: o link "Finalizadas — últimos N dias" (`situacao=finalizadas&days=N`, N de 7 a 90) abre a **lista combinada** (Operacional + Histórico), com aviso no topo "Exibindo Operacional + Histórico" e botão para voltar às abas. Os demais links do dashboard continuam abrindo a aba Operacional.
   - Ponto em confirmação com o Gustavo: links do dashboard para Finalizadas ou Canceladas **sem** `days`. Até confirmação, trate igual ao link com `days` (lista combinada) e registre no retorno.
5. Textos da tela em português, no padrão de `backlogCopy.ts`.

### Backend

1. Implementar o recorte em `GET /api/v1/conveyors` com um parâmetro novo de visão: `operacional` (padrão quando ausente), `historico` ou `todas`.
2. Preservar o escopo por colaborador já existente (`serviceResolveConveyorListScope`) e os filtros atuais (`q`, `priority`, `responsible`, `operationalStatus`). A visão se aplica sobre o conjunto já autorizado.
3. Devolver em cada item a seção efetiva (`OPERACIONAL` ou `HISTORICO`) e se ela vem de arquivamento manual, para a tela montar a ação correta.
4. Endpoints novos, com `requirePermission('conveyors.edit_status')`:
   - `POST /api/v1/conveyors/:id/archive`
   - `POST /api/v1/conveyors/:id/unarchive`
5. A seleção do último evento de arquivamento não pode duplicar linhas da lista. Use subconsulta correlacionada ou `LATERAL`, nunca `JOIN` direto em eventos.

## Migration

1. Liste `server/migrations/` antes de criar. Em `22a45be` a última era `0053`; use o próximo número livre real.
2. Conteúdo, **idempotente** (o runner reexecuta todas as migrations):
   - `ALTER TABLE conveyors ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ NULL;`
   - backfill aproximado: `UPDATE conveyors SET canceled_at = updated_at WHERE operational_status = 'CANCELADA' AND canceled_at IS NULL;`
   - `COMMENT ON COLUMN` explicando que valores anteriores à migration vieram do `updated_at`.
3. Gravar `canceled_at = now()` na transição para `CANCELADA` (hoje feita no `UPDATE conveyors SET operational_status…` de `conveyors.repository.ts`). Antes, faça busca em todo o backend por outros pontos que gravam `CANCELADA` e trate todos.
4. Não executar a migration em ambiente compartilhado. Validar só em PostgreSQL local descartável.

## Escopo congelado

- Não alterar Minha fila, Minha jornada, Apontamento de horas, Kiosk, Planejamento semanal, Agenda da semana, Dashboard (exceto o destino dos links descritos acima), Evolução das esteiras e detalhe da esteira.
- Não alterar a regra de status nem as transições permitidas.
- Não alterar a regra de escopo por colaborador.
- Sem refactor, renome ou formatação ampla. Sem deploy, merge ou push sem autorização explícita posterior.

## Testes obrigatórios

Backend, com a infraestrutura de integração existente:

1. Finalizada no mês corrente → Operacional.
2. Finalizada no mês anterior → Histórico.
3. Criada em mês anterior e finalizada no mês corrente → Operacional (exemplo agosto/19-10).
4. Cancelada no mês anterior e no mês corrente, usando `canceled_at`.
5. Virada de mês no fuso São Paulo: encerrada em 31/10 às 23h30 (São Paulo) continua no mês de outubro.
6. Arquivar encerrada do mês corrente → Histórico.
7. Desarquivar no mês corrente → Operacional; o mesmo evento em mês anterior → regra automática.
8. Arquivar esteira aberta → 422. Ação incoerente com o estado efetivo → 409. Sem permissão → 403.
9. Visão `todas` devolve a união sem duplicar; nenhuma visão duplica esteira com vários eventos.
10. Escopo de colaborador continua valendo em `operacional`, `historico` e `todas`.
11. Transição para `CANCELADA` grava `canceled_at`; a migration é idempotente (rodar duas vezes).

Frontend:

1. Leitura e escrita da aba na URL, sem quebrar `scope`, `situacao` e `days`.
2. Link `situacao=finalizadas&days=N` abre a lista combinada com o aviso.
3. Ação Arquivar/Desarquivar só aparece com permissão e com ação válida.

Execute build, lint/typecheck e os testes direcionados de frontend e backend. Falha preexistente deve ser separada do resultado desta alteração.

## Documentação

- Manual do usuário e manual funcional: seção do Painel operacional (abas, regra do Histórico, arquivar/desarquivar). Regenerar o HTML do manual, se o repositório fizer isso.

## Entrega esperada

1. Siga `CLAUDE.md` e `AGENTS.md`. Faça `git fetch origin develop`, registre o SHA inicial e crie a branch `feat/esteiras-historico-painel`.
2. Não faça merge nem push sem autorização explícita.
3. Gere `docs/ai/returns/esteiras-historico-painel-retorno.md` com: arquivos alterados e motivo, migration criada, regra final implementada, contagem de encerradas sem data de encerramento na base de teste, testes executados e resultado real, confirmação de que as telas congeladas não foram alteradas, pendências e riscos.
