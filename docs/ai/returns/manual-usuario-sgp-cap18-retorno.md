# Retorno — manual-usuario-sgp-cap18

- **TASK_ID:** `manual-usuario-sgp-cap18`
- **Data/hora:** 2026-10-04 14:17 UTC
- **Objetivo:** construir integralmente o Capítulo 18 do Manual do Usuário SGP+, com base comprovada no código atual, e marcar o capítulo como concluído na linha **Situação**.
- **Status final:** CONCLUÍDO (rodada documental). Build, lint e testes da aplicação **não foram executados** (rodada puramente documental). Testes existentes foram lidos como evidência.
- **Branch criada/publicada:** `docs/manual-usuario-sgp-cap18`
- **SHA base (completo):** `0894b5015832d741af4c14767662defe6a0aba38` — tip de `origin/docs/manual-usuario-sgp-cap15` após `git fetch origin --prune`, igual ao esperado.
- **Ancestralidade:** as 21 branches documentais remotas (`auditoria-cobertura-funcional-manual-sgp`, `base-p0`, cap04 a cap17 e as cinco de correção) confirmadas como ancestrais da base.
- **SHA final:** é o commit único desta branch que contém este arquivo (`git log -1 origin/docs/manual-usuario-sgp-cap18`). Não é registrado aqui para evitar commit extra de ajuste.

## Título real do Capítulo 18

`# 18. Saúde operacional` — preservado sem alteração.

Tópicos do marcador, todos cobertos:

| Tópico do marcador | Onde está no capítulo |
|---|---|
| o que o diagnóstico considera | 18.6 e "Atividades que continuam contando como abertas" |
| as situações possíveis e o que cada uma indica | 18.7 |
| sobrecarga e sobrecarga crítica | 18.8 |
| falta de apontamento recente e baixa ocupação | 18.9 |
| o que fazer diante de cada sinal | 18.11 |

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | marcador pendente do Capítulo 18 substituído pelo capítulo completo (367 linhas, seis blocos padrão, seções 18.1 a 18.11); linha **Situação** |
| `docs/ai/returns/manual-usuario-sgp-cap18-retorno.md` | este retorno |

Migrations: nenhuma. Código-fonte, HTML gerado, matriz técnica, `SESSION_CHECKPOINT.md`, `docs/ai/reports/` e `docs/audits/`: não tocados. O checkpoint não foi atualizado porque o escopo de edição desta rodada o exclui e não há handoff pendente.

## Funcionalidades comprovadas

