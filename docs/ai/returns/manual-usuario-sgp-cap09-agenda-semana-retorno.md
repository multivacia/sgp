# Retorno — manual-usuario-sgp-cap09-agenda-semana

**TASK_ID:** `manual-usuario-sgp-cap09-agenda-semana`
**Data/hora:** 2026-10-03
**Branch:** `docs/manual-usuario-sgp-cap09-agenda-semana`
**SHA base:** `aa8c3ad87bc221e08d2677b004af99b88c45be06` — conferido contra `origin/docs/manual-usuario-sgp-cap08-planejamento-semanal`, igual ao esperado pelo prompt
**SHA final:** registrado no commit seguinte a este arquivo (padrão do repositório)
**Status final:** concluído

---

## 1. Objetivo

Enriquecer **somente o capítulo 9 — Agenda da semana** de `docs/manual/source/MANUAL_USUARIO_SGP.md`, com verificação direta no código como fonte da verdade.

Atividade exclusivamente documental.

---

## 2. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | capítulo 9 escrito; capítulo 21 com duas divergências novas e um alcance corrigido; linha **Situação** atualizada |
| `docs/ai/returns/manual-usuario-sgp-cap09-agenda-semana-retorno.md` | criado (este arquivo) |

**Criados:** 1 · **Alterados:** 1 · **Removidos:** 0 · **Migrations:** nenhuma

`MANUAL_FUNCIONAL_SGP.md` **não** foi alterado: nenhuma divergência factual contra a matriz técnica apareceu no escopo do capítulo 9. As três divergências tratadas são de comportamento de produto/interface e foram registradas no capítulo 21.

Nenhum arquivo de `src/`, `server/`, migration, teste, CSS, asset, `package.json`, `app-version.json`, HTML/PDF ou relatório histórico foi tocado. Nenhum defeito encontrado foi corrigido.

---

## 3. Resposta à pergunta arquitetural obrigatória — Planejamento × Agenda

**São duas interfaces sobre o mesmo plano semanal persistido.** Não são fluxos independentes.

Evidência por ponto exigido:

| Pergunta | Resposta | Evidência |
|---|---|---|
| leem a mesma semana? | sim | `useWeeklyAgendaWeek` chama `getOperationalPlanningWeek(weekMonday)`, o mesmo serviço da `OperationalPlanningPage`; semana derivada por `mondayOfWeekContainingLocal` e `weekdayLabelsPt()` do mesmo módulo |
| leem as mesmas versões de plano? | sim | ambas leem `weekPayload.plan.status` e `weekPayload.revision` e resolvem rótulo por `resolvePlanningStatusBadgeLabel` |
| compartilham rascunho/publicado? | sim | mesma entidade de plano; `WeeklyAgendaHeader` usa `resolvePlanningRevisionContext` e `resolvePlanningSaveButtonLabel` do módulo do Planejamento |
| alterações em uma aparecem na outra? | sim | gravam pelo mesmo serviço `saveOperationalPlanningWeek`; o `GET` da semana é a mesma fonte |
| usam as mesmas entidades persistidas? | sim | `buildSavePayload` da Agenda monta o mesmo corpo de itens de plano semanal |
| publicação em uma afeta a outra? | sim | ambas chamam `publishOperationalPlanningWeek(plan.id)` |
| existe sincronização entre elas? | não é necessária | não há cópia nem espelhamento; é o mesmo registro lido por duas telas |
| há ações em uma e ausentes na outra? | **sim** | ver tabela na seção 4 |
| há diferenças de regra? | **uma, real** | a persistência da remoção (seção 10) |

O capítulo explica isso em linguagem funcional, sem citar estrutura técnica, e começa afirmando que é "uma segunda forma de mexer no mesmo plano semanal".

---

## 4. Diferenças reais de superfície entre as duas telas

Verificadas por ausência comprovada de código, não por inferência.

**Só a Agenda tem:** arrastar e soltar; atribuição por toque; **Alocação em lote**; gaveta **Atenção** com contador; abas de dia; todos os colaboradores ativos sempre como linhas.

**Só o Planejamento tem:** campo **Minutos planejados** editável; as duas exportações em Excel; filtros do quadro e busca no plano; painel **Esteiras aguardando encaixe**; **Histórico da semana**; **Desvios da semana**; **Principais desvios**; ação **Reabrir**; **Imprimir tickets visíveis**.

