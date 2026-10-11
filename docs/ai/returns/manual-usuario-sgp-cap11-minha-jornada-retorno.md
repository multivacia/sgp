# Retorno — Capítulo 11: Minha Jornada

## Identificação e estado da entrega

- TASK_ID: `manual-usuario-sgp-cap11-minha-jornada`.
- Data/hora da rodada de origem (autoria do conteúdo): `2026-10-03 16:34 UTC`.
- Data/hora desta rodada de aplicação e publicação: `2026-10-03 20:46 UTC` — Claude Code, sessão em nuvem, com conexão Git de escrita.
- Repositório: `multivacia/sgp`.
- Branch de trabalho: `docs/manual-usuario-sgp-cap11-minha-jornada`.
- SHA base: `673a65e613442b9b8c58c7a31d2401d04962a3c8`.
- SHA do commit de conteúdo desta rodada: `050e22145098cc10e4b6025df18e28d002be2fdd`.
- Tip final desta rodada: o próprio commit complementar de metadados, obtido pela referência da branch (`git rev-parse origin/docs/manual-usuario-sgp-cap11-minha-jornada`); não pode constar dentro de si, e foi informado na resposta da sessão — commit complementar de metadados, sem amend nem reescrita de histórico.
- SHA do commit de conteúdo da sessão de origem: `ff338e38d0006eb30d2af01dc13bfbfc3a257a31` — **referência de auditoria apenas; nunca foi publicado**. O conteúdo desta rodada foi reproduzido pelo patch integral, logo os SHAs são novos.
- Estado: capítulo escrito na origem, reconferido no código nesta rodada, commitado e **publicado** na branch do capítulo 11.
- PR, merge, force-push e exclusão de branches: **nenhum**.
- Uso/tokens disponíveis: **INDISPONÍVEL — a sessão não fornece métrica confiável**.

## Objetivo e resultado documental

Substituir somente o marcador do capítulo 11 por orientação para usuário final, sustentada pelo código no tip publicado do capítulo 10. O capítulo responde de onde vêm previsto e realizado e explicita que a tela atual omite cobertura e Extra Esteira.

O capítulo tem exatamente os seis blocos exigidos, uma sugestão de imagem e referências ao capítulo 7 para regras de apontamento. Não foi escrito o capítulo 12. Os demais capítulos e o cabeçalho do manual foram preservados.

Foram corrigidas somente afirmações factuais da matriz funcional, sem editar retornos históricos. Não houve alteração de código, testes, migrations, configurações, assets, CSS, HTML ou PDF.

## Base, cadeia e governança

Esta seção descreve a rodada de aplicação e publicação (Claude Code, sessão em nuvem). A rodada de origem, que escreveu o conteúdo, está registrada em "Rodada de origem — registro histórico".

1. `CLAUDE.md`, `AGENTS.md`, `docs/ai/context/PROJECT_CONTEXT.md` e o checkpoint vigente foram lidos antes de qualquer alteração. `CLAUDE.md`, `AGENTS.md` e `PROJECT_CONTEXT.md` na base são idênticos aos de `main` (`git diff --stat c611d10f HEAD` sem saída).
2. `git fetch origin --prune` **nativo** foi executado nesta rodada. O inventário remoto resultante tem **28 referências**, incluindo a branch do capítulo 11 já existente.
3. `origin/docs/manual-usuario-sgp-cap10-minha-fila` está publicado e seu tip é `673a65e613442b9b8c58c7a31d2401d04962a3c8`, igual à base registrada no repasse. Base confirmada por consulta própria, não por herança do anexo.
4. `origin/docs/manual-usuario-sgp-cap11-minha-jornada` estava em `673a65e613442b9b8c58c7a31d2401d04962a3c8` — a própria base, sem conteúdo desta atividade. Nenhuma outra sessão avançou a branch, logo não houve sobrescrita nem retrocesso de trabalho paralelo.
5. Ancestralidade confirmada com `git merge-base --is-ancestor` contra a base, com exit code lido para cada referência. As oito branches da cadeia retornaram ancestral: auditoria → P0 → 5 → 7 → 13 → 8 → 9 → 10.
6. Branch local criada do commit exato com `git checkout -B docs/manual-usuario-sgp-cap11-minha-jornada origin/docs/manual-usuario-sgp-cap11-minha-jornada`. Working tree limpo antes da aplicação. Checkout completo, não esparso.
7. O patch integral do repasse foi extraído e sua integridade conferida: SHA-256 calculado `89900d58f7066512fd201758dca585d15d64586efc64e94cf05fccceca4c4a59`, idêntico ao declarado. `git apply --check` passou limpo nos quatro arquivos antes da aplicação; a aplicação não usou força, `3way` nem substituição de arquivos inteiros.
8. `git apply --numstat` confirmou que o patch toca exatamente os quatro arquivos autorizados, nenhum outro.
9. Os pontos críticos do repasse foram **reconferidos no código da base**, não aceitos como prova isolada do retorno. Resultados em "Reconferência no código desta rodada".
10. Nenhuma referência de `main`, `develop`, `homol` ou de branch anterior foi alterada. Inventário comparado antes e depois da publicação.

### Reconferência no código desta rodada

Leituras diretas no código da base, com resultado por alegação:

