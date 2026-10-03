# Retorno — manual-usuario-sgp-cap08-planejamento-semanal

**TASK_ID:** `manual-usuario-sgp-cap08-planejamento-semanal`
**Data/hora:** 2026-10-03
**Branch:** `docs/manual-usuario-sgp-cap08-planejamento-semanal`
**SHA inicial:** `2a53f4572b7b71667ee8f30f36bdad5213988bb1`
**SHA final:** registrado no commit seguinte a este arquivo (padrão do repositório)
**Status final:** concluído

---

## 1. Objetivo

Enriquecer **somente o capítulo 8 — Planejamento semanal** de `docs/manual/source/MANUAL_USUARIO_SGP.md`, substituindo o bloco pendente por conteúdo final em linguagem de usuário, com verificação direta no código como fonte da verdade.

Atividade exclusivamente documental.

---

## 2. Resumo do que foi feito

1. Confirmado o SHA base exigido pelo prompt (`2a53f457`) antes de qualquer alteração.
2. Auditado o código real da tela de planejamento semanal (frontend e servidor), extraindo textos literais de interface, regras de estado, elegibilidade, capacidade, exportações e impressão.
3. Escrito o capítulo 8 com os seis blocos editoriais definidos no capítulo 2.
4. Registradas no capítulo 21 **duas novas divergências objetivas** encontradas durante a auditoria.
5. Atualizada a linha **Situação** do cabeçalho do manual.
6. Validações executadas e registradas na seção 8 deste retorno.

Nenhum arquivo de código, migration, teste, CSS, asset, `package.json`, `app-version.json`, HTML/PDF do manual ou relatório histórico foi alterado. Nenhum defeito encontrado foi corrigido — apenas documentado e registrado.

---

## 3. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | capítulo 8 escrito; capítulo 21 com duas novas divergências; linha **Situação** atualizada |
| `docs/ai/returns/manual-usuario-sgp-cap08-planejamento-semanal-retorno.md` | criado (este arquivo) |

**Criados:** 1 · **Alterados:** 1 · **Removidos:** 0

`MANUAL_FUNCIONAL_SGP.md` **não** foi alterado nesta rodada: nenhuma divergência factual nova contra a matriz técnica foi identificada no escopo do capítulo 8. As duas divergências encontradas são de **interface/comportamento de produto**, e por isso foram registradas no capítulo 21 do manual do usuário, conforme a regra da atividade.

**Migrations envolvidas:** nenhuma.

---

## 4. Estrutura entregue no capítulo 8

Os seis blocos, na ordem exigida:

| # | Bloco | Conteúdo |
|---|---|---|
| 1 | **Para que serve** | a semana executável; nada vale antes de publicar |
| 2 | **Onde fica** | Gestão → Planejamento; título e frase de apoio literais |
| 3 | **Quem costuma ter acesso** | mesma capacidade de criar/alterar esteiras |
| 4 | **Como fazer** | escolher a semana; rascunho/publicado/revisão; backlog e exclusões; distribuir; mover/reordenar/remover; unicidade; capacidade; filtros; salvar; publicar |
| 5 | **O que esperar** | efeito da publicação; origem do tempo previsto da fábrica; encaixe; sincronização; fora do planejado; resumo e desvios; histórico; as duas exportações; tickets |
| 6 | **Quando algo é bloqueado** | cinco tabelas de mensagem → causa → ação |

**Marcadores de imagem:** 5 (limite da atividade: 5).

---

## 5. Evidências de código

Todas verificadas em `2a53f457`.