Verificação de ausência na Agenda (`grep` por `Minutos`, `Exportar`, `Filtros`, `Visualização`, `Reabrir`, `Aguardando encaixe`, `Histórico` em `src/features/weekly-agenda/`): **zero ocorrências**.

---

## 5. Evidências principais

Todas verificadas em `aa8c3ad8`.

| Afirmação do capítulo | Evidência |
|---|---|
| menu em Gestão, com selo **Novo** | `src/lib/shell/app-nav-config.ts:93-98` — `label: 'Agenda da semana'`, `section: 'gestao'`, `showNovoBadge: true` |
| mesma permissão do Planejamento | `src/routes/AppRoutes.tsx:115-119` — `RequirePermission` com a mesma capacidade de alterar esteiras |
| título e frase de apoio | `WeeklyAgendaHeader.tsx` — "Agenda da Semana" / "Distribua e acompanhe atividades por colaborador — visualização da semana operacional." |
| semana segunda a sexta, navegação livre | `useWeeklyAgendaWeek` + `shiftWeek` sem limite de data |
| três selos de estado e selo de alterações | `resolvePlanningStatusBadgeLabel`, `PLAN_UNPUBLISHED_CHANGES_BADGE` |
| "Nenhum plano salvo nesta semana ainda." | `WeeklyAgendaHeader.tsx` |
| grade colaborador × dia, selo **Hoje**, totais | `WeeklyAgendaBoard.tsx` |
| todos os colaboradores ativos como linhas | `useWeeklyAgendaWeek` — `listCollaborators({ status: 'active' })`; `WeeklyAgendaBoard` itera sobre todos |
| "Sem atividades nesta semana", "Nenhuma atividade planejada.", "Nenhum colaborador ativo encontrado." | `WeeklyAgendaBoard.tsx` |
| legenda Planejada / Em execução / Concluída / Divergente | `WeeklyAgendaPage.tsx` |
| um dia por vez em tela pequena | `weeklyAgendaDayColumnVisibility.ts` + `WeeklyAgendaDayTabs` com `lg:hidden` |
| botão flutuante **+ Backlog** com contagem | `WeeklyAgendaBacklogFab.tsx` — pulsa com `count >= 3` |
| gaveta **Backlog operacional** e sua instrução | `WeeklyAgendaBacklogDrawer.tsx` — "Arraste para a grade ou toque em Atribuir e depois numa célula — a gaveta fecha para revelar a agenda." |
| cartão do backlog e selos | `WeeklyAgendaBacklogCard.tsx` — "Pendente: {X}", **Atribuir**, **Fora de sequência**, **Sem responsável**, **Atrasada** |
| mensagens de lista vazia | `weeklyAgendaBacklogEmptyMessage.ts` (três variantes) |
| faixa de colocação e cancelamento | `WeeklyAgendaPlacingBanner.tsx` — "Arrastando:" / "Atribuindo:", **Cancelar** |
| toque: pressionar e segurar | `WeeklyAgendaPage.tsx` — `TouchSensor` com `{ delay: 200, tolerance: 6 }` |
| atribuição por toque em dois passos | `handleBacklogAssignTap` → `handleBacklogCellTap`; célula mostra "Toque para atribuir aqui" |
| tempo planejado automático e **não editável** na Agenda | `createDraftFromBacklogDrop` — `plannedMinutes: Math.max(1, pendingMinutes \|\| plannedMinutes \|\| 60)`; nenhum campo de minutos na feature |
| mover entre dias/colaboradores e reordenar | `weeklyAgendaDnD.ts` — `applyPlanToCellDrop`, `applyPlanToDayTabDrop`, `applyPlanReorderWithinCell` |
| soltar na aba do dia muda a data | `applyPlanToDayTabDrop` + `useDroppable` em `WeeklyAgendaDayTabs` |
| drop inválido não faz nada e não avisa | `applyWeeklyAgendaDragEnd` retorna `null`; `handleDragEnd` só limpa o estado visual |
| atividade já no plano não pode ser repetida | `applyBacklogToCellDrop` — `if (plannedActivityIds.has(activityNodeId)) return null` |
| lote a partir de 3 itens | `weeklyAgendaBatchQueue.ts` — `BATCH_QUEUE_MIN_ITEMS = 3` |
| sugestão pela maior folga da semana | `findBestBatchQueueSuggestion` + `weeklyFreeMinutesForCollaborator` |
| jornada padrão de 8 h quando não há capacidade cadastrada | `DEFAULT_WORKDAY_CAPACITY_MINUTES = 480` em `resolveCellCapacityMinutes` |
| textos do lote | `WeeklyAgendaBatchQueueOverlay.tsx` — "Alocação em lote", "Voltar à agenda", "Próximo item do backlog", "Sugestão", "Deixar para depois", "Fila concluída." |
| lote não persiste | `handleBatchQueueComplete` — "Todos os itens do lote foram atribuídos ao rascunho." |
| menu do cartão | `WeeklyAgendaPlanCardMenu.tsx` — **Apontar tempo**, **Concluir**, **Imprimir ticket**, **Remover do plano**; rótulo acessível "Ações da atividade" |
| ausência de **Reabrir** na Agenda | `canReopenPlanningStep` existe em `planningCardActions.ts` mas **não é usado** por `WeeklyAgendaPlanCardMenu` |
| condições de Apontar/Concluir | `canPointTimeOnPlanningStep` (não concluída e não dispensada) e `canCompletePlanningStep` → `canCompleteStep` (permissão + não concluída + não dispensada) |
| conclusão em dois passos com justificativa fora de sequência | `handleCardComplete` — `getConveyorStepSequenceCheck`, prompt literal, "Informe uma justificativa para concluir fora da sequência.", "Confirmar conclusão desta atividade?", "Atividade concluída." |
| situação da atividade em português no cartão | `resolvePlanningItemOperationalStatusLabel` → Aberta / Em andamento / Concluída / Reaberta / Bloqueada / **Dispensada** |
| capacidade: sobrecarga só acima do limite | `resolvePlanningCapacityState` (compartilhado) |
| aviso na célula | `formatPlanningCapacityExceededMessage` — "Capacidade excedida em {X}" |
| mesmo diálogo de capacidade do capítulo 8 | `PlanningCapacityExceededDialog` + `usePlanningCapacityExceededAlert`, importados do Planejamento |
| contagem de **Atenção** = divergências + fora do plano | `weeklyAgendaSummary.ts` — `attentionCount: syncDivergenceCount + outsidePlanEntriesCount` |
| faixa de resumo com três números | `WeeklyAgendaSummaryStrip.tsx` — Planejado, Realizado, **Equipe no plano** |
| gaveta de atenção e seus dois painéis | `WeeklyAgendaAttentionDrawer.tsx` — "Itens de atenção", "Divergências de sincronização e apontamentos fora do plano semanal.", `PlanningSyncIssuesPanel` + `PlanningExecutionOutsidePlanPanel` |
| publicação idêntica | `weeklyAgendaPublish.ts` — `isWeeklyAgendaPublishDisabled` delega a `isPlanningPublishDisabled` |
| tickets da semana | `PlanningWeekTicketsPrintButton` / `PlanningWeekTicketsPrintDialog`, os mesmos do capítulo 8 |