| Alegação do repasse | Reconferência | Resultado |
|---|---|---|
| Presets 7/15/30/mês/personalizado, padrão 7 dias, sem Hoje/Esta semana e sem setas | `src/lib/operationalSemantics.ts:56-65`; `operational-journey.schemas.ts:29-46` (`periodPreset = '7d'` por omissão) | Confirmada |
| Rótulo "Mês atual (UTC)" exibido na própria jornada, com cálculo em São Paulo | `operationalSemantics.ts:63`; `server/src/shared/operationalPeriod.ts:8-9,57` | Confirmada |
| Personalizado exige ambas as datas e início não posterior ao fim | `operational-journey.schemas.ts:13-27`; `operational-journey.service.ts:200-210` | Confirmada |
| Previsto vem de atribuições diretas, sem plano semanal, sem período, sem expandir equipe | `my-activities.repository.ts:25-82` (apenas `conveyor_node_assignees` + estrutura ativa); `operational-journey.service.ts:275-279` | Confirmada |
| Vínculos de esteira finalizada/cancelada podem continuar no previsto | A query não filtra `operational_status`; o previsto soma todas as alocações retornadas (`operational-journey.service.ts:288`) | Confirmada |
| **Defeito de quantidade prevista**: a consulta não seleciona a quantidade e o mapeamento assume uma unidade | O SELECT de `listActivitiesRawForCollaborator` lista `step.planned_minutes` mas **omite `step.planned_quantity`**, embora `MyActivityRawRow` a declare (`my-activities.repository.ts:5-23,33-56`). `my-activities.service.ts:75-80` recebe ausente → `Number(undefined) \|\| 1` = 1 e `resolveActivityPlannedTotalMinutes(min, undefined)` → quantidade 1 (`activityOperationalQuantity.ts:18-25,56-62`) | **Confirmada**; nenhuma correção de código feita |
| Cobertura usa previsto ≤ 0 → não aplicável, sem teto de 100%, formato gerencial com uma casa | `server/src/shared/coberturaTempo.ts:14-28` (`ratio: null` quando `p <= 0`, sem clamp); `operationalSemantics.ts:67-70` (`Math.round(ratio * 1000) / 10`) | Confirmada |
| Minha Jornada não exibe cobertura, saldo/diferença nem pendência de tempo | Busca por `cobertura`, `saldo`, `pendenciaTempo` em `JornadaPage.tsx`: **nenhuma ocorrência** | Confirmada |
| Extra Esteira é calculado pelo serviço mas não exibido na jornada | Serviço agrega (`operational-journey.service.ts:296-322`, `MAX_TOP_EXTRA_DESCRIPTIONS = 3` em `:128`); busca por `extraEsteira`/`Extra Esteira` em `JornadaPage.tsx`: **nenhuma ocorrência** | Confirmada |
| Histórico de até 20 registros, sem carregar mais; totais sobre todos os válidos | `JornadaPage.tsx:274` (`limit: 20`) e `:591`; contrato aceita 1–100 (`operational-journey.schemas.ts:3,10`); ordenação `entry_at DESC, created_at DESC` (`operational-journey.repository.ts:140,430`); nenhum controle de paginação na página | Confirmada |
| Coluna Concluídas fica vazia por falta de fonte | `operational-journey.service.ts:325-327` exclui `finalizadas`/`canceladas` de `assignmentsOpen`; `assignmentsAtRisk` é só `em_atraso` (`:328`); `JornadaPage.tsx:315-321` monta `allAssignments` apenas dessas duas listas e `:336` destina `finalizadas`/`canceladas` à coluna Concluídas | Confirmada |
| Colunas e cartões usam a situação da esteira, não a conclusão individual | `JornadaPage.tsx:327-337` agrupa por `operationalBucket` da esteira; `:199` exibe `labelConveyorOperationalStatus(item.conveyorStatus)`; `:129-130` faz `canApontar` depender só do bucket | Confirmada |
| Pendência de tempo: previsto > realizado, até 48 itens, só na gerencial | `operational-journey.service.ts:127` (`MAX_PENDENCIAS = 48`), `:149-173`, `:331` | Confirmada |
| Apontar abre a página de apontamento sem levar período/filtro | `JornadaPage.tsx:82-88`: o destino carrega apenas `conveyorId` e `from=jornada`; nenhum parâmetro de período ou de filtro | Confirmada |
| Sem vínculo, a consulta é recusada com orientação ao administrador | `my-activities.service.ts:127-134`: erro 422 com "Peça ao administrador para associar seu acesso." | Confirmada |

Nenhuma divergência entre o repasse e o código da base foi encontrada. O teste `server/src/tests/operational-journey-structural-planned.test.ts` existe e foi **apenas lido**, não executado.

### Rodada de origem — registro histórico

Registro preservado para auditoria, **não** como bloqueio atual:

- A integração conectada da sessão de origem negou escrita com `403 — Resource not accessible by integration`, tanto na criação por SHA/base_ref como na atualização da referência sem força.
- Após autorização do usuário e autenticação manual, o navegador criou a branch remota na base correta, mas interrompeu o envio de arquivos com "Browser observation is unavailable because native credential state cannot be safely resumed.". Nenhum commit de conteúdo chegou ao remoto.
- Não houve recusa de revisão automática; tratava-se de limite de escrita da sessão de origem.
- Esse bloqueio **não se aplica a esta rodada**: a publicação foi concluída pela conexão Git de escrita desta sessão.

