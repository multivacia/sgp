# Retorno — apontamento-somente-planejado

- **TASK_ID:** `apontamento-somente-planejado`
- **Data/hora:** 2026-10-08, ~21:20 a ~22:30 (America/Sao_Paulo)
- **Objetivo:** implementar o prompt aprovado `docs/ai/prompts/apontamento-somente-planejado.md` — só atividade planejada recebe apontamento (web, Kiosk e gestor), excesso de tempo com previsto/realizado do próprio colaborador, Minha fila sem movidos e com um cartão por atividade, manual atualizado.
- **Status final:** implementado e publicado na branch; **aguardando revisão humana e PR para `develop`**. Sem merge, sem deploy.
- **Branch:** `fix/apontamento-somente-planejado`
- **SHA inicial:** `a4a3d5d` (`origin/develop`). Referências no início: `origin/main` `c611d10`, `origin/homol` `6b768c8`.
- **SHA final:** ver `git log -1` da branch (commit deste retorno).
- **Executado por:** Claude (sessão claude.ai com ferramentas de código), no papel de implementador, com autorização explícita do Gustavo para implementar e publicar.

## Resumo do que foi feito

### Backend — regra canônica
- `operational-planning/planned-activity.repository.ts`: CTE do plano publicado **vigente por semana** (`DISTINCT ON week_start_date`) e itens `PLANNED` válidos de qualquer semana; consultas de planejamento por atividade, resumo por colaborador (menor data e soma de minutos) e realizado do próprio colaborador.
- `operational-planning/planned-activity.service.ts`: `resolveTimeEntryPlanningGate` (MINE / OTHER / recusa `TIME_ENTRY_NOT_PLANNED`), `assertStepPlannedForAnyone` (gestor), regra pura e consulta de excesso.
- Novo código de erro `TIME_ENTRY_NOT_PLANNED`.

### Backend — listas
- Apontar horas (web) e Outra atividade (Kiosk): `listPlannedTimeEntryCandidates` substitui as três consultas antigas (alocação estrutural, plano da semana vigente, atividades sem alocação). Lista padrão = planejadas para o colaborador; pesquisa (≥ 2 caracteres, `includeUnassigned`) = planejadas só para outros. Uma linha por atividade, menor data, minutos somados, realizado do colaborador, ordem por data.
- Fila do Kiosk: modo `allOpenPlanned` no serviço da fila — qualquer semana, atividade em aberto, esteira `A_INICIAR`/`EM_ANDAMENTO`, ordem atrasadas → hoje → futuras, futura não recomendada enquanto houver atrasada/hoje. Cartão com previsto somado e realizado/pendente do próprio colaborador.

### Backend — gravação
- Web (`serviceCreateConveyorTimeEntryForAppUser`): MINE → `ASSIGNED` (reutiliza ou cria apoio); OTHER → `UNASSIGNED_EXCEPTION` com justificativa; nenhum → 422. Excesso para MINE via justificativa voluntária (`justificationId` do corpo), dispensada se houver fora de sequência.
- Kiosk fila (`production-time-entries.service.ts`): recusa não planejada; excesso com previsto/realizado do colaborador (antes: um item e realizado de todos).
- Kiosk Outra atividade: mesma regra; novo campo opcional `justificationId`/`justificationComplement` para excesso.
- Gestor em nome de outro: só a recusa para atividade não planejada; demais regras mantidas (inclusive exigir alocação estrutural do colaborador alvo).
- `resolveProductionStepAssigneeId`: exige item planejado para o colaborador em qualquer semana antes de reutilizar/criar alocação.

### Backend — Minha fila
- Somente `PLANNED` (movidos saem).
- Um cartão por atividade (`work-queue-consolidation.ts`): data = menor data entre todos os itens do colaborador, mesmo fora do recorte; minutos somados; novo `realizedMinutes`. Totais e capacidade continuam pelos itens do recorte.
- Atividade planejada para o colaborador não exige justificativa de exceção.

### Frontend
- Apontar horas: justificativa obrigatória quando passa do previsto do próprio colaborador; categoria preferida "excesso". Texto da opção **Buscar outras atividades** e do aviso de exceção alinhados à regra aprovada. **Nenhuma opção ou filtro removido.**
- Outra atividade (Kiosk): justificativa por excesso e envio de `justificationId`.
- Cartão do Kiosk: data planejada + Atrasada/Hoje/Futura.
- Minha fila: cartão mostra **Apontado**.
- `productionApiService.ts`: mensagens próprias para `TIME_ENTRY_NOT_PLANNED` e excesso.

### Manual
- Usuário: capítulos 7, 10 e 13. Funcional: APO-008, APO-008A, APO-GES-004 (nota), FIL-003A, KSK-004A, KSK-005, KSK-007. HTML regenerado (`npm run manual:usuario:html`, `--check` ok).

## Arquivos

Criados: `server/src/modules/operational-planning/planned-activity.repository.ts`, `planned-activity.service.ts`, `server/src/modules/my-work-queue/work-queue-consolidation.ts`, `server/src/tests/apontamento-somente-planejado.integration.test.ts`, `server/src/tests/apontamento-somente-planejado.rules.test.ts`, `server/src/tests/plannedActivityTestHelpers.ts`, este retorno.

