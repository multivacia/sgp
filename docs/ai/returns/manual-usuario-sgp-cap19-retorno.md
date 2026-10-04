# Retorno — manual-usuario-sgp-cap19

- **TASK_ID:** `manual-usuario-sgp-cap19`
- **Data/hora:** 2026-10-04 14:55 UTC
- **Objetivo:** construir integralmente o Capítulo 19 do Manual do Usuário SGP+, com base comprovada no código atual, e marcar o capítulo como concluído na linha **Situação**.
- **Status final:** CONCLUÍDO (rodada documental). Build, lint e testes da aplicação **não foram executados** (rodada puramente documental). Testes existentes foram lidos como evidência.
- **Branch criada/publicada:** `docs/manual-usuario-sgp-cap19`
- **SHA base (completo):** `d2c2ed644443843f789ae04404089d8a7f915c42` — tip de `origin/docs/manual-usuario-sgp-cap18` após `git fetch origin --prune`, igual ao esperado.
- **Ancestralidade:** as 21 branches documentais remotas `origin/docs/manual-usuario-sgp-*` (`base-p0`, cap04 a cap18 e as cinco de correção) confirmadas como ancestrais da base.
- **SHA final:** é o commit único desta branch que contém este arquivo (`git log -1 origin/docs/manual-usuario-sgp-cap19`). Não é registrado aqui para evitar commit extra de ajuste.

## Título real do Capítulo 19

`# 19. Mensagens, bloqueios e como agir` — preservado sem alteração.

Tópicos do marcador, todos cobertos:

| Tópico do marcador | Onde está no capítulo |
|---|---|
| índice de mensagens por situação, com causa e ação recomendada | 19.1 (formas de aviso e janelas comuns) e 19.2 (índice) |
| bloqueios de apontamento por situação da esteira | 19.3 |
| bloqueios por sequência e por tempo acima do previsto | 19.4 |
| bloqueios de acesso e credencial | 19.5 |
| abrir chamado: quando, como e o que informar | 19.6, 19.7, 19.8 e 19.9 (acompanhamento na tela Chamados) |

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | marcador pendente do Capítulo 19 substituído pelo capítulo completo (seis blocos padrão, seções 19.1 a 19.9); linha **Situação** |
| `docs/ai/returns/manual-usuario-sgp-cap19-retorno.md` | este retorno |

Migrations: nenhuma. Código-fonte, HTML gerado, matriz técnica, `SESSION_CHECKPOINT.md`, `docs/ai/reports/` e `docs/audits/`: não tocados. O checkpoint não foi atualizado porque o escopo de edição desta rodada o exclui e não há handoff pendente.

## Decisão editorial

O capítulo é **consolidador**: as mensagens de cada tela já estão nos blocos "Quando algo é bloqueado" dos capítulos 3 a 18. Para não criar versões paralelas, o capítulo 19 traz um índice com remissão ao capítulo de detalhe, as regras transversais (situação da esteira, justificativa, acesso, sessão) e descreve por completo apenas o que não tinha capítulo próprio: o **módulo de chamados** (botão **Abrir chamado** e tela **Chamados**), já remetido ao capítulo 19 pelo capítulo 3, seção 3.3.

## Funcionalidades comprovadas

