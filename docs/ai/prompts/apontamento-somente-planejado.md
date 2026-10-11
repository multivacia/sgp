# SGP+ — Apontamento somente em atividades planejadas (web, Kiosk e Minha fila)

- **TASK_ID:** `apontamento-somente-planejado`
- **Origem:** homologação de 08/10/2026. Sem filtro, o Apontar horas da web listou 10 atividades e o Kiosk 7 para o mesmo colaborador. Análise: `docs/ai/returns/analisar-divergencia-apontamento-web-kiosk-retorno.md`.
- **Regras aprovadas por:** Gustavo, 08/10/2026. Este prompt traduz um resumo já discutido e aprovado. **Não reinterprete as regras.** Se o código real impedir alguma delas ou revelar um caso não previsto, pare e devolva para decisão humana.
- **Classificação AGENTS.md:** altera regra de negócio, apontamento, produção/Kiosk e Minha fila. Seguir o fluxo completo: contexto → impacto → spec → implementação → revisão.
- **Base analisada:** `develop` em `a4a3d5d`.
- **Modelo recomendado:** Claude Opus ou equivalente, esforço alto.

## Objetivo

1. Só atividades **planejadas** recebem apontamento, na web e no Kiosk, com a regra implementada uma única vez no backend.
2. A justificativa por ultrapassar o tempo previsto passa a valer na web e no Kiosk, comparando previsto e realizado **do próprio colaborador**.
3. A Minha fila passa a excluir itens movidos e a mostrar um cartão por atividade, com planejado e apontado somados.
4. O manual é atualizado nos trechos afetados.

**Nenhuma opção, filtro ou funcionalidade do frontend pode ser removida.** As mudanças de regra acontecem no backend; o frontend só se ajusta para exibir o que o backend devolve.

---

## Definições

**Item planejado válido:** linha de `operational_work_plan_items` com `deleted_at IS NULL` e `status = 'PLANNED'`, pertencente ao **plano publicado vigente da sua semana**: o plano `PUBLISHED`, não excluído, mais recente daquela `week_start_date` (`published_at DESC NULLS LAST, updated_at DESC`), mesmo critério de `findPublishedWorkPlanForWeek` e `findPublishedWorkPlansInRange`. Itens de versões publicadas substituídas, `MOVED` e `CANCELLED` não contam.

**Atividade planejada:** STEP que tem ao menos um item planejado válido, em **qualquer semana** (passada, atual ou futura).

**Atividade encerrada:** STEP com `operational_status` `COMPLETED` ou `ABORTED`.

**Hoje:** `operationalToday()` (America/Sao_Paulo). Não usar `todayIsoLocal()` do servidor nos pontos alterados.

---

## Parte 1 — Listas de apontamento (web e Kiosk)

### 1.1 Lista padrão (sem pesquisa)

Vale para `GET /api/v1/me/time-entry-candidates` (Apontar horas da web) e `GET /api/v1/production/me/work-queue` (fila do Kiosk).

- Somente atividades planejadas **para o colaborador logado** (`assigned_collaborator_id`), sem recorte de semana: atrasadas de qualquer semana, de hoje e futuras.
- Excluir atividades encerradas.
- Manter os filtros atuais de STEP, área e opção ativas e de esteira não excluída. Para o status da esteira, manter o filtro já usado na web (`A_INICIAR`, `EM_ANDAMENTO`); se divergir de `resolveProductionCanTrackTime`, registrar e parar.
- **Uma linha por atividade.** Com vários itens planejados, a data exibida é a **menor `planned_date`**.
- Ordem: atrasadas, hoje, futuras; dentro de cada grupo, por data e depois `planned_order`.
- A alocação na esteira (`conveyor_node_assignees`, direta ou via time) **deixa de ser fonte** da lista padrão.
- Sem limite silencioso de quantidade (piloto). Se um limite técnico for indispensável, usar no mínimo 500 e registrar.

### 1.2 Pesquisa de outras atividades

Vale para a opção de pesquisar outras atividades do Apontar horas da web (`includeUnassigned`) e para o **Outra atividade** do Kiosk (`GET /api/v1/production/me/time-entry-candidates`).

- **Manter as opções nas telas.** Continua exigindo pesquisa com no mínimo 2 caracteres.
- Além das do colaborador, retorna atividades **planejadas para os demais colaboradores**.
- Atividade **não planejada para ninguém** não aparece, mesmo que o colaborador ou outra pessoa esteja alocado na esteira.
- Excluir atividades encerradas.
- Preservar a busca combinada OS & Atividade (`q`, `conveyorQ`, `activityQ`).
- Manter a indicação de que a atividade é de outro colaborador, como hoje.

### 1.3 Cartão do Kiosk