| Afirmação do capítulo | Evidência |
|---|---|
| semana é segunda a sexta, cinco dias | `src/features/operational-planning/operationalPlanningWeekRange.ts` — `weekdayLabelsPt()` retorna Segunda…Sexta; `fridayAfterMonday()` |
| título e frase de apoio | `OperationalPlanningPage.tsx` — "Planejamento da Semana" / "Distribua atividades por colaborador e acompanhe a execução diária." |
| navegação ‹ › e intervalo `dd/mm/aaaa → dd/mm/aaaa` | `OperationalPlanningPage.tsx` |
| três selos de estado e selo de alterações | `operationalPlanningPlanStatusCopy.ts` — `PLAN_STATUS_DRAFT_LABEL` "Rascunho", `PLAN_STATUS_PUBLISHED_LABEL` "Publicado vigente", `PLAN_STATUS_REVISION_LABEL` "Revisão em planejamento", `PLAN_UNPUBLISHED_CHANGES_BADGE` "Alterações não publicadas" |
| aviso de revisão | `PLAN_PUBLISHED_HELPER_TEXT` |
| alterar semana publicada cria nova versão a partir dela | `operational-planning.service.ts` — `resolveOrCreateDraftPlanForSave` + `seedDraftFromPublishedPlan` |
| publicar substitui a versão anterior | `servicePublishOperationalWeekPlan` — a versão publicada anterior da semana é desativada na publicação |
| rótulos e confirmações de salvar | `SAVE_BUTTON_DRAFT_LABEL`, `SAVE_BUTTON_PUBLISHED_LABEL`, `SAVE_DRAFT_SUCCESS_MESSAGE`, `SAVE_REVISION_SUCCESS_MESSAGE` |
| é preciso salvar antes de publicar | `isPlanningPublishDisabled()` — desabilita com `dirty`, `draftItemsCount === 0`, `planStatus !== 'DRAFT'` |
| motivos de publicação indisponível | `PUBLISH_DISABLED_ALREADY_PUBLISHED_TITLE`, `PUBLISH_DISABLED_EMPTY_TITLE`; confirmação `PUBLISH_SUCCESS_MESSAGE` |
| exclusões do backlog | `operational-planning.backlog-eligibility.ts` — exclui esteiras finalizadas, canceladas, em elaboração e aguardando planejamento; exclui atividade já em plano ativo de esteira ou de semana |
| exceção da inclusão tardia | `stepSatisfiesLateAddBacklogException` |
| filtros do backlog no servidor | `operational-planning.repository.ts` (~1490) — `node_type = 'STEP'`, não removida, ativa, situação diferente de concluída |
| unicidade e recusas | `validatePlanItems` — "Cada Atividade só pode aparecer uma vez no plano.", "Atividade já está planejada em outro plano semanal.", "Atividade inativa não pode ser planejada.", "Atividade já concluída não pode ser planejada.", "Cada item do plano da esteira só pode ser encaixado uma vez na semana.", "Plano da esteira não está aguardando encaixe na fábrica." |
| sobrecarga só acima da capacidade | `planningBoardHelpers.ts` — `resolvePlanningCapacityState` retorna sobrecarga apenas quando `planned > capacity`; sem faixa intermediária |
| aviso só quando a carga aumenta e cruza o limite | `planningCapacityExceededDetect.ts` |
| campos e frase do aviso | `PlanningCapacityExceededDialog.tsx` — "Capacidade diária ultrapassada"; Colaborador / Data / Capacidade diária / Tempo planejado / Excedente; "Você pode continuar o planejamento normalmente." |
| minutos planejados sugeridos pelo tempo restante, editáveis | `OperationalPlanningPage.tsx:1329` — `plannedMinutes: Math.max(1, bl.pendingMinutes || bl.plannedMinutes || 60)` |
| tempo previsto = tempo por unidade × quantidade | `server/src/shared/activityOperationalQuantity.ts` — `sqlConveyorStepPlannedTotalMinutes()` |
| remover é apenas local até salvar | `removeDraft()` — devolve ao backlog local; comentário no código: persistência exclusiva de "Salvar alterações" |
| filtros não afetam o que é salvo/publicado/exportado | `operationalPlanningExportFlow.ts` — exportação usa a semana salva; filtros são de visão |
| exportar salva antes e não baixa se o salvamento falhar | `operationalPlanningExportFlow.ts` — rótulos 'Salvar e exportar' / 'Exportando...'; sem download em falha de salvamento |
| duas planilhas e situações | `operational-planning.export.ts` — abas 'Planejamento' e 'Capacidade'; PUBLICADO / RASCUNHO / REVISAO_NAO_PUBLICADA |
| classificação de capacidade | `classifyCapacityRow` — 'Capacidade não cadastrada' / 'Sobrecarregado' / 'No limite' / 'Disponível' |
| visão semanal em matriz colaborador × dia | `operational-planning.weekly-view.export.ts` |
| fora do planejado é por atividade e informativo | `operational-planning.execution-outside-plan.ts` + `listExecutionOutsidePlanEntriesForWeek`; `PlanningExecutionOutsidePlanPanel` não possui ação |
| campos de divergência de sincronização | `src/domain/operational-planning/planningSyncIssues.ts` — `SYNC_DIFFERENCE_FIELD_LABELS` Data / Minutos / Colaborador / Equipe |
| aplicar plano da esteira | `PlanningSyncIssuesPanel` — "Aplicar plano da esteira", "Valores do plano da esteira aplicados ao planejamento da fábrica." |
| quatro tipos de desvio | `planningDeviationKindLabel` — 'Fora do planejado' / 'Planejado sem execução' / 'Acima do planejado' / 'Atingiu planejado sem concluir' |
| colunas do resumo operacional | `PlanningWeekOperationalSummaryBar` |
| filtros do histórico | `PlanningWeekHistoryPanel` — Todos os tipos / Apontamentos / Conclusões / Reaberturas |
| dois botões de ticket com recortes diferentes | `PlanningWeekTicketsPrintButton` "Imprimir tickets da semana (N)"; `OperationalPlanningPage.tsx` "Imprimir tickets visíveis (N)" |
| opções da janela de tickets | `PlanningWeekTicketsPrintDialog` — "Agrupar por" Responsável / Tarefa / esteira; "Incluir atividades concluídas" |
| estados do agente de impressão | `ThermalPrintAgentControls.tsx` — "Verificando agente local...", "Impressão direta disponível", "Agente local indisponível", "Testar impressora térmica" |
| aviso de fallback e nota de apoio | `activityTicketPrintCopy.ts` — `PRINT_AGENT_FALLBACK_NOTICE`, `ACTIVITY_TICKET_PRINT_SUPPORT_MESSAGE` |
| ações rápidas do cartão | `PlanningItemQuickActions.tsx` — Apontar / Concluir / Reabrir / imprimir ticket |
| a fila do colaborador depende da versão publicada | `my-work-queue.service.ts` + `servicePublishOperationalWeekPlan` |