| Comportamento | Evidência |
|---|---|
| Item **Saúde operacional** no grupo Cadastros operacionais e rota exigem `collaborators_admin.view` | `src/lib/shell/app-nav-config.ts`; `src/routes/AppRoutes.tsx` |
| Permissão padrão para Administrador e Gestor | `server/migrations/0013_app_permissions.sql` |
| Atalho **Saúde operacional** no topo de Colaboradores | `src/features/gestor/ColaboradoresPage.tsx` |
| Título, etiqueta Gestão, textos de apoio, faixa "Regras determinísticas…", **Voltar a colaboradores**, **Atualizar** desativado durante a carga | `src/features/collaborators/health/CollaboratorOperationalHealthPage.tsx` |
| Filtros: janela 7/15/30 (padrão 7) e inativos recarregam; busca local (nome/código, sem tratamento de acentos) e estado filtram só o carregado; nada é guardado | `CollaboratorOperationalHealthPage.tsx`; `src/domain/collaborator-health/collaboratorOperationalHealthSummaryFilters.ts` (+ teste) |
| Limite fixo de 50, primeira página, ordem alfabética; mensagem de "mais colaboradores" | `CollaboratorOperationalHealthPage.tsx` (`SUMMARY_LIMIT`); `collaborators.repository.ts` (`listCollaboratorsForOperationalHealthSummary`, `ORDER BY c.full_name`); `collaborator-operational-health-summary.service.ts` (`hasMore`) |
| Ativos por padrão (`is_active` e situação ativa); removidos nunca | `collaborators.repository.ts` |
| Seis cartões e seus textos; cartão Sobrecarga = sobrecarga + sobrecarga crítica | `CollaboratorHealthSummaryCards.tsx`; `computeOperationalHealthSummaryTotals` |
| Colunas da tabela, formatos de horas, "999%+", "hoje / há N dias / sem registro na janela", até 2 sinais + "+N", dica com a mensagem do sistema | `CollaboratorHealthSummaryTable.tsx`, `CollaboratorHealthSignalsList.tsx`, `collaboratorOperationalHealthDisplay.ts` (+ teste) |
| Rótulos de estado, risco, sinais e fonte da capacidade | `collaboratorOperationalHealthDisplay.ts` (+ teste) |
| Ordenação dos sinais: crítico, alerta, informação; dentro do nível, pelo código interno | `sortSignalsDeterministic` |
| Painel de detalhe: blocos, rótulos, "Total de minutos" em horas, data em dia/mês/ano, referência ano-mês-dia, aviso fixo, fechar por botão ou clique fora; sem estado, risco e sinais | `CollaboratorHealthSnapshotPanel.tsx`; `collaboratorHealthArgosCopy.test.ts`; `src/domain/operational/workDate.ts` |
| Atividades abertas: alocação direta (principal/apoio) ou por equipe com membro ativo; exclui só concluída; esteiras de qualquer situação; exclui atividade inativa/removida e esteira excluída | `collaborator-operational-health.repository.ts` (`aggregateOpenAssignmentsForCollaborator`) |
| Previsto = tempo unitário × quantidade; pendência por atividade = previsto − realizado próprio, mínimo zero | `server/src/shared/activityOperationalQuantity.ts`; repositório acima |
| Apontamentos recentes: todos os apontamentos de atividade da pessoa na janela, sem Extra Esteira e sem removidos | `aggregateTimeEntriesForCollaboratorWindow`; `server/migrations/0031_operational_extra_time_entries.sql` (tabela separada); `0046_kiosk_time_entry_fields.sql` (Modo Fábrica na mesma tabela) |
| Capacidade: ajuste válido na data, padrão ou 480 min, limitada a 1–1440 min; janela = diária × dias | `operational-settings.service.ts` (`resolveDailyCapacityMinutes`), `operational-settings.repository.ts`; `collaborator-operational-health.service.ts` |
| Data de referência e janela em UTC; dias desde o último apontamento em UTC | `collaboratorOperationalHealthReferenceDateOrTodayUtc`, `collaboratorHealthTimeWindowUtc`, `collaboratorSummaryDaysSinceLastEntryUtc`; `collaborator-operational-health.service.test.ts` |
| Apontamento do dia gravado com o horário real; retroativo ao meio-dia de São Paulo | `server/src/shared/operationalWorkDate.ts` |
| Regras de estado, risco e sinais (75%, 100%, 200%, 15%, inativo, sem apontamento, capacidade assumida) | `computeSummaryDeterministicStatus`, `buildExtraSignals`, `isLowRecentOccupation`, `warningToSignal`; `collaborator-operational-health-summary.service.test.ts` |
| Avisos de qualidade dos dados e textos do painel | `collaborator-operational-health.dataQuality.ts` (+ teste); `getDataQualityWarningDisplayMessage` |
| Erros: janela "Não foi possível carregar a saúde operacional" para falhas impeditivas (botão Entendi, código de suporte opcional), faixa vermelha para as demais, erro próprio no painel; números antigos mantidos após falha impeditiva | `CollaboratorOperationalHealthPage.tsx`; `src/lib/errors/sgpErrorContract.ts`, `SgpErrorPresentation.tsx`, `formatUserError.ts` |
| Dispensa mantém a atividade ativa (só muda a situação); finalizar e cancelar não mexem nas atividades | `conveyors.repository.ts` (atualização para dispensada); `conveyors.service.ts` (`servicePatchConveyorStatus`); `conveyorOperationalStatus.ts` |
| Remoção estrutural desativa ou apaga a subárvore inteira | `conveyors.service.ts` (remoções por subárvore); `conveyors.repository.ts` (`softDeactivateConveyorNodes`, `hardDeleteConveyorNodeSubtree`) |
| Inativar ou remover equipe não altera membros nem alocações | `teams.service.ts`, `teams.repository.ts` (`updateTeam`, `softDeleteTeam`) |
| Jornada por colaborador usa só alocação direta e tempo unitário; Dashboard inclui concluídas | `my-activities.repository.ts`; `dashboard.repository.ts` (`listCollaboratorLoadAggregates`) |
| Rotas de resumo e de detalhe: 401 sem sessão, 404 colaborador inexistente, contrato e avisos | `server/src/tests/collaborators.test.ts` |
| Cartões de saúde de esteira e seção do Dashboard desligados por sinalizador | `src/lib/argos/argosUiFlags.ts` (`SHOW_ARGOS_HEALTH_UI = false`) |

## Permissões identificadas

| Permissão | Efeito | Padrão |
|---|---|---|
| Colaboradores admin: consultar | item de menu, rota da tela e atalho em Colaboradores | Administrador, Gestor |
| (servidor) apenas sessão autenticada | consultas de resumo e de detalhe da saúde | qualquer conta autenticada — ver item 17 |