### Referências obrigatórias lidas

- `CLAUDE.md`, `AGENTS.md`, `docs/ai/context/PROJECT_CONTEXT.md` e `docs/ai/context/SESSION_CHECKPOINT.md`.
- `docs/manual/source/README.md`, `MANUAL_FUNCIONAL_SGP.md` e `MANUAL_USUARIO_SGP.md`.
- Retornos dos capítulos 7, 8, 9, 10 e 13 em `docs/ai/returns/`.
- Código das telas Minha Jornada, Apontamento, Minha Fila e Jornada Gerencial; navegação, rotas, serviços e consultas relacionadas; sem confiar em retornos como prova isolada.

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | Somente o capítulo 11; substituição integral do marcador |
| `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` | Correções factuais em JOR-001, JOR-003, 45.3–45.7 e VAL-017 |
| `docs/ai/returns/manual-usuario-sgp-cap11-minha-jornada-retorno.md` | Este retorno, criado |
| `docs/ai/context/SESSION_CHECKPOINT.md` | Continuidade da atividade após compactação e com publicação pendente, exigida pelo `CLAUDE.md`, seção 5 |

Nenhum arquivo foi removido. Migrations envolvidas: **nenhuma**. Relatórios históricos: **intactos**.

## Evidências de acesso e fonte dos dados

| Regra confirmada | Evidência no SHA base |
|---|---|
| Menu Colaborador → Minha jornada, sem gate de permissão específico | `src/lib/shell/app-nav-config.ts:179-198` |
| Rota autenticada, com fluxo global de troca de senha, sem permissão gerencial específica | `src/routes/AppRoutes.tsx:54-61,254,269`; `server/src/modules/my-activities/my-activities.routes.ts:34-39` |
| Apenas o colaborador vinculado à conta autenticada; sem seleção de outra pessoa | `my-activities.controller.ts:78-103` |
| Vínculo lido de `app_users.collaborator_id`, sem aproximação por nome ou e-mail | `server/src/modules/auth/auth.repository.ts:197-210` |
| Sem vínculo: resposta 422 e orientação de associação pelo administrador | `my-activities.controller.ts:80-89` |
| Consulta de colaborador exclui cadastros removidos; não filtra inativo nessa leitura | `operational-journey.repository.ts`, função `listCollaboratorBriefs`; `operational-journey.service.ts`, validação dos colaboradores |

O realizado usa o colaborador do lançamento, não o usuário autor. Apontamento em nome de terceiro conta para a pessoa beneficiária do registro. A origem da entrada não limita os totais: produção, Modo Fábrica, gaveta, página direta e lançamentos gerenciais entram quando vinculados ao próprio colaborador.

## Períodos, datas, fuso e navegação

| Opção | Regra real |
|---|---|
| `7d` — Últimos 7 dias | Padrão; agora menos 7 × 24 horas, até agora |
| `15d` — Últimos 15 dias | Agora menos 15 × 24 horas, até agora |
| `30d` — Últimos 30 dias | Agora menos 30 × 24 horas, até agora |
| `month` — Mês atual (UTC) | Primeiro dia do mês à meia-noite de São Paulo até agora; **rótulo incorreto** |
| `custom` — Intervalo personalizado | Início 00:00:00 e fim 23:59:59.999, com deslocamento -03:00, incluindo os dois dias |

Evidências: `src/features/colaborador/JornadaPage.tsx:247-281,419-465`; `src/lib/operationalSemantics.ts:56-65`; `src/domain/operational/workDate.ts:111-116`; `server/src/shared/operationalPeriod.ts:29-68`; `server/src/shared/operationalWorkDate.ts`; `operational-journey.service.ts:177-224`.

- Não existem presets próprios de hoje, semana ou mês passado, nem botões de período anterior/seguinte. Esses recortes usam as datas personalizadas.
- O intervalo aceita início igual ao fim, exige ambas as datas e recusa início posterior ao fim. Não há teto de duração ou bloqueio de datas futuras para consulta; a regra de não apontar trabalho futuro continua separada.
- Trocar um preset limpa as datas personalizadas, mas mantém o filtro de esteira. As alterações dos filtros disparam a consulta; não há botão Aplicar.
- A janela e as datas dos apontamentos são formatadas na referência de São Paulo. A janela não mostra a hora de corte dos períodos móveis.
- O rótulo “Mês atual (UTC)” **afeta Minha Jornada**, além da Jornada Gerencial e de outras telas que usam o catálogo compartilhado. Não foi tratado como problema exclusivo do Dashboard.
- O período restringe realizado no período e histórico; não restringe previsto, atividades, acumulado, buckets, atraso ou pendências de tempo calculadas.

## Fonte do previsto — resultado da auditoria forte

O previsto vem de `serviceListActivitiesForCollaborator` → `listActivitiesRawForCollaborator` → `conveyor_node_assignees`, por vínculo **direto** com o colaborador, não de plano semanal publicado, capacidade ou distribuição diária.