---

## 6. Divergências novas registradas

### 6.1 Atividade dispensada volta a aparecer como planejável — **defeito funcional**

**Severidade: alta.** Registrada no capítulo 21.

A consulta de backlog em `operational-planning.repository.ts` (~linha 1490) filtra por atividade não removida, ativa e com situação diferente de concluída:

```sql
WHERE step.node_type = 'STEP'
  AND step.deleted_at IS NULL
  AND step.is_active = TRUE
  AND step.operational_status IS DISTINCT FROM 'COMPLETED'
```

Não há exclusão da situação de **dispensada**. Em `validatePlanItems` também não existe validação para essa situação — há recusa para inativa e para concluída, não para dispensada.

Consequência: a atividade dispensada aparece como disponível, pode ser distribuída, consome capacidade do colaborador no dia e sai nas exportações. Porém `my-work-queue.service.ts:65` trata a situação dispensada como encerrada:

```ts
if (row.activity_operational_status === 'ABORTED') return 'completed'
```

Logo, o item **nunca chega ao colaborador como trabalho executável**. O planejamento exibe carga que não existe.

Não corrigido, conforme a regra da atividade. Documentado no capítulo 21 com orientação operacional (não distribuir; restaurar a dispensada antes de planejar).

### 6.2 Rótulo "Daily" em inglês — **divergência de texto**

**Severidade: baixa.** Registrada na tabela de ajustes de texto do capítulo 21.

No seletor **Visualização** do Planejamento semanal, a opção de visão por dia aparece como **"Daily"**, em inglês, ao lado de **"Semana"**, traduzida. Interface do produto é em português.

---

## 7. Decisões editoriais

1. **"Backlog operacional" mantido como está.** É o rótulo real da tela. O capítulo o apresenta explicando o que a seção contém ("o que está pronto para ser planejado"), em vez de inventar um nome que o usuário não encontraria.
2. **O campo "Minutos planejados" recebeu bloco próprio em "O que esperar".** É o ponto da tela com maior consequência não óbvia: esse valor é o limite que dispara a exigência de justificativa por excesso no Modo Fábrica. Sem isso, o gestor não tem como saber que está definindo o gatilho do piso de fábrica.
3. **Contraste explícito com o capítulo 7.** O capítulo 8 afirma que a área autenticada **não** exige justificativa por tempo acima do previsto — só o Modo Fábrica exige. Mantém coerência com a correção feita na rodada do capítulo 7.
4. **Negativa explícita sobre a gaveta "Atenção".** O capítulo registra que "Atenção" aqui é coluna do resumo e que a gaveta pertence à Agenda da semana, para evitar que o leitor procure na tela errada.
5. **Divisão de trabalho entre pessoas.** O capítulo afirma que não é possível dividir uma atividade entre colaboradores no planejamento e aponta a estrutura da esteira como o lugar da divisão, conforme a unicidade imposta por `validatePlanItems`.
6. **Sobrecarga descrita como aviso, não bloqueio.** Texto alinhado à frase literal do próprio aviso.