Alterados (principais): `conveyorAssignments.service.ts`, `conveyorAssignments.repository.ts` (remoção da consulta só da semana vigente), `my-activities.repository.ts`, `my-activities.service.ts`, `my-work-queue.{repository,service,dto}.ts`, `production-plan-assignee.ts`, `production-time-entries.{service,schemas}.ts`, `production-unassigned-time-entries.service.ts`, `production-work-queue.service.ts`, `errorCodes.ts`; frontend `QuickTimeEntryDrawer.tsx`, `quickTimeEntryDrawerLogic.ts`, `KioskActivityCard.tsx`, `kioskActivityCardLogic.ts`, `KioskOutraAtividadeFlow.tsx`, `kioskOutraAtividadeFlowLogic.ts`, `MyWorkQueuePage.tsx`, tipos e `productionApiService.ts`; testes existentes ajustados para planejar a atividade antes de apontar; manuais; `SESSION_CHECKPOINT.md`.

Lista completa: `git diff --stat a4a3d5d..HEAD`.

## Migrations
Nenhuma. Sem alteração de dados.

## Decisões técnicas relevantes
- Gate único no backend reutilizado por todas as gravações; listas da web e do Kiosk usam a mesma regra (teste de aceite compara os dois conjuntos).
- `planned_quantity = 1` nos candidatos vindos do plano: os minutos do plano já são o total planejado (evita multiplicar de novo pela quantidade da estrutura).
- Fila do Kiosk via endpoint de fila (`POST /production/time-entries`): atividade planejada só para outro é recusada com o código de exceção já existente; o caminho do Kiosk para esse caso é **Outra atividade**, com justificativa.
- Chave do cartão = esteira + atividade.

## Achado para a pendência com a Tati
O índice `uq_operational_work_plan_items_plan_activity_active` permite **um item ativo por atividade em cada plano semanal**. Dentro de uma semana a atividade tem um colaborador e um dia; "vários dias" ou "dois colaboradores" só acontecem entre semanas diferentes.

## Validação (execução real)
Banco PostgreSQL 16 local, migrations e seed aplicados.

| Comando | Resultado |
|---|---|
| `npm --prefix server run build` | ok (exit 0) |
| `npm run build` (frontend) | ok (exit 0) |
| `npx vitest run` (server) | 1272 passaram, **9 falharam**, 17 ignorados |
| `npx vitest run` (frontend) | 1435 passaram, **5 falharam** |
| `npx eslint` nos arquivos alterados | 1 erro e 1 aviso, ambos pré-existentes na develop |
| `npm run manual:usuario:html:check` | ok |
| Testes novos de aceite (`apontamento-somente-planejado.*`) | 6 integração + 8 unitários, todos passaram |

**Falhas pré-existentes** (reproduzidas em `origin/develop` sem as alterações):
- Server: `env.test.ts`; `my-activities-time-entry-candidates.test.ts` e `my-work-queue.service.test.ts` (texto da mensagem de colaborador não vinculado); `operational-planning.weekly-view.http.test.ts`; `support-http.integration.test.ts` (4); `production-auth.integration.test.ts` (ordenação por nome: collation "C" do banco local × `localeCompare('pt-BR')`, reproduzida na develop com o mesmo banco).
- Frontend: `ApontamentoPage.test.tsx` (3) e `ApontamentoGestorPage.test.tsx` (2).
- Lint: `unassignedStepId` não usado em `production-time-entries.integration.test.ts`; aviso de dependência de hook em `KioskActivityCard.tsx`.

## Pendências, riscos e ressalvas
- **Comunicar gestores antes de liberar:** quem apontava só por estar alocado na esteira (ou no time) perde o acesso até a atividade ser planejada; sem plano publicado, a lista padrão fica vazia; o gestor não lança mais em atividade não planejada.
- **Página Apontamento (colaborador/ApontamentoPage):** continua listando atividades pela alocação estrutural (fora do escopo; opção não removida). Em atividade não planejada o backend recusa com mensagem clara.
- **Gestor em nome de outro:** mantém a exigência de alocação estrutural do colaborador alvo, mesmo com a atividade planejada para ele. Mantido por não ter sido decidido.
- **Desempenho:** consultas sem limite de semanas; não medido com volume de produção.
- **Pendência com a Tati:** distribuição em mais de um dia (ver achado acima).
- **Próxima sprint (registrado):** botão de apontar na atividade dispensada da Minha fila; revisão completa do manual e dos guias.
- PR não aberto automaticamente: a CLI do GitHub nesta sessão não está autenticada. Branch publicada para abrir o PR.

## Próximo passo recomendado
Abrir o PR `fix/apontamento-somente-planejado` → `develop`, revisar e rodar a homologação (item 13 da página de homologação + casos do teste de aceite).

## git status
Limpo após o commit deste retorno.

## Commit / push / PR
Commits na branch `fix/apontamento-somente-planejado`, publicada em `origin`. PR: abrir em https://github.com/multivacia/sgp/pull/new/fix/apontamento-somente-planejado

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