- **Previsto:** soma dos minutos de todos os itens planejados válidos do colaborador para a atividade.
- **Realizado:** soma dos apontamentos **do próprio colaborador** na atividade. Hoje usa `sumRealizedMinutesByStepForConveyor`, que soma todos os colaboradores.
- **Pendente:** `max(0, previsto − realizado)`.
- Mostrar a data exibida e se a atividade está atrasada, é de hoje ou é futura, sem redesenhar o layout.
- Revisar `findInitialKioskCarouselIndex` e `partitionKioskWorkQueue`: uma atividade futura nunca pode ser a recomendada enquanto houver atrasada ou de hoje.

### 1.4 Apontar horas da web

- Manter a tela e suas opções. O realizado exibido já é o do próprio colaborador; conferir que segue assim.
- Estado vazio da lista padrão deve deixar claro quando não há atividade planejada em aberto ou não há plano publicado.

---

## Parte 2 — Gravação de apontamento (backend garante a regra)

Toda gravação abaixo deve validar a regra no backend, inclusive em chamada direta à API.

| Caminho | Situação da atividade | Resultado |
|---|---|---|
| Web: `POST /conveyors/:conveyorId/steps/:stepNodeId/time-entries` → `serviceCreateConveyorTimeEntryForAppUser` (Apontar horas, ApontamentoPage, Minha fila) | Planejada para o colaborador | Aceita sem justificativa de exceção. Reutiliza o assignee existente ou cria apoio (`is_primary = false`), como `resolveProductionStepAssigneeId` faz hoje |
| | Planejada só para outro colaborador | Aceita **com justificativa de exceção obrigatória**, gravada como hoje (`UNASSIGNED_EXCEPTION`) |
| | Não planejada para ninguém | **Recusa (422)**, mesmo com alocação na esteira e mesmo com justificativa |
| | Encerrada | Recusa, como hoje |
| Kiosk, fila: `POST /production/time-entries` | Mesma tabela | Mesmos resultados |
| Kiosk, Outra atividade: `POST /production/time-entries/unassigned-exception` | Mesma tabela | Mesmos resultados |
| Gestor em nome de outro: `POST /conveyors/:conveyorId/steps/:stepNodeId/time-entries/on-behalf` → `serviceCreateConveyorTimeEntryOnBehalf` | Não planejada para ninguém | **Recusa (422)** |
| | Planejada | **Manter o comportamento atual** do on-behalf (hoje exige alocação estrutural do colaborador indicado). A única mudança aprovada neste caminho é a recusa acima. Registrar no retorno como o caminho se comporta |

Ajustes necessários:

- `findPublishedPlanItemIdForCollaboratorOnStep` e `resolveProductionStepAssigneeId` olham só a semana vigente (`mondayOfWeekContaining(todayIsoLocal())`). Passar a considerar **qualquer semana**, só a versão vigente de cada uma.
- Hoje a alocação estrutural sozinha libera apontamento sem justificativa. Passa a valer só a atividade planejada para o colaborador.
- Mensagem da recusa sugerida: "Esta atividade não está planejada. Fale com o gestor para incluí-la no planejamento." Avaliar código de erro próprio (por exemplo `TIME_ENTRY_NOT_PLANNED`); se criar, atualizar `errorCodes.ts` e o mapeamento de mensagens no front (web e `productionApiService.ts`).
- Preservar as validações existentes: sequência e fora de sequência, STEP encerrada, data de trabalho, `markAsDone`, edição e exclusão pelo gestor (`PATCH`/`DELETE`) e Extra Esteira.

---

## Parte 3 — Justificativa por ultrapassar o tempo previsto

| Caso | Exige justificativa por excesso? |
|---|---|
| Atividade planejada **para o próprio colaborador**, na web ou no Kiosk (fila ou Outra atividade) | **Sim**, quando realizado + novo apontamento > previsto |
| Atividade planejada **só para outro colaborador** | **Não.** A justificativa de exceção basta |
| Já informou justificativa de fora de sequência | Não pede outra (como hoje) |

- **Previsto:** soma dos minutos de todos os itens planejados válidos **do colaborador que aponta** para a atividade. Hoje `resolveProductionExcessCheckPlannedMinutes` usa um único item, o de data mais recente.
- **Realizado:** soma dos apontamentos **do colaborador que aponta** na atividade.
- Sem previsto (nulo ou zero), não exige, como hoje (`productionRequiresExcessTimeJustification`).
- Hoje a regra existe só na fila do Kiosk. Implementar uma vez no backend e aplicar nos caminhos da tabela. O frontend da web deve apresentar a justificativa quando o backend exigir, reutilizando o padrão de justificativa padronizada já existente (`JustificationSelect`).
- Usar o código `TIME_ENTRY_EXCEEDED_PLANNED_REQUIRES_JUSTIFICATION` já existente.

---

## Parte 4 — Minha fila (`GET /api/v1/me/work-queue`)