---

## 6. Regras de semana

Primeiro dia **segunda**, cinco dias até **sexta**, idêntico ao capítulo 8 — mesma função `weekdayLabelsPt()` e mesmo intervalo derivado. Navegação por ‹ ›, intervalo `dd/mm/aaaa → dd/mm/aaaa`, abertura na semana que contém hoje, selo **Hoje** na coluna do dia. Semanas passadas e futuras são editáveis sem restrição. Erro de carga: **"Não foi possível carregar o plano desta semana."** (texto ligeiramente diferente do Planejamento, que usa "…o plano da semana.").

---

## 7. Origem e elegibilidade do backlog

**Mesma origem e mesmas regras do capítulo 8**, verificado e não inferido: `useWeeklyAgendaBacklog` chama `listOperationalPlanningBacklog({ q, limit: 100 })`, o mesmo recurso usado pelo Planejamento, e o filtro local `buildVisiblePlanningBacklogItems` apenas oculta o que já está no plano.

Diferenças de superfície: a Agenda expõe **só a busca por texto** (sem filtro de esteira ou colaborador) e apresenta a lista em gaveta, não em coluna.

---

## 8. Verificação crítica — atividade dispensada

**Verificada de forma independente, sem copiar a conclusão do capítulo 8.**

**Resultado: o defeito também ocorre na Agenda da semana**, pelo mesmo mecanismo.

Cadeia de evidência:

1. a Agenda consulta o mesmo recurso de backlog (`listOperationalPlanningBacklog`), cuja consulta no servidor filtra por atividade não removida, ativa e com situação diferente de concluída — **sem exclusão de dispensada**;
2. o único filtro adicional no cliente é `buildVisiblePlanningBacklogItems`, que só oculta o que já está no plano — não olha situação;
3. a Agenda grava pelo mesmo `saveOperationalPlanningWeek`, cuja validação recusa inativa e concluída, mas **não** dispensada;
4. a fila do colaborador trata a situação dispensada como encerrada, então o item nunca chega como trabalho executável.

**Diferença favorável encontrada na Agenda:** o sintoma é visível. O cartão na grade exibe o selo **Dispensada** (via `resolvePlanningItemOperationalStatusLabel`) e o menu dele **não** oferece **Apontar tempo** nem **Concluir** (`canPointTimeOnPlanningStep` e `canCompleteStep` excluem a situação dispensada). No Planejamento esse sinal é mais fraco.

Ação tomada: o capítulo 21 foi atualizado para registrar **o alcance real nas duas telas** e para descrever o sintoma visível na Agenda. O capítulo 9 traz o aviso com a orientação de contorno.

---

## 9. Arrastar, soltar e toque

| Item | Comportamento confirmado |
|---|---|
| origem | gaveta do backlog, ou outro cartão/célula da grade |
| destino | célula (colaborador × dia), outro cartão, ou aba de dia |
| feedback | gaveta fecha ao iniciar; faixa de status no alto; célula de destino destacada; cartão fantasma seguindo o cursor |
| persistência | **apenas estado local**; só grava ao salvar (exceção: remoção em semana publicada) |
| tempo planejado | definido automaticamente pelo tempo que falta; **sem diálogo e sem campo de edição** |
| validação de capacidade | `capacityExceededAlert.notifyIfNeeded` a cada alteração; aviso informativo, não bloqueio |
| drop inválido | nada acontece, sem mensagem |
| toque | `TouchSensor` com atraso de 200 ms e tolerância de 6 px → exige pressionar e segurar; alternativa sem arraste pelo botão **Atribuir** + toque na célula |

**Suporte a toque é comprovado**, não presumido: há sensor de toque próprio, modo de atribuição por toque com banner dedicado, células com `role="button"` e teclas Enter/Espaço, e grade de um dia por vez abaixo de `lg`.

---

## 10. Remoção do plano — diferença de regra confirmada

**É a única diferença real de regra entre as duas telas**, e foi auditada com cuidado por haver histórico de defeito nessa área.

Rótulo exato: **Remover do plano**, no menu **⋯** do cartão. Sempre disponível, sem confirmação.

| Estado da semana | Comportamento |
|---|---|
| **Rascunho** | apenas estado local; grava só ao salvar — igual ao capítulo 8 |
| **Publicado vigente** ou **Revisão em planejamento** | `handleRemoveFromPlan` chama `persistPublishedPlanItems` → **gravação imediata como revisão**, com a mensagem "Revisão salva. A fila dos colaboradores continua usando a última versão publicada." |

Evidência: `shouldAutoPersistPlanChanges(weekPayload)` retorna verdadeiro quando a semana tem versão publicada ativa; `handleRemoveFromPlan` o consulta e dispara a gravação.

Consequências documentadas: a remoção em semana publicada **não precisa de salvar**, mas **continua não chegando ao colaborador** até publicar — a versão publicada ainda contém o item, a revisão não. Em qualquer caso a atividade volta a ficar disponível no backlog. Falha na gravação automática: **"Não foi possível salvar a revisão do plano."** seguida de recarga da semana.

Itens com apontamento ou concluídos **podem** ser removidos; não há restrição por situação.

---

## 11. Capacidade

Mesmos valores e mesma regra do capítulo 8 (componentes compartilhados). Sobrecarga **somente** quando o planejado passa da capacidade; sem faixa intermediária. Aviso por célula ("Capacidade excedida em {X}") e diálogo **Capacidade diária ultrapassada** quando uma ação faz a célula cruzar o limite, com a frase "Você pode continuar o planejamento normalmente.". **Não bloqueia salvar nem publicar.** Totais recalculados a cada alteração, antes de gravar.

Nuance própria da Agenda: na **sugestão** do lote, colaborador sem capacidade cadastrada é tratado como tendo 8 h por dia (`DEFAULT_WORKDAY_CAPACITY_MINUTES = 480`), enquanto na grade a ausência de capacidade simplesmente não gera comparação. Documentado no capítulo.