A consulta exige atribuição e esteira não removidas, atividade ativa e não removida e ancestrais Área/Opção ativos e não removidos. Não expande membros de equipe nem verifica status individual COMPLETED/ABORTED. Tampouco exclui esteiras finalizadas/canceladas do conjunto usado pelo previsto.

Cada vínculo contribui uma vez, sem repetir por dia, sem rateio entre colaboradores e sem filtro de data. Vários colaboradores atribuídos à mesma atividade podem receber a contribuição integral no escopo agregado da jornada gerencial.

### Quantidade prevista ignorada neste caminho

- `my-activities.repository.ts:25-82` seleciona `step.planned_minutes`, **mas não seleciona `step.planned_quantity`**.
- `my-activities.service.ts:71-85` lê a quantidade ausente e aplica fallback 1; o total planejado também usa esse fallback.
- `server/src/shared/activityOperationalQuantity.ts:18-25,56-62` resolve quantidade ausente como 1.
- `operational-journey.service.ts:43-71,290-294` soma os totais vindos desse mapeamento.

Consequência estática demonstrada pelo encadeamento: uma atividade de 30 minutos/unidade e 4 unidades contribui **30**, não 120 minutos, para esse previsto. Os cartões também exibem o tempo unitário (`JornadaPage.tsx:125,154`). O tipo que declara quantidade e a existência de testes com quantidades preenchidas não compensam a coluna ausente na consulta real.

### Relação com publicação e remoção

O previsto não soma os minutos de `work_plan_items`. Distribuir vários dias, revisar ou republicar o plano não multiplica nem substitui o previsto da jornada. Remover somente um item do planejamento não remove sua alocação estrutural.

Reconferido: `server/src/modules/operational-planning/operational-planning.service.ts:1127-1190` e `server/src/modules/conveyor-operational-plan/conveyor-operational-plan.repository.ts:1044-1087` publicam/substituem a versão e reconciliam referências de origem/sincronização, sem transformar os minutos semanais em previsto da jornada nem remover essas atribuições diretas.

Alterar tempo ou vínculo na estrutura pode alterar o previsto. Inativar/remover atividade ou seus ancestrais também afeta essa soma. Encerrar apenas a atividade ou a esteira não garante sua retirada do previsto.

## Fonte do realizado

Evidências principais: `operational-journey.repository.ts:32-40,347-434`; `my-activities.repository.ts:46-52`; `server/src/modules/conveyors/conveyorAssignments.service.ts:782-923,1039-1176`; repositório de apontamentos gerenciais, atualização e soft-delete.

- Realizado no período: soma `conveyor_time_entries.minutes` do próprio colaborador com `entry_at` entre início/fim inclusivos e filtro opcional de esteira.
- Realizado total: mesma família de registros, sem recorte temporal.
- Realizado de cada atividade atribuída: soma cumulativa do próprio colaborador naquela atividade, sem período; esse universo alimenta cobertura, não o total global de todos os lançamentos.
- A **data de realização** é `entry_at`; `created_at` serve apenas como segundo critério de ordenação do histórico.
- Quantidade executada não multiplica nem divide minutos. Corrigir somente quantidade não altera o realizado.
- Entradas logicamente excluídas (`deleted_at`) não somam nem aparecem. Correções gerenciais alteram o valor corrente usado na próxima consulta.
- Apontamentos fora do plano ou sem vínculo direto atual podem somar e aparecer; não geram cartão de atribuição.
- Exclusão da própria atividade ou esteira exclui esses lançamentos do universo da consulta. Perder a atribuição ou inativar a atividade/ancestrais pode retirar o cartão/previsto e manter o histórico, se atividade e esteira não estiverem removidas.
- Extra Esteira não integra essas somas de atividades.

Não foram consultados dados reais de banco nem reproduzidos valores de um colaborador real; estas conclusões vêm dos filtros e mapeamentos executáveis no código.

## Cobertura: fórmula e significado

`computeCoberturaTempo(realizadoAcumuladoEscopo, plannedSum)` divide o tempo acumulado **nas atividades atualmente atribuídas** pelo previsto estrutural **dessas mesmas atribuições**. Não usa o realizado do período nem o acumulado global quando este inclui outras atividades.

Evidências: `operational-journey.service.ts:78-82,290-294,384-389`; `server/src/shared/coberturaTempo.ts:14-28`.

- Previsto menor ou igual a zero: razão nula, mesmo com realizado positivo.
- Realizado acima do previsto: razão pode exceder 1 (100%); não existe teto.
- Cálculo retorna razão sem arredondamento. O formatador percentual compartilhado usa `Math.round(ratio * 1000) / 10`, isto é, uma casa decimal percentual, suprimida quando desnecessária; razão nula vira “— (não aplicável)”.
- A cobertura é comparação temporal acumulada; não prova conclusão, quantidade executada ou cumprimento do plano de um período.
- A falha da quantidade prevista no caminho de alocações também afeta esse denominador.

**Minha Jornada não renderiza cobertura, saldo, diferença ou alerta de cobertura incompleta.** `JornadaPage.tsx` não lê `coberturaTempo` nem `signals.pendenciaTempo`. A Jornada Gerencial renderiza esse indicador (`JornadaColaboradorGestorPage.tsx:629-643`; formatador em `operationalSemantics.ts:67-70`).