| Comportamento | Evidência |
|---|---|
| Botão **Abrir chamado** e item **Chamados** dependem do sinalizador de interface; sem ele, rota redireciona para o Painel operacional | `src/lib/api/env.ts` (`isSupportTicketsEnabled`, + `env.support.test.ts`); `src/components/AppHeader.tsx`; `src/components/AppSidebar.tsx`; `src/lib/shell/app-nav-config.ts` (`requiresSupportTickets`); `src/features/support/SupportTicketsPage.tsx` (`Navigate to /app/backlog`) |
| Serviço de chamados depende de sinalizador próprio no servidor; desligado responde "Módulo de suporte está desativado." (404) | `server/src/modules/support/support.service.ts`; `server/src/tests/support-http.integration.test.ts` (flag off) |
| Sem permissão específica: rotas exigem só sessão | `server/src/modules/support/support.routes.ts` (`requireAuth()`) |
| Janela **Abrir chamado**: categorias, Assunto (máx. 160), Descrição, "Isso está me impedindo de continuar", Cancelar, Registrar chamado/Enviando..., fechar por clique fora, texto preservado ao reabrir | `src/features/support/OpenSupportTicketDialog.tsx` |
| Validações "Informe o assunto." / "Informe a descrição."; erro do servidor exibido como texto bruto | `src/features/support/support.schemas.ts`; `useOpenSupportTicket.ts`; `src/lib/api/client.ts` (mensagem de rede técnica); `server/src/shared/errors/errorHandler.ts` (`Campo inválido: …`); `server/src/modules/support/support.schemas.ts` (descrição máx. 10000) |
| Endereço da tela registrado automaticamente; pedido/correlação não enviados pela janela | `OpenSupportTicketDialog.tsx` (`routePath`, `moduleName`, sem `requestId`) |
| Severidade = Alta se impeditivo, senão Média; status inicial Aberto; usuário e colaborador vinculado gravados | `server/src/modules/support/support.code.ts`; `support.repository.ts` (`createTicketRecord`); `support.service.test.ts` |
| Protocolo `CHM-AAAAMMDD-HHMMSS####` em horário universal | `support.code.ts` (`buildSupportTicketCode`, `getUTC*`) |
| Confirmação com Protocolo e linhas E-mail/WhatsApp em código (SENT/FAILED/SKIPPED) | `SupportTicketSuccessDialog.tsx`; `support.service.ts` (`buildSummary`) |
| Chamado gravado antes do aviso; falha de canais não invalida a criação | `support.service.ts`; `support.service.test.ts` |
| E-mail: depende de sinalizador, remetente e servidor de e-mail; destinatários por severidade (Alta → lista própria ou padrão; Média → lista própria ou padrão) | `support.notifications.ts`; `support.routing.ts`; `support.routing.test.ts`; `support.notifications.test.ts` |
| WhatsApp nunca enviado nesta versão | `support.notifications.ts` (`WhatsAppSupportNotifier` sempre SKIPPED) |
| Tela **Chamados**: título, texto, filtros (Busca, Status, Categoria por código exato, Severidade, Período), aplicar só no botão, colunas, Detalhe, Copiar protocolo e avisos, estados de carga/vazio/erro | `SupportTicketsPage.tsx`, `SupportTicketsFilters.tsx`, `SupportTicketsTable.tsx`, `SupportTicketReadonlyDialog.tsx`, `support-list.api.ts` (+ teste) |
| Lista e detalhe só dos chamados do próprio usuário (detalhe de terceiro = 404); busca em protocolo/assunto sem distinção de maiúsculas; ordem por atualização; sem paginação | `support.repository.ts` (`listTicketsByUserWithFilters`, `findTicketByIdForUser`); `support-http.integration.test.ts` |
| Nenhuma ação altera chamado depois de criado | busca por `support_tickets` em `server/src` e `server/migrations`: só inserção e leitura; sem gatilho de atualização em `0022_support_tickets.sql` |
| Janelas comuns (Sem permissão, Sessão inválida, Operação não concluída, Não foi possível continuar + "Sistema indisponível no momento"), botão Entendi, "Código de suporte" | `src/lib/errors/sgpErrorContract.ts` (+ teste); `SgpErrorPresentation.tsx`; `formatUserError.ts`; `server/src/shared/errors/errorRefs.ts`; `errorHandler.ts`; `permissions.middleware.ts` |
| Situações da esteira que aceitam apontamento/conclusão e mensagens | `server/src/modules/conveyors/conveyorOperationalStatus.ts`; `conveyorAssignments.service.ts`; `conveyor-step-operational.service.ts`; `production-time-entries.service.ts` |
| Tempo acima do previsto só no Modo Fábrica; planejado do colaborador × realizado total da atividade | `production-time-entries.service.ts` (`resolveProductionExcessCheckPlannedMinutes`, `productionRequiresExcessTimeJustification`); `conveyorNodeWorkload.repository.ts` (`sumRealizedMinutesByStepForConveyor`); `production-work-queue.service.ts`; `src/features/kiosk/KioskActivityCard.tsx` |
| Navegador da fábrica sem campo de justificativa para tempo acima do previsto | `src/features/production/productionTimeEntryDialogLogic.ts` (`productionTimeEntryNeedsJustification` só fora de sequência; + teste); `ProductionTimeEntryDialog.tsx` |
| Entrada: mensagens, bloqueio por tentativas (padrão 5 / 15 min), conta inativa; títulos de janela Sessão inválida/Sem permissão | `server/src/modules/auth/auth.service.ts`; `server/src/config/env.ts`; `src/pages/LoginPage.tsx`; `sgpErrorContract.ts` |
| Troca de senha: mensagens, título da janela para senha atual incorreta, sessão mantida no equipamento e encerrada nos demais | `auth.schemas.ts`; `auth.service.ts`; `auth.controller.ts` (novo token); `auth.middleware.ts` (carimbo de senha); `src/pages/ChangePasswordPage.tsx` |
| Sessão: aviso de inatividade e botões; mensagens de expiração/encerramento na tela de entrada; contador baseado na última confirmação | `SessionIdleWarningDialog.tsx`, `SessionIdleWarningHost.tsx`; `systemSettingsValidation.ts` (`shouldShowSessionIdleWarning`); `src/lib/auth-context.tsx`; `apiErrors.ts`; `auth.middleware.ts` |