---

## 12. Salvar e publicar

Rótulos, confirmações e condições **idênticos** ao capítulo 8, por reaproveitamento das mesmas funções. Aviso de pendência próprio da Agenda: **"Alterações não salvas — use 'Salvar rascunho' antes de publicar."**

**Proteção ao sair com alterações não salvas: não existe.** Verificado por busca: nenhum `beforeunload`, nenhum bloqueio de navegação, nenhuma confirmação na troca de semana. Trocar de semana ou sair descarta tudo silenciosamente. Registrado como divergência nova (seção 15).

---

## 13. Minha Fila, Modo Fábrica e tempo planejado

Confirmado por código: o item distribuído na Agenda chega a **Minha Fila** e ao **Modo Fábrica** **somente após a publicação** — mesma dependência do capítulo 8, porque é o mesmo plano e a mesma publicação.

**A Agenda altera sim o mesmo tempo planejado usado pela regra de excesso do Modo Fábrica**, já que `buildSavePayload` envia `plannedMinutes` por item. A diferença relevante é que **a Agenda não permite escolher esse valor**: ele é sempre o tempo que falta na atividade. Para definir um tempo diferente, o gestor precisa usar o campo **Minutos planejados** do Planejamento. O capítulo explica isso em bloco próprio, com o encaminhamento para o capítulo 8.

Coerência com o capítulo 7 preservada: o capítulo afirma explicitamente que **não** há exigência de justificativa por tempo acima do previsto na área autenticada — essa exigência é só do Modo Fábrica.

---

## 14. Gaveta Atenção, sincronização e execução fora do plano

**Categorias reais: exatamente duas.** `attentionCount = syncDivergenceCount + outsidePlanEntriesCount`. **Capacidade excedida e atividade sem responsável não entram** — a primeira aparece na célula, a segunda como selo no cartão do backlog. O capítulo diz isso explicitamente para evitar que o gestor espere um contador abrangente.

| Painel | Ação? | Detalhe |
|---|---|---|
| **Pendências de sincronização** | sim | campos **Data**, **Minutos**, **Colaborador**, **Equipe**; botão **Aplicar plano da esteira** com a confirmação "Valores do plano da esteira aplicados ao planejamento da fábrica."; a mudança **ainda precisa ser publicada** |
| **Fora do planejado** | não | puramente informativo; critério por **atividade**; não altera capacidade nem publicação |

Ambos são os mesmos componentes do capítulo 8, apenas reposicionados dentro da gaveta.

---

## 15. Divergências e defeitos novos

### 15.1 Agenda descarta alterações não salvas sem avisar — **severidade alta**

Registrada no capítulo 21.

Trocar de semana pelas setas ‹ › ou sair da tela descarta silenciosamente tudo que não foi salvo. Verificado por ausência: nenhum `beforeunload`, nenhum bloqueio de rota, nenhuma confirmação. O caso mais custoso é a **Alocação em lote**, que pode atribuir dezenas de itens e termina informando que foram atribuídos "ao rascunho" — sem nada gravado.

Exceção documentada: remoção em semana publicada é gravada na hora e não se perde.

### 15.2 Selo "Atrasada" do backlog usa outra regra, também incorreta — **severidade média**

Registrada no capítulo 21, como complemento da subseção existente sobre cálculo de atraso.

O selo **Atrasada** do cartão de backlog **não** usa o cálculo do Painel operacional documentado no capítulo 21. É outra implementação, sobre o mesmo campo **Prazo estimado** mal tipado: recorta os 10 primeiros caracteres, exige comprimento mínimo de 10 e compara como **texto** contra a data de hoje.

Comportamento conferido em Node com a mesma lógica, para 2026-10-03:

| Valor registrado em Prazo estimado | Resultado |
|---|---|
| `30`, `15`, `7`, `10,5` | nunca atrasada (comprimento menor que 10) |
| `Início previsto: … · Fim previsto: …` | nunca atrasada |
| `2026-09-01` (passada) | **ATRASADA** — correto |
| `2026-10-20` (futura) | não atrasada — correto |
| `01/02/2026` | **ATRASADA**, embora o prazo seja futuro |
| `25/12/2026` | não atrasada, embora pudesse estar vencida |