## Fluxo funcional documentado

Abrir e atualizar (18.1) → janela e filtros, limite de 50 (18.2) → cartões (18.3) → tabela e sinais (18.4) → painel de detalhe (18.5) → o que entra no cálculo (18.6) → estados e risco (18.7) → sobrecarga (18.8) → falta de apontamento e baixa ocupação (18.9) → qualidade dos dados (18.10) → o que fazer (18.11) → o que esperar (atividades que seguem abertas, atividade compartilhada, horário universal, divergências entre telas, rótulos técnicos) → bloqueios, falhas e ações inexistentes.

## Inconsistências e limitações encontradas (não corrigidas)

Itens 1 a 13 e 15 a 16 aparecem no capítulo em linguagem funcional, porque afetam a leitura correta.

1. **Cartão Sobrecarga conta em dobro** quem está em sobrecarga crítica: a tela soma "sobrecarregados" com "sobrecarga crítica", e o primeiro total já inclui o segundo. Defeito de interface.
2. **Atividade dispensada conta como aberta** na carga. A consulta exclui só a concluída; fila, planejamento e Evolução das Esteiras tratam a dispensada de outra forma.
3. **Esteiras de qualquer situação** entram na carga, inclusive rascunho, finalizada e cancelada; finalizar ou cancelar não conclui atividades.
4. **Equipe inativada ou removida** continua gerando carga para os membros: a consulta confere só a participação ativa do membro.
5. **Atividade compartilhada** pesa inteira para cada alocado; só o realizado próprio é descontado.
6. **Limite de 50 sem paginação.** A tela pede sempre a primeira página com 50; o servidor aceita até 200, mas não há deslocamento. A mensagem "Refine os filtros locais…" é enganosa, pois esses filtros só atuam no que já foi carregado.
7. **Capacidade da janela** usa dias corridos e a capacidade de hoje para todos os dias, sem calendário de trabalho nem variação por vigência; o planejamento usa a capacidade de cada dia.
8. **Dia de referência e janela em UTC**, enquanto o restante do sistema data apontamentos por São Paulo. Das 21h à meia-noite (Brasília) a janela avança um dia.
9. **Estado "Sem dados suficientes"/risco "Indefinido" inalcançáveis**: a capacidade resolvida é sempre de pelo menos 1 minuto por dia. A opção do filtro fica sem efeito. A fonte "Não informada" também nunca aparece.
10. **Regra de estado dependente de configuração**: "sem apontamento com atividades abertas" só leva a Atenção quando a capacidade é a assumida de 8 horas (a pontuação passa abaixo do limiar apenas com o desconto extra). Sem isso, o estado continua Saudável.
11. **Sinais truncados** em dois mais "+N", sem acesso aos demais; dentro do mesmo nível a ordem é pelo código interno em inglês, o que pode esconder "Pendência acima da capacidade da janela".
12. **Painel de detalhe** não mostra estado, risco nem sinais.
13. **Rótulo "Total de minutos"** exibe horas; no mesmo painel, a referência sai como ano-mês-dia e o último apontamento como dia/mês/ano.
14. **Rótulos de sinal sem uso** no mapa da interface (`LOW_OCCUPATION`, `BALANCED`, `HIGH_LOAD`, `OVERLOADED`, `CRITICAL_OVERLOAD`, `NO_RECENT_TIME_ENTRY`): o servidor nunca os produz. Não documentados.
15. **Falha impeditiva em Atualizar** mantém os números anteriores na tela sem aviso; na primeira carga, a área fica vazia.
16. **Busca local sem tratamento de acentos.**
17. **Lacuna de permissão no servidor:** as consultas de resumo e de detalhe exigem apenas sessão (há `TODO(RBAC)` nos controladores). A restrição por "Colaboradores admin: consultar" existe só no menu e na rota da interface; qualquer conta autenticada, inclusive Colaborador, obtém os dados pelo serviço. Com a permissão retirada e a tela aberta, **Atualizar** continua funcionando até a recarga. Não documentado no capítulo; requer decisão humana.
18. **Desempenho:** o resumo calcula o retrato de cada colaborador em sequência (até 50 cálculos encadeados). Risco de lentidão; não mensurado.
19. **Termos técnicos na tela:** "fallback", "Fallback operacional", "Capacidade por fallback", "time", "membership de equipe/time", "STEPs", "snapshot", "default global", "override" (dicas dos sinais), "Regras determinísticas", "capacidade agregada na janela (minutos)", "Recência face à data de referência", "aguarde evoluções de listagem", "Interpretação automática ainda não habilitada…". Reproduzidos no capítulo **só para reconhecimento**, em tabela própria; candidatos ao capítulo 21.3 em rodada futura (capítulo 21 não alterado).
20. **Glossário (capítulo 20)** define sobrecarga só no sentido do planejamento; o capítulo 18 explica o outro sentido. Sugestão de nota no glossário em rodada futura (capítulo 20 não alterado).
21. **Matriz técnica (SAU-001 a SAU-007)** não registra dispensadas, esteiras encerradas, equipes inativas, UTC, limite de 50, contagem dupla nem a inalcançabilidade do estado indefinido. Não alterada (fora do escopo).