## Extra Esteira

O serviço compartilhado calcula `extraTimeEntriesSummary` separadamente em `operational-journey.repository.ts:438-517`: datas de realização diárias pela referência de São Paulo, colaborador, entradas/descrições não removidas, total de minutos, quantidade de entradas e até três descrições.

As descrições são ordenadas por **minutos somados**, depois quantidade de entradas e nome, não apenas frequência. O filtro de esteira não se aplica a esses registros sem esteira.

Na **Minha Jornada**, esse resumo **não é renderizado**. Extra Esteira:

- não aparece na lista de apontamentos;
- não aparece em bloco separado;
- não soma no realizado de atividades ou na cobertura;
- não é um registro adicional oculto dentro do realizado mostrado.

Contorno documentado: conferir em Apontar horas → Extra esteira → Últimos apontamentos extra esteira; a gestão vê o resumo separado na Jornada por colaborador (`JornadaColaboradorGestorPage.tsx:603-625`). O achado do capítulo 7 foi reconfirmado, não copiado como regra de todas as telas.

## Lista, filtros e divergência dos totais

- A própria tela solicita `limit: 20` (`JornadaPage.tsx:263-280`). O serviço aceita limites entre 1 e 100, mas a tela não oferece essa escolha.
- Histórico: `entry_at DESC, created_at DESC LIMIT`; cada linha é um apontamento, sem agregação por dia/atividade, sem paginação ou Carregar mais.
- Totais não usam o limite. Exemplo documental: 25 registros de 10 minutos somam 250 minutos embora só 20 sejam listados.
- Período e filtro de esteira restringem total do período e histórico da mesma família de entradas; o acumulado conserva lançamentos fora do período.
- Cartões vêm das alocações atuais, e não de uma lista deduzida dos apontamentos. Trabalho fora da atribuição pode aparecer só no histórico.
- Alocações de esteiras finalizadas/canceladas contam no previsto e em `assignmentCount`, mas são excluídas de `assignmentsOpen` e não chegam às colunas.
- O seletor de esteira é deduzido das alocações/histórico carregados (`JornadaPage.tsx:341-352`), não de todas as esteiras com lançamentos. Uma esteira encerrada com registros anteriores aos 20 recentes pode somar no acumulado e não ser oferecida no filtro.
- Após filtrar, as opções podem se reduzir ao resultado; a escolha Todas ou a reabertura pelo menu reinicia o filtro. A seleção não é mantida no retorno da página direta Apontamento.
- Não há quantidade executada, notas, autor gerencial ou justificativas completas visíveis nesse histórico. Existem apenas selos Exceção/Fora de sequência com os textos legados como informação de apoio (`JornadaPage.tsx:611-638`).

## Pendências, conclusão e inconsistências exibidas

Evidências: `operational-journey.service.ts:137-171,325-332`; `server/src/shared/operationalBucket.ts`; `JornadaPage.tsx:125-178,313-336,360,470-579`.

| Elemento | Comportamento confirmado |
|---|---|
| Pendentes | Alocações de esteiras nos buckets elaboração/aguardando planejamento/em planejamento, se não em atraso |
| Em andamento | Buckets execução ou atraso, inclusive atraso de esteira que ainda não iniciou |
| Concluídas | Coluna vazia por construção: a tela recebe somente alocações abertas/em risco, já sem finalizadas/canceladas |
| Pendente (em aberto) | Conta cartões em Pendentes + Em andamento; não calcula tempo faltante |
| Esteiras em atraso | Conta alocações no bucket de atraso; não deduplica por esteira |
| “Concluída” no cartão | Renderizada quando o bucket não permite Apontar, inclusive em Pendentes; não é prova do status individual |
| Atividade COMPLETED/ABORTED em esteira aberta | Pode permanecer Em andamento, contar como pendente e manter Apontar clicável; gravação é recusada |
| Pendência de tempo | Calculada pelo serviço por previsto maior que realizado acumulado em alocações abertas, ordenada pela diferença, até 48 itens e contador do universo; **não exibida na Minha Jornada** |

Os buckets seguem situação/prazo da esteira, não status individual da atividade nem dia do plano. Alcançar cobertura não conclui atividade. Concluir sem novo tempo não cria entrada nem aumenta o realizado. Ausência de cartão/coluna não significa ausência de trabalho.

## Botão Apontar e efeito da página direta

`JornadaPage.tsx:86-94,125-178` abre `/app/apontamento/:stepNodeId?conveyorId=...&from=jornada`. A rota monta **ApontamentoPage**; o botão considera apenas bucket da esteira.

Reconferência de `src/features/colaborador/ApontamentoPage.tsx:64-78,159-184` e formulário:
- Valores iniciais: 30 minutos, quantidade 1 e hoje operacional de São Paulo, independentemente do período consultado.
- Carrega atividades das atribuições diretas atuais; vínculo perdido pode impedir carregar o formulário.
- Envia minutos, quantidade, observação e data; **não envia conclusão nem justificativa**.
- Após salvar navega para `/app/jornada`, montando nova consulta com padrão 7 dias e sem conservar o filtro.
- Não oferece campo para a justificativa eventualmente exigida, nem ação de concluir. VAL-002 foi reconfirmado.
- Observação não substitui a justificativa. O capítulo remete ao fluxo da gaveta Apontar horas do capítulo 7 para esses casos.
- O excesso de tempo previsto não cria regra de justificativa própria nesse fluxo web. Não foi transportada a regra do Modo Fábrica para a página direta.