Com data em formato brasileiro o resultado depende do **dia digitado** (01–19 marcam sempre; 20–31 em geral não), não do prazo real. O selo aparece nos cartões de backlog **das duas telas** de planejamento.

Diferença em relação ao defeito do capítulo 5: lá um valor de um dígito podia gerar falso positivo (lido como data de 2001); aqui valores curtos nunca marcam. São implementações distintas com falhas distintas, mesma causa de fundo.

### 15.3 Alcance do defeito de atividade dispensada — **correção de registro**

O capítulo 21 afirmava que o defeito estava no **Planejamento semanal**. A verificação independente desta rodada mostrou que ele atinge **as duas telas**. A subseção foi reescrita com o alcance correto e com o sintoma visível na Agenda. Não é um defeito novo: é o mesmo, com abrangência agora registrada corretamente.

### 15.4 Hipótese levantada e descartada

Suspeitei que a Agenda pudesse ter regra própria de publicação, por existir o módulo `weeklyAgendaPublish.ts`. A leitura mostrou que `isWeeklyAgendaPublishDisabled` apenas delega a `isPlanningPublishDisabled`, com comentário explícito de espelhamento. **Sem divergência.** Registrado para que uma auditoria futura não reabra o ponto.

---

## 16. Mensagens principais catalogadas

Sucesso: "Rascunho salvo." · "Revisão salva. A fila dos colaboradores continua usando a última versão publicada." · "Plano publicado. A fila dos colaboradores foi atualizada." · "Atividade concluída." · "Todos os itens do lote foram atribuídos ao rascunho." · "Valores do plano da esteira aplicados ao planejamento da fábrica."

Erro: "Não foi possível carregar o plano desta semana." · "Não foi possível salvar o rascunho." · "Não foi possível salvar as alterações no plano ativo." · "Não foi possível salvar a revisão do plano." · "Não foi possível publicar o plano." · "Não foi possível concluir a atividade." · "Informe uma justificativa para concluir fora da sequência."

Bloqueio/aviso: "Adicione ao menos uma atividade antes de publicar o plano." · "Este plano já está publicado." · "Alterações não salvas — use 'Salvar rascunho' antes de publicar." · "Capacidade excedida em {tempo}" · "Você pode continuar o planejamento normalmente."

Estado vazio: "Nenhum plano salvo nesta semana ainda." · "Nenhum colaborador ativo encontrado." · "Nenhuma atividade planejada." · "Sem atividades nesta semana" · "Nenhum item de atenção nesta semana." · "Nenhuma pendência nesta semana." · "Nenhum apontamento fora do plano nesta semana." · "Todas as atividades carregadas no backlog já foram planejadas nesta semana." · "Nenhuma atividade encontrada para a busca." · "Fila concluída."

Nenhuma mensagem foi inventada. Todas foram extraídas literalmente do código.

---

## 17. Indicador "Novo"

**Confirmado ativo.** `app-nav-config.ts:98` — `showNovoBadge: true` no item **Agenda da semana**. É o único item de menu com esse selo. Mencionado em uma linha no bloco "Onde fica".

---

## 18. Validação executada

| Comando / verificação | Resultado real |
|---|---|
| `git fetch origin --prune` + `git rev-parse origin/docs/manual-usuario-sgp-cap08-planejamento-semanal` | `aa8c3ad87bc221e08d2677b004af99b88c45be06` — igual ao SHA base exigido |
| criação da branch a partir do SHA base | `docs/manual-usuario-sgp-cap09-agenda-semana` em `aa8c3ad8`, árvore limpa |
| `git status --short` | antes do commit: `M docs/manual/source/MANUAL_USUARIO_SGP.md` + o retorno como arquivo novo; após o commit de registro do SHA: árvore limpa |
| `git diff --stat` | `docs/manual/source/MANUAL_USUARIO_SGP.md | 412 insertions(+), 13 deletions(-)` — arquivo único |
| `git diff --check` | sem avisos |
| `git diff --name-only aa8c3ad8..HEAD` | apenas os dois arquivos permitidos |
| blocos `## ` no capítulo 9 | 6, na ordem exigida |
| `IMAGEM SUGERIDA` no capítulo 9 | 5 (limite 5) |
| termos técnicos proibidos no capítulo 9 | **zero** ocorrências de `STEP`, `DRAFT`, `PUBLISHED`, `overwrite`, endpoint, backend, migration, schema, repository, query, UUID, payload, enum, API, URL, códigos internos de situação ou nomes de permissão |
| marcador pendente no capítulo 9 | 0 |
| capítulos 5, 7, 8, 13 | 0 marcadores cada — continuam completos |
| capítulos ainda pendentes | 4, 6, 10, 11, 12, 14, 15, 16, 17, 18, 19 — exatamente o previsto; a 12ª ocorrência do marcador é sua definição no capítulo 2 |
| `grep -c STEP` no manual | 2 — ambas declaradas (nota do capítulo 20 e tabela de tradução do capítulo 21), inalterado |
| verificação em Node da regra de atraso do backlog | executada; tabela de resultados na seção 15.2 |