---

## 8. Validação executada

| Comando | Resultado real |
|---|---|
| `git rev-parse HEAD` (antes de alterar) | `2a53f4572b7b71667ee8f30f36bdad5213988bb1` — igual ao SHA base exigido |
| `git status --short` | antes do commit: `M docs/manual/source/MANUAL_USUARIO_SGP.md` + o retorno como arquivo novo |
| `git diff --stat` | `docs/manual/source/MANUAL_USUARIO_SGP.md | 374 insertions(+), 9 deletions(-)` — arquivo único |
| `git diff --check` | sem avisos |
| contagem de blocos `## ` no capítulo 8 | 6, na ordem exigida |
| contagem de `IMAGEM SUGERIDA` no capítulo 8 | 5 (limite 5) |
| varredura de termos proibidos no capítulo 8 | nenhuma ocorrência de `STEP`, `DRAFT`, `PUBLISHED`, `overwrite`, endpoint, backend, migration, schema, repository, query, UUID, payload, enum, API, URL, códigos de situação ou nomes de permissão |
| contagem de blocos pendentes no manual | 12 capítulos pendentes (4, 6, 9–12, 14–19), coerente com a linha **Situação**; a 13ª ocorrência é a definição do marcador no capítulo 2 |
| `grep -c STEP` no manual | 2 — ambas declaradas (nota do capítulo 20 e tabela de tradução do capítulo 21), inalterado |

### 8.1 Build, lint e testes

**Não executados.** A atividade é exclusivamente documental: nenhum arquivo de código, configuração ou teste foi alterado, portanto build, lint e testes não são aplicáveis a este diff. Nenhum resultado de execução é alegado.

### 8.2 Telas executadas visualmente

**Não.** Nenhuma tela foi aberta ou executada visualmente nesta rodada. Toda a verificação foi feita por leitura direta do código-fonte e dos textos literais de interface, com as evidências listadas na seção 5. Os marcadores de imagem indicam telas a capturar depois, não telas observadas.

---

## 9. Pendências, riscos e ressalvas

1. **O defeito 6.1 permanece aberto no produto.** O manual orienta o usuário a contorná-lo; a correção é decisão de produto/engenharia.
2. **Capítulos ainda pendentes:** 4, 6, 9 a 12 e 14 a 19. O manual não deve ser publicado como versão final enquanto houver bloco pendente.
3. **Dependência do capítulo 6.** O capítulo 8 referencia o plano próprio da esteira, a inclusão tardia e a restauração de dispensada. Quando o capítulo 6 for escrito, conferir se a terminologia usada aqui continua coerente.
4. **Dependências dos capítulos 9, 10, 13 e 16.** O capítulo 8 remete à Agenda da semana (gaveta de atenção), à Minha Fila, ao Modo Fábrica (justificativa por excesso) e às Configurações operacionais (capacidade). As três últimas já estão escritas ou verificadas; a Agenda da semana ainda está pendente.
5. **Marcadores de imagem não resolvidos.** As cinco capturas precisam ser produzidas antes de qualquer geração de HTML/PDF.

---

## 10. Próximo passo recomendado

Capítulo **9 — Agenda da semana**, pela continuidade direta com o capítulo 8 (mesma semana operacional, e é lá que fica a gaveta de atenção referenciada aqui).

---

## 11. Branches

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
| `docs/manual-usuario-sgp-cap13-modo-fabrica` | `2a53f4572b7b71667ee8f30f36bdad5213988bb1` | intacto — base desta rodada |

Cada SHA corresponde ao esperado pela cadeia de bases das rodadas anteriores.

Sem PR, sem merge, sem force-push, sem exclusão de branch.

---

## 12. Uso/tokens

`Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.`