Pendências anteriores fora do escopo (VAL-010, VAL-011, reaplicação de permissões, acentos corrompidos em migration, permissão sem efeito em tela, termos técnicos já registrados, Capítulo 13, Capítulo 15, ARGOS desligado, totais de esteiras excluídas, data de revisão): não tocadas.

## Pontos não comprovados — por isso não documentados

1. O que o tratamento global de sessão expirada faz exatamente nesta tela (redirecionamento ou só a janela de aviso). O capítulo orienta, de forma genérica, entrar de novo.
2. Se apontamentos em esteiras excluídas entram em "apontamentos recentes" (a consulta não filtra pela esteira; depende de a exclusão marcar também os apontamentos).
3. A ordem alfabética exata para nomes com acento (depende da configuração do banco).
4. Tempo de carga com 50 colaboradores.
5. Exibição das dicas dos sinais em telas de toque.
6. Conteúdo da análise de saúde de esteira (desligada por sinalizador) — fora do escopo e não exibida.

## Validações realizadas

| Validação | Resultado |
|---|---|
| `git fetch origin --prune`; tip da base | `0894b5015832d741af4c14767662defe6a0aba38` (OK) |
| Ancestralidade | 21/21 OK (a lista inclui a própria `cap15`, tip da base) |
| `git status --short` antes do commit | `M docs/manual/source/MANUAL_USUARIO_SGP.md`; `?? docs/ai/returns/manual-usuario-sgp-cap18-retorno.md` |
| `git diff --check` | sem saída, código de saída 0 (OK) |
| Diff do manual | 363 inserções, 7 remoções |
| Linhas removidas | somente a linha **Situação** e o marcador mais os 5 tópicos do Capítulo 18 |
| Cabeçalho | só a linha 6 (Situação) difere — conferido por script |
| Capítulos 1–17 e 19–21 | byte a byte idênticos à base — conferido por script |
| Marcador PENDENTE no Capítulo 18 | ausente; restam 2 ocorrências no manual (explicação em 2.6 e Capítulo 19) |
| Busca de termos técnicos no texto novo | só ocorrências intencionais: rótulos de tela citados literalmente e a tabela "Rótulos técnicos que aparecem na tela". "STEP" não é usado como vocabulário |
| Confronto com código/testes | ver "Funcionalidades comprovadas" |
| Consistência | capítulos 3 (menu), 4 (permissão e padrão), 6 (alocação, quantidade, situações, dispensa, remoção), 7 (data de realização), 8/9/10 (sobrecarga diária), 12 (Em aberto), 13 (Modo Fábrica), 15 (coluna de capacidade), 16 (capacidade 16.13, Colaboradores), 20 (glossário) — remissões em vez de repetição |
| Build / lint / testes | **não executados** — rodada documental |

## Linha "Situação"

- Antes: "capítulos 1 a 17, 20 e 21 com conteúdo final. Os capítulos 18 e 19 seguem marcados como pendentes e **não devem ser publicados** como versão final."
- Depois: "capítulos 1 a 18, 20 e 21 com conteúdo final. O capítulo 19 segue marcado como pendente e **não deve ser publicado** como versão final."

Mudança mínima: inclusão do 18 no intervalo concluído e concordância no singular para o único pendente.

## Metadado "Revisão deste manual"

Mantido em `2026-10-03`, conhecido como desatualizado, conforme instrução.

## Git

- Um único commit documental em `docs/manual-usuario-sgp-cap18`, publicado com `git push -u origin docs/manual-usuario-sgp-cap18`.
- **Sem** PR, merge, rebase ou force-push. `main`, `develop`, `homol` e branches documentais anteriores não alteradas.
- Estado final esperado do `git status`: limpo.

## Próximo passo recomendado

Decisão humana sobre os itens 1, 2, 6, 9, 15 e 17 (produto, interface e permissão no servidor) e sobre a inclusão dos termos do item 19 no capítulo 21. Não iniciar o Capítulo 19 automaticamente.

## Uso de contexto / sessão

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