### 18.1 Build, lint e testes

**Não executados.** Atividade exclusivamente documental: nenhum arquivo de código, configuração ou teste foi alterado, portanto build, lint e testes não se aplicam a este diff. Nenhum resultado de execução é alegado.

### 18.2 Execução visual das telas

**Não.** Nenhuma tela foi aberta ou executada visualmente. Toda a verificação foi por leitura direta do código-fonte e extração dos textos literais de interface, com as evidências da seção 5. A única execução real foi o teste em Node da lógica de atraso (seção 15.2), que avalia a função isoladamente e não a tela. Os cinco marcadores de imagem indicam telas a capturar depois, não telas observadas.

---

## 19. Pendências, riscos e ressalvas

1. **Três pendências de produto abertas** e documentadas no capítulo 21: descarte silencioso de alterações na Agenda (alta), selo **Atrasada** incorreto no backlog (média) e atividade dispensada planejável nas duas telas (alta, já conhecida, alcance agora correto).
2. **Capítulos ainda pendentes:** 4, 6, 10 a 12 e 14 a 19. O manual não deve ser publicado como versão final enquanto houver bloco pendente.
3. **Dependência do capítulo 10.** O capítulo 9 afirma que a fila do colaborador reflete apenas a versão publicada. Ao escrever o capítulo 10, reconfirmar e manter a redação coerente.
4. **Dependência do capítulo 6.** O capítulo 9 remete ao plano próprio da esteira, à restauração de dispensada e à divisão de trabalho na estrutura. Revisar a terminologia quando o capítulo 6 for escrito.
5. **Dependência do capítulo 16.** A capacidade diária e o cadastro de colaboradores são referenciados; confirmar na rodada daquele capítulo.
6. **Marcadores de imagem não resolvidos.** As cinco capturas precisam ser produzidas antes de qualquer geração de HTML/PDF.
7. **Nuance não documentada como regra.** O cálculo de "hoje" para o selo de atraso usa o horário local do servidor, não o fuso operacional declarado. Não afeta a orientação dada ao usuário e não foi transformado em afirmação no capítulo; fica registrado aqui para auditoria futura.

---

## 20. Próximo passo recomendado

Capítulo **10 — Minha Fila**, por ser o destino direto do que é publicado nos capítulos 8 e 9 e fechar o ciclo planejamento → execução.

---

## 21. Branches

**Nenhum branch além do designado foi alterado.** SHAs conferidos em `origin` no fechamento desta rodada:

| Branch | SHA | Situação |
|---|---|---|
| `main` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` | intacto |
| `develop` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` | intacto |
| `homol` | `6b768c852a18b7428e3dadf761bad7e35c1d61ef` | intacto |
| `docs/auditoria-cobertura-funcional-manual-sgp` | `1a951e4e5f65a958bbf22fec64c79e915164c4ed` | intacto |
| `docs/manual-usuario-sgp-base-p0` | `eee4788c9ba2f8142ce035a4b5c6df39a697adbf` | intacto |
| `docs/manual-usuario-sgp-cap05-painel-operacional` | `310ba2f9d95e94f36528be507ff4080ab159e199` | intacto |
| `docs/manual-usuario-sgp-cap07-apontamentos` | `11a8fa0c49dec611c09b0dd766a378c8fd60c6d6` | intacto |
| `docs/manual-usuario-sgp-cap13-modo-fabrica` | `2a53f4572b7b71667ee8f30f36bdad5213988bb1` | intacto |
| `docs/manual-usuario-sgp-cap08-planejamento-semanal` | `aa8c3ad87bc221e08d2677b004af99b88c45be06` | intacto — base desta rodada |

Sem PR, sem merge, sem force-push, sem exclusão de branch. Sem rebase.

---

## 22. Uso/tokens

`Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.`