Mantém-se como hoje:

- fonte: plano publicado;
- modos **Por dia** e **Por período**, com os mesmos filtros;
- **Atrasadas:** só da semana do dia escolhido;
- **Futuras:** só quando o dia ou o período escolhido as abrange;
- seção **Concluídas** com atividades concluídas e abortadas, sem apontar.

Muda:

1. **Itens movidos saem.** Hoje o filtro padrão (`planItemStatusFilterSql`) só exclui `CANCELLED`. Passa a considerar só `PLANNED`.
2. **Um cartão por atividade.** Uma atividade entra no recorte se tiver ao menos um item dentro dele. O cartão mostra a **menor `planned_date` entre todos os itens planejados válidos do colaborador para a atividade, mesmo fora do recorte**, e é agrupado (Atrasadas, Hoje, Concluídas) por essa data.
3. **Cartão soma todos os dias:** planejado = soma de todos os itens planejados válidos do colaborador para a atividade; **apontado** = soma dos apontamentos do colaborador na atividade. O apontado é **informação nova no cartão**.
4. **Capacidade e totais do recorte não mudam de base:** minutos planejados do dia ou período e o aviso de capacidade continuam contando **só os itens dentro do intervalo**, nunca a soma dos cartões.

Exemplo obrigatório (caso de teste): atividade planejada para o colaborador com 60 min na sexta da semana passada e 60 min na segunda desta semana, ainda pendente. Na Minha fila desta semana:

- aparece **uma vez**, com a data da **sexta**, no grupo **Atrasadas**;
- cartão com **planejado 120 min**;
- planejado da semana e aviso de capacidade com **60 min** dessa atividade.

A mudança na fila do Kiosk (Parte 1) não pode alterar a Minha fila além do descrito nesta parte. Se `serviceGetWorkQueueForCollaborator` continuar compartilhado, separar por opção explícita e cobrir os dois consumidores com teste.

---

## Parte 5 — Manual

Seguir a cadeia de `docs/manual/source/README.md` (código → manual funcional → manual do usuário → HTML):

- `MANUAL_FUNCIONAL_SGP.md`: atualizar as regras de apontamento, exceção, excesso de tempo e Minha fila afetadas, com evidência no código.
- `MANUAL_USUARIO_SGP.md`: atualizar o **capítulo 7 (Apontamentos)**, o **capítulo 10 (Minha Fila)** e o **capítulo 13 (Modo Fábrica)**. Remover a afirmação de que a fila do Kiosk equivale à Minha fila e explicar a diferença aprovada.
- Regenerar `docs/manual/manual-usuario.html` com `scripts/generate-manual-usuario-html.mjs`.
- **Fora desta demanda:** guias práticos (`colaborador.html`, `gestor-esteira.html`), demais capítulos e o botão da atividade dispensada na Minha fila. Ficam para a próxima sprint.

---

## Fora do escopo

- Minha jornada.
- Extra Esteira.
- Edição e exclusão de apontamento pelo gestor.
- Busca do Kiosk por OS & Atividade (branch pendente). Se ela já existir quando esta atividade começar, registrar o SHA e evitar conflito nos mesmos arquivos.
- Histórico: apontamentos já gravados como `UNASSIGNED_EXCEPTION` continuam aparecendo como hoje. **Sem migration e sem alteração de dados.**

## Riscos a registrar no impacto

- Quem apontava só por estar alocado na esteira, ou no time da atividade, perde o acesso até a atividade ser planejada. Comunicar os gestores antes da liberação.
- Sem plano publicado, a lista padrão fica vazia.
- O gestor deixa de lançar em nome de outro em atividade não planejada.
- Consulta sem limite de semanas: medir tempo de resposta com a base da develop e registrar.
- Atividade distribuída em mais de um dia é pendência de validação com a Tati (Bravo); a regra acima vale até lá.

---

## Etapas

1. Ler `AGENTS.md`, `CLAUDE.md`, `docs/ai/context/PROJECT_CONTEXT.md` e `docs/ai/context/SESSION_CHECKPOINT.md`. Rodar `git fetch origin --prune` e registrar os SHAs de `origin/main`, `origin/develop` e `origin/homol`.
2. Criar um worktree e a branch `fix/apontamento-somente-planejado` a partir do tip confirmado de `origin/develop`.
3. Diagnóstico: confirmar no código cada caminho citado. Se o impacto não for `SEGUIR`, ou se algum caso não estiver coberto por este prompt, parar e pedir decisão.
4. Implementar a regra de "atividade planejada" e o cálculo de previsto e realizado do colaborador num único ponto do backend, reutilizado por listas, gravação, excesso e Minha fila.
5. Ajustar o frontend sem remover opções.
6. Atualizar o manual.
7. Testes e validação.
8. Retorno em `docs/ai/returns/apontamento-somente-planejado-retorno.md`.