## Permissões identificadas

| Recurso | Permissão | Observação |
|---|---|---|
| Abrir chamado / Chamados | nenhuma; apenas sessão autenticada | depende de dois sinalizadores de ambiente (interface e servidor) |
| Conteúdo consolidado (apontamento, acesso) | as já documentadas nos capítulos 4, 6, 7, 13 e 16 | sem alteração nesta rodada |

## Fluxo funcional documentado

Reconhecer o tipo de aviso e as janelas comuns (19.1) → índice por situação com remissão (19.2) → bloqueio por situação da esteira e da atividade (19.3) → justificativa por sequência e por tempo, por canal (19.4) → entrada, troca de senha, sessão, permissão, vínculo e Modo Fábrica (19.5) → quando abrir e quando não abrir chamado (19.6) → abrir chamado e ler a confirmação (19.7) → o que escrever (19.8) → acompanhar na tela Chamados (19.9) → o que esperar → bloqueios, códigos na tela e ações inexistentes.

## Inconsistências e limitações encontradas (não corrigidas)

Itens 1 a 9 aparecem no capítulo em linguagem funcional, porque afetam o uso.

1. **Status do chamado nunca muda**: não há ação, rota ou gatilho que altere um chamado; todos ficam "Aberto", "Última atualização" = criação, e os filtros Em progresso/Resolvido/Fechado nunca trazem resultado.
2. **Nenhuma tela para quem atende**: cada usuário vê só os próprios chamados; o atendimento depende do aviso por e-mail.
3. **Aviso pode não ocorrer**: com e-mail desligado ou sem destinatário, o chamado é gravado sem aviso a ninguém; WhatsApp nunca é enviado (provedor sempre "SKIPPED").
4. **Códigos crus na tela**: confirmação (SENT/FAILED/SKIPPED), coluna e filtro Categoria (códigos), detalhe (OPEN, MEDIUM/HIGH e categoria em código).
5. **Filtro Categoria exige código exato** (comparação de igualdade, sensível a maiúsculas); filtro Severidade oferece Baixa e Crítica, que nunca ocorrem.
6. **Mensagens técnicas na janela de abertura**: falha de rede mostra "NETWORK_ERROR: falha ao contatar a API…" (texto de diagnóstico de desenvolvimento); descrição acima de 10 mil caracteres mostra "Campo inválido: description. …" em inglês; a interface não limita o tamanho.
7. **Protocolo em horário universal**: a data do protocolo pode ser o dia seguinte para chamados abertos após 21h (Brasília).
8. **Navegador da fábrica sem justificativa para tempo acima do previsto**: o servidor exige a justificativa, mas a tela só mostra o campo para fora de sequência — o registro fica impossível por ali. Mesmo padrão da pendência "Página Apontamento sem campo de justificativa" do capítulo 21. Candidato a registro no capítulo 21 em rodada futura (capítulo 21 não alterado).
9. **Títulos de janela enganosos na entrada e na troca de senha**: "E-mail ou senha inválidos." e "Senha atual incorreta." aparecem em janela **Sessão inválida**; bloqueio por tentativas e conta inativa aparecem em janela **Sem permissão**.
10. **Aviso de inatividade calculado pela última confirmação**, não pela última atividade real; aparece durante uso contínuo. Documentado no capítulo como comportamento; correção é decisão de produto.
11. **Tempo acima do previsto compara grandezas diferentes**: planejado **do colaborador** × realizado **de todos** na atividade. Documentado como regra atual; o capítulo 13 diz "o que já foi apontado" sem explicitar que inclui colegas (capítulo 13 não alterado).
12. **Justificativa de tempo acima do previsto em texto livre** (modo de contingência, quando a lista de justificativas não carrega): o servidor valida, mas, sem atividade fora de sequência, aparentemente grava só a referência da justificativa padronizada, não o texto livre. Não documentado no capítulo; requer verificação dedicada.
13. **Ordem de verificação na entrada**: a mensagem de conta inativa aparece antes da conferência da senha (revela que a conta existe e está inativa, com qualquer senha). Não documentado; ponto de segurança para decisão humana.
14. **Busca de chamados sem tratamento de acentos** (comparação sem normalização). Não documentado.
15. **Janela de abertura**: a mensagem de erro anterior permanece ao fechar por clique fora e reabrir; a categoria escolhida não volta ao padrão após registrar. Impacto baixo; não documentado.
16. **Seção 2.6 ("Capítulos ainda pendentes")** continua descrevendo o marcador de pendência, agora sem capítulos pendentes. Fora do escopo desta rodada (capítulo 2 não alterado); recomendado para a auditoria final.
17. **Capítulo 4, seção 4.4** mostra a janela Sem permissão sem a linha "Código de suporte", que o servidor envia nas recusas de permissão. Não é contradição (o capítulo 19 explica a linha); não alterado.