O servidor continua rejeitando novos apontamentos em atividade concluída/dispensada ou em situação de esteira não permitida; botão visível não significa aprovação antecipada.

## Relação com Minha Fila e atualização

`server/src/modules/my-work-queue/my-work-queue.repository.ts:130-218` consulta itens do plano semanal publicado por dia e usa a responsabilidade do item, inclusive equipe. A jornada consulta as atribuições diretas estruturais e um período de realização, não esse plano.

`MyWorkQueuePage.tsx:227-232` começa no hoje local do dispositivo; Minha Jornada começa em 7 dias móveis, com datas pela referência operacional de São Paulo. Os recortes não são sincronizados.

A conclusão individual altera o grupo da Minha Fila, mas não a classificação da jornada enquanto a esteira continua aberta. Um apontamento gravado na fila entra na próxima consulta da jornada com sua data de realização; apenas concluir sem entrada não aumenta minutos.

Não existe polling, assinatura de eventos ou atualização por foco na jornada: somente montagem, alteração de filtros e ações Atualizar/Tentar novamente. Fechar a gaveta global não recarrega a jornada (`src/components/AppHeader.tsx:317-322`); o retorno da página direta a remonta. A documentação não promete atualização imediata de uma jornada já aberta.

## Diferenças essenciais para Jornada Gerencial

- Minha Jornada é própria, resolvida pelo vínculo da conta e sem permissão gerencial específica.
- Jornada Gerencial exige `collaborators_admin.view`, permite um ou vários colaboradores e não depende de vínculo da conta gestora para consultá-los.
- Ambas usam o mesmo serviço de cálculo, com mudança de escopo. A gerencial mostra cobertura, resumo de Extra Esteira e pendências de tempo; a própria omite esses blocos.
- Ambas as telas pedem os 20 últimos apontamentos; os limites não tornam os totais paginados.
- Consulta multi-colaborador: contrato de até 20 IDs. Exportação: contrato de até 50 IDs, porém seleção da tela continua limitada a 20; exportação não aplica o limite de 20 linhas e inclui quantidade e dados de Extra Esteira.
- A própria não oferece exportação. O capítulo 12 permanece pendente; não foi enriquecido.

Evidências: `server/src/modules/collaborators/collaborators.routes.ts`; `operational-journey.schemas.ts`, `operational-journey.controller.ts` e `operational-journey.service.ts:427-453`; `src/features/gestor/JornadaColaboradorGestorPage.tsx`.

## Mensagens e estados principais

| Estado | Mensagem/efeito real |
|---|---|
| Conta sem vínculo | “Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso.” |
| Intervalo incompleto | “Intervalo personalizado: indique início e fim.”; sem Tentar novamente até completar datas |
| Intervalo invertido | Consulta recusada pela validação de início/fim |
| Falha de consulta | Faixa de erro com mensagem normalizada e Tentar novamente; dados anteriores retirados |
| Carregamento | Skeleton inicial sem dados e Atualizando… no botão |
| Pendentes sem cartões | “Nada neste estado no recorte atual.” |
| Em andamento sem cartões | “Nenhuma atividade em execução neste recorte.” |
| Concluídas sem cartões | “Sem alocações concluídas listadas aqui — veja apontamentos abaixo.” |
| Histórico vazio | “Nenhum apontamento com data nesta janela. Experimente alargar o período ou apontar numa atividade em aberto.” |
| Recorte filtrado vazio | “Sem alocações ou apontamentos neste recorte. Experimente outro período ou remova o filtro de esteira.” |
| Atividade concluída ao salvar | “Esta atividade já está concluída operacionalmente; não é possível novo apontamento.” |
| Atividade dispensada ao salvar | “Esta atividade foi dispensada; não é possível novo apontamento.” |
| Atividade fora das atribuições atuais na página direta | “Esta atividade não consta nas suas alocações atuais. Volte a Minha fila ou abra a partir do painel.” |

A normalização transversal trata comunicação, sessão e acesso; não foi inventada uma mensagem própria da jornada para cada falha. Fontes: `JornadaPage.tsx`, `ApontamentoPage.tsx`, `src/lib/errors/sgpErrorContract.ts` e serviço de apontamentos.

## Divergências novas, bugs e incoerências