Não fazer merge, rebase, force-push, deploy nem publicar a branch sem autorização explícita.

---

## Testes obrigatórios

Atualizar os testes existentes afetados e cobrir os casos abaixo. Referências: `my-activities-time-entry-candidates.test.ts`, `time-entry-candidates-http.integration.test.ts`, `production-work-queue.integration.test.ts`, `production-work-queue.vigente.test.ts`, `production-plan-assignee.test.ts`, `production-time-entries.integration.test.ts`, `production-unassigned-time-entries.integration.test.ts`, `my-work-queue.service.test.ts`, `my-work-queue-period.integration.test.ts`, `work-queue-period.test.ts`, `quickTimeEntryDrawerLogic.test.ts`, `kioskWorkQueueUi.test.ts`, `KioskActivityCards.test.tsx`.

**Listas de apontamento**

1. Atividade atrasada de semana anterior, de hoje, da próxima semana e do próximo mês aparece na lista padrão da web e do Kiosk.
2. Atividade só com alocação na esteira (direta ou via time), sem item planejado, não aparece na lista padrão nem na pesquisa.
3. Atividade encerrada (`COMPLETED` e `ABORTED`) não aparece em nenhuma lista de apontamento.
4. Item `MOVED`, `CANCELLED` ou de versão publicada substituída não conta.
5. Atividade com itens em vários dias aparece uma vez, com a menor data.
6. Ordem: atrasadas, hoje, futuras.
7. Pesquisa com menos de 2 caracteres não traz outras atividades; com 2 ou mais traz as planejadas para outros colaboradores e não traz as não planejadas.
8. Busca OS & Atividade continua funcionando nas duas listas.
9. Para o mesmo colaborador e data, a lista padrão da web e a fila do Kiosk trazem **o mesmo conjunto de atividades** (caso 10 × 7).
10. Cartão do Kiosk: previsto soma todos os dias do colaborador; realizado e pendente consideram só os apontamentos dele.
11. Recomendação do Kiosk nunca aponta para futura enquanto houver atrasada ou de hoje.

**Gravação**

12. Atividade planejada para o colaborador (inclusive futura e de semana anterior): aceita sem justificativa de exceção; cria apoio quando não houver assignee.
13. Atividade planejada só para outro: sem justificativa, recusa; com justificativa, aceita como `UNASSIGNED_EXCEPTION`.
14. Atividade não planejada para ninguém: recusa na web, no Kiosk (fila e Outra atividade) e no on-behalf, mesmo com alocação estrutural e mesmo com justificativa.
15. On-behalf em atividade planejada mantém o comportamento atual.

**Excesso de tempo**

16. Atividade do próprio colaborador, web e Kiosk: exige justificativa ao passar do previsto dele; não exige dentro do previsto.
17. Previsto e realizado consideram só o colaborador. Ex.: João e Maria com 60 min planejados cada; Maria já apontou 60; João aponta 30 → **não** exige.
18. Previsto soma todos os dias planejados do colaborador.
19. Atividade de outro colaborador: exige só a justificativa de exceção, nunca a de excesso.
20. Com justificativa de fora de sequência, não pede a de excesso.

**Minha fila**

21. Item `MOVED` não aparece.
22. Atividade com itens em vários dias aparece uma vez; o exemplo sexta + segunda (60 + 60) resulta em cartão na sexta, grupo Atrasadas, planejado 120 min, e totais da semana com 60 min dessa atividade.
23. Cartão mostra o apontado do colaborador somando todos os dias.
24. Atrasadas de semanas anteriores sem item no recorte não aparecem; futuras fora do recorte não aparecem.
25. Concluídas e abortadas continuam na seção Concluídas.
26. Modos Por dia e Por período: demais comportamentos inalterados.

**Regressão**

27. Extra Esteira, Minha jornada, edição e exclusão pelo gestor inalterados.
28. Histórico com `UNASSIGNED_EXCEPTION` continua exibido nas jornadas e exportações.

Validação: build front e back, lint/typecheck, testes focados e regressão. Registrar a saída real.

## Critérios de aceite

- A web e o Kiosk mostram o mesmo conjunto de atividades na lista padrão; o caso 10 × 7 fica igual nas duas telas.
- Nenhuma atividade encerrada aparece nas listas de apontamento.
- O backend recusa apontamento em atividade não planejada para ninguém, por qualquer caminho, inclusive o gestor.
- Justificativa por excesso funciona na web e no Kiosk com previsto e realizado do colaborador.
- Minha fila sem movidos, com um cartão por atividade, planejado e apontado somados, e totais do recorte corretos.
- Nenhuma opção ou filtro de tela removido.
- Manual atualizado nos capítulos 7, 10 e 13 e HTML regenerado.