Pendências anteriores fora do escopo (VAL-010, VAL-011, reaplicação de permissões, acentos corrompidos em migration, permissão sem efeito em tela, termos técnicos já registrados, Capítulos 13, 15, 16, 17, 18 e 21, backend de Saúde operacional, data de revisão): não tocadas.

## Pontos não comprovados — por isso não documentados

1. Fuso usado pelo filtro **Hoje** da tela Chamados (depende do fuso da sessão do banco); o capítulo diz apenas "pela data de abertura".
2. Se, na expiração da sessão, a janela **Sessão inválida** também aparece sobre a tela de entrada em todas as telas (depende do tratamento de cada tela); o capítulo descreve a tela de entrada com o aviso.
3. Conteúdo exato do e-mail recebido pelo suporte e o tempo de entrega (depende do servidor de e-mail do ambiente). O capítulo descreve apenas o que o chamado leva.
4. Comportamento do botão **Abrir chamado** em telas estreitas (celular) além da presença na barra superior.
5. Lista completa de telas que usam as janelas comuns: confirmada em 30 arquivos de tela; o capítulo diz "boa parte das telas".

## Validações realizadas

| Validação | Resultado |
|---|---|
| `git fetch origin --prune`; tip da base | `d2c2ed644443843f789ae04404089d8a7f915c42` (OK) |
| Ancestralidade | 21/21 OK |
| Branch | criada de `origin/docs/manual-usuario-sgp-cap18`; rastreamento para a base removido (`git branch --unset-upstream`) para não publicar na branch anterior |
| `git status --short` antes do commit | `M docs/manual/source/MANUAL_USUARIO_SGP.md`; `?? docs/ai/returns/manual-usuario-sgp-cap19-retorno.md` |
| `git diff --check` | sem saída, código de saída 0 (OK) |
| Diff do manual | 440 inserções, 7 remoções |
| Linhas removidas | somente a linha **Situação** e o marcador mais os 5 tópicos do Capítulo 19 (conferido em `git diff -U0`) |
| Cabeçalho | só a linha **Situação** difere |
| Capítulos 1–18 e 20–21 | byte a byte idênticos à base — conferido por script |
| Marcador PENDENTE no Capítulo 19 | ausente; resta 1 ocorrência no manual (explicação da seção 2.6, fora do escopo) |
| Tabelas do capítulo | número de colunas consistente em todas as linhas — conferido por script |
| Busca de termos técnicos no texto novo | só ocorrências intencionais: mensagens de tela citadas literalmente ("Faça login novamente", "NETWORK_ERROR … API") e a tabela "Códigos que aparecem na tela". "STEP" não é usado |
| Confronto com código/testes | ver "Funcionalidades comprovadas" |
| Consistência | capítulos 3 (3.1, 3.3, 3.4, 3.6), 4 (4.4–4.6), 6 (6.2, 6.11, 6.12, 6.17, 6.19), 7, 8, 10, 13, 16 (16.5, 16.9, 16.10, 16.15), 17 e 21 — remissões em vez de repetição; nenhuma regra divergente introduzida |
| Build / lint / testes | **não executados** — rodada documental |

## Linha "Situação"

- Antes: "base editorial criada; capítulos 1 a 18, 20 e 21 com conteúdo final. O capítulo 19 segue marcado como pendente e **não deve ser publicado** como versão final."
- Depois: "base editorial criada; capítulos 1 a 21 com conteúdo final."

Mudança mínima: inclusão do 19 no intervalo concluído e remoção da frase sobre o único pendente.

## Metadado "Revisão deste manual"

Mantido em `2026-10-03`, conhecido como desatualizado, conforme instrução.

## Git

- Um único commit documental em `docs/manual-usuario-sgp-cap19`, publicado com `git push -u origin docs/manual-usuario-sgp-cap19`.
- **Sem** PR, merge, rebase ou force-push. `main`, `develop`, `homol` e branches documentais anteriores não alteradas.
- Estado final esperado do `git status`: limpo.

## Próximo passo recomendado

Rodada separada de **auditoria final integral do manual** (coerência entre capítulos, seção 2.6, cabeçalho/Situação, metadado de revisão e pendências conhecidas), incluindo a decisão sobre levar os itens 8 e 9 ao capítulo 21. Decisão humana sobre os itens 1 a 3 (produto), 6 (texto técnico na tela), 12 e 13 (verificação e segurança). Não iniciar a auditoria automaticamente.

## Uso de contexto / sessão

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