| Achado | Classificação / consequência |
|---|---|
| Quantidade planejada ausente na consulta de alocações | **Novo bug**, afeta previsto e cobertura das duas jornadas; soma tempo unitário mesmo com várias unidades |
| Coluna Concluídas sem fonte de alocações encerradas | **Novo bug de composição**, sempre vazia nesse caminho; contador/previsto podem incluir alocações omitidas |
| “Concluída” em cartão de Pendentes | **Novo rótulo incorreto**, deriva da ausência do botão, não da conclusão |
| Atividade concluída/dispensada em esteira aberta continua pendente e Apontar clicável | **Nova incoerência da jornada**, derivação ignora estado individual; servidor barra a gravação |
| “Esteiras em atraso” conta alocações | **Novo rótulo impreciso**, pode contar várias vezes a mesma esteira |
| Filtro de esteira baseado em cartões/histórico limitado | **Nova limitação**, opções podem omitir esteiras com histórico acumulado e se reduzir após filtrar |
| Extra Esteira recebido e não exibido | Reconfirmação específica da hipótese do capítulo 7; matriz antiga ensinava exibição nessa tela |
| Mês atual (UTC) em Minha Jornada | Reconfirmação e ampliação de VAL-017; mês efetivo de São Paulo |
| Justificativa ausente na ApontamentoPage | Reconfirmação de VAL-002/capítulo 7; acesso por Apontar da jornada sofre o mesmo defeito |
| Cabeçalho geral do manual ainda diz que capítulo 10 está pendente | Metadado preexistente desatualizado; preservado para respeitar edição somente do capítulo 11 |

Esses problemas não foram corrigidos na aplicação. Conclusões são sustentadas por auditoria estática; não houve execução visual nem reprodução com dados reais. O capítulo distingue funcionamento atual, limitações e contornos, sem transformar expectativa em regra.

## Correções objetivas da matriz técnica

- **JOR-001:** substituídas opções inexistentes Hoje/Semana por 7/15/30 dias, mês e personalizado.
- **JOR-003 e 45.6:** retiradas afirmações de Extra Esteira exibido na Minha Jornada; esclarecidas exclusão dos totais, resumo separado na gerencial e ordenação por minutos.
- **45.3:** total sem limite versus lista 20, tipos excluídos, alocações fechadas ausentes das colunas.
- **45.4:** previsto estrutural direto, sem plano/dia; omissão de quantidade e fallback unitário explicitados.
- **45.5:** universo correto do numerador/denominador, sem período, ausência na própria tela, acima de 100% e arredondamento.
- **45.7:** pendência de tempo calculada mas não exibida na própria; contador de cartões e inconsistências de conclusão.
- **VAL-017:** o catálogo com “Mês atual (UTC)” está efetivamente usado na Minha Jornada; fuso do mês permanece operacional de São Paulo.
- As demais seções da matriz, retornos históricos e capítulos anteriores não foram reescritos.

## Validações e execução

Comandos efetivamente executados nesta rodada, com resultado real:

| Comando / verificação | Resultado |
|---|---|
| `git fetch origin --prune` | OK; 28 referências remotas |
| `git rev-parse origin/docs/manual-usuario-sgp-cap10-minha-fila` | `673a65e613442b9b8c58c7a31d2401d04962a3c8` |
| `git rev-parse origin/docs/manual-usuario-sgp-cap11-minha-jornada` | `673a65e613442b9b8c58c7a31d2401d04962a3c8` (base, sem conteúdo) |
| `git merge-base --is-ancestor` nas 8 branches da cadeia | Todas ancestrais da base |
| `sha256sum` do patch extraído | `89900d58f7066512fd201758dca585d15d64586efc64e94cf05fccceca4c4a59` — confere com o declarado |
| `git apply --check` | Passou limpo nos quatro arquivos |
| `git apply --numstat` | Exatamente os quatro arquivos autorizados |
| `git apply` | Aplicado limpo; sem `--3way`, sem força |
| `git status --short` | Três modificados + o retorno como novo; nenhum arquivo inesperado |
| `git diff --check` (antes do commit) | Sem erro |
| `git diff --check <SHA_BASE>..HEAD` (depois do commit) | Sem erro |
| `git diff --name-only <SHA_BASE>..HEAD` | Somente os quatro arquivos autorizados |
| Working tree final | `clean` |

Validações editoriais automatizadas do capítulo 11 (linhas 1833–2029 do manual):

| Critério | Resultado |
|---|---|
| Seis blocos principais, na ordem exigida | Confirmado: Para que serve, Onde fica, Quem costuma ter acesso, Como fazer, O que esperar, Quando algo é bloqueado — contagem de `^## ` no capítulo = 6 |
| Marcador pendente no capítulo 11 | Nenhum |
| Marcadores de imagem | 1, dentro do máximo de 4 |
| Linguagem técnica proibida (`STEP`, endpoint, backend, migration, schema, repository, query, UUID, payload, enum, API, URL, http) | Nenhuma ocorrência |
| Conteúdo antes do capítulo 11 idêntico à base | `diff` das linhas 1–1832 contra a base: idêntico |
| Conteúdo do capítulo 12 em diante idêntico à base | `diff` base 1845→fim contra novo 2030→fim: idêntico |
| Capítulos pendentes preservados | 4, 6, 12, 14, 15, 16, 17, 18 e 19 seguem marcados; capítulo 11 saiu da lista |
| Capítulo 2 preservado | O marcador em 2.6 é a explicação do modelo, não um capítulo pendente; seção intacta |
| Matriz alterada somente nas correções informadas | Hunks restritos a JOR-001, JOR-003, 45.3, 45.4, 45.5, 45.6, 45.7 e VAL-017 |
| Retornos históricos e relatórios | Intactos; nenhum arquivo de `docs/ai/returns/` anterior tocado |

Não executado, e não alegado como executado:

- Build: **não executado**.
- Lint: **não executado**.
- Testes da aplicação: **não executados**. O teste citado em 45.4 foi apenas lido.
- Execução visual da aplicação, screenshots ou imagens geradas: **não realizados**.
- Consultas a banco de dados real: **não realizadas**. O exemplo de 30 min × 4 unidades é determinado pela leitura do código, não por execução.
- Regeneração de HTML ou PDF: **não realizada**.

Conforme o repasse, build/lint/testes não são obrigatórios nesta atividade documental, que não altera código. A checagem editorial é validação documental, não execução da suíte.

## Branches preservadas

Inventário remoto comparado antes e depois da publicação desta rodada: **28 referências**, e a única que mudou foi `origin/docs/manual-usuario-sgp-cap11-minha-jornada`, que saiu da base para o tip desta atividade. As 27 anteriores mantiveram seus SHAs. Destaques de governança:

| Branch | SHA preservado |
|---|---|
| `main` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `develop` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `homol` | `6b768c852a18b7428e3dadf761bad7e35c1d61ef` |
| `docs/auditoria-cobertura-funcional-manual-sgp` | `1a951e4e5f65a958bbf22fec64c79e915164c4ed` |
| `docs/manual-usuario-sgp-base-p0` | `eee4788c9ba2f8142ce035a4b5c6df39a697adbf` |
| `docs/manual-usuario-sgp-cap05-painel-operacional` | `310ba2f9d95e94f36528be507ff4080ab159e199` |
| `docs/manual-usuario-sgp-cap07-apontamentos` | `11a8fa0c49dec611c09b0dd766a378c8fd60c6d6` |
| `docs/manual-usuario-sgp-cap13-modo-fabrica` | `2a53f4572b7b71667ee8f30f36bdad5213988bb1` |
| `docs/manual-usuario-sgp-cap08-planejamento-semanal` | `aa8c3ad87bc221e08d2677b004af99b88c45be06` |
| `docs/manual-usuario-sgp-cap09-agenda-semana` | `1fc46bb26de5f4316556cb7c3b277cf07ee40eb8` |
| `docs/manual-usuario-sgp-cap10-minha-fila` | `673a65e613442b9b8c58c7a31d2401d04962a3c8` |

## Commit, publicação, riscos e próximo passo

- As alterações são exclusivamente documentais, restritas aos quatro arquivos autorizados, na branch do capítulo 11 baseada no tip correto do capítulo 10.
- Commit de conteúdo desta rodada: `050e22145098cc10e4b6025df18e28d002be2fdd`. Commit complementar de metadados (SHAs reais e estado de publicação): o próprio commit complementar de metadados, obtido pela referência da branch (`git rev-parse origin/docs/manual-usuario-sgp-cap11-minha-jornada`); não pode constar dentro de si, e foi informado na resposta da sessão. Nenhum amend, rebase, force-push ou reescrita de histórico.
- Publicação: `git push -u origin docs/manual-usuario-sgp-cap11-minha-jornada`, push normal, fast-forward a partir da base. Confirmada remotamente: o commit de conteúdo `050e2214` foi lido no GitHub em `refs/heads/docs/manual-usuario-sgp-cap11-minha-jornada` e seu detalhamento retornou exatamente os quatro arquivos autorizados (`SESSION_CHECKPOINT.md` 41/-49, retorno +391 como novo, `MANUAL_FUNCIONAL_SGP.md` 40/-23, `MANUAL_USUARIO_SGP.md` 191/-6), idênticos ao `git diff --numstat` local. O commit de metadados foi publicado no push seguinte, também fast-forward.
- Nenhum PR criado, nenhum merge, nenhuma branch excluída. `main`, `develop`, `homol` e toda a cadeia documental anterior intactas.
- Os SHAs da sessão de origem (`ff338e38…` como conteúdo e `b17cbbfe…` como tip local) **nunca foram publicados** e permanecem apenas como referência de auditoria. O conteúdo foi reproduzido pelo patch integral, verificado por SHA-256.

### Riscos e ressalvas

- O defeito de quantidade prevista (45.4) permanece **aberto no código**: previsto e cobertura subestimam atividades com quantidade maior que 1. O capítulo 11 e a matriz o documentam; nenhuma correção de aplicação foi feita, conforme escopo.
- O rótulo "Mês atual (UTC)" segue incorreto na interface (VAL-017), com cálculo em São Paulo. Pendente de decisão.
- A coluna Concluídas da Minha Jornada permanece estruturalmente vazia, e cartões podem exibir a situação da esteira como se fosse a da atividade. Documentado, não corrigido.
- Build, lint, testes e execução visual não foram executados nesta atividade documental.
- Capítulo 12 (Jornada Gerencial) **não** foi iniciado nem enriquecido, apesar do material gerencial levantado na auditoria.

### Próximo passo recomendado

1. Decisão humana sobre o defeito de quantidade prevista (45.4): corrigir o SELECT de `listActivitiesRawForCollaborator` para retornar `step.planned_quantity`, com teste cobrindo o caminho real de dados, em atividade de código própria — fora desta atividade documental.
2. Decisão humana sobre VAL-017 (rótulo do mês).
3. Capítulo 12 em atividade separada, usando esta branch publicada como base.
