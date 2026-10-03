# Retorno — `manual-usuario-sgp-cap13-modo-fabrica`

- **TASK_ID:** `manual-usuario-sgp-cap13-modo-fabrica`
- **Data/hora:** 2026-10-03 (UTC)
- **Status final:** concluída
- **Branch:** `docs/manual-usuario-sgp-cap13-modo-fabrica`
- **SHA base:** `11a8fa0c49dec611c09b0dd766a378c8fd60c6d6` — conferido contra `origin/docs/manual-usuario-sgp-cap07-apontamentos`, **idêntico ao esperado**
- **SHA final:** ver seção "Commit e push"
- **Working tree ao encerrar:** limpo

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | alterado — capítulo 13 escrito; três entradas novas no capítulo 21; cabeçalho de situação atualizado |
| `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` | alterado — **VAL-013 corrigido** (ver seção própria) |
| `docs/ai/returns/manual-usuario-sgp-cap13-modo-fabrica-retorno.md` | criado |

## Resumo do capítulo entregue

Capítulo 13 — Modo Fábrica, com os seis blocos editoriais do capítulo 2:

- **Para que serve** — canal de registro de produção no piso, separado do resto do sistema, com entrada por colaborador e PIN.
- **Onde fica** — as duas formas de acesso, como reconhecer cada uma, e a exigência de equipamento autorizado.
- **Quem costuma ter acesso** — colaborador operacional ativo com credencial liberada; tabela dos quatro estados de credencial e o que fazer em cada um.
- **Como fazer** — 13 sub-seções: escolher colaborador; digitar o PIN; criar o PIN; ler a fila; registrar apontamento; quando o sistema pede justificativa; concluir; concluir sem registrar tempo novo; Outra atividade; Extra Esteira; atualizar a fila; sair; e o que muda no navegador da fábrica.
- **O que esperar** — dependência do planejamento publicado; efeitos do registro; ausência de aviso sonoro; tabela comparando fila × Outra atividade × Extra Esteira; tabela totem × navegador; telas feitas para o piso.
- **Quando algo é bloqueado** — cinco tabelas de mensagens reais (entrar, criar PIN, fila vazia, apontamento recusado pela atividade, registro recusado, sessão caída).

Cinco marcadores de imagem, no limite permitido.

## Evidências principais de código

Reconferido no código em `11a8fa0c`.

| Tema | Evidência |
|---|---|
| Orquestração do totem (telas e transições) | `src/features/kiosk/KioskPage.tsx` |
| Seleção de colaborador | `src/features/kiosk/KioskCollaboratorGrid.tsx`; `src/features/production/ProductionSelectCollaboratorPage.tsx`; `src/domain/production/production.helpers.ts` |
| PIN e troca de PIN | `src/features/kiosk/KioskPinPad.tsx`; `src/features/kiosk/KioskChangePin.tsx`; `src/features/production/ProductionPinPage.tsx`; `src/features/production/ProductionChangePinPage.tsx`; `server/src/modules/production/production.schemas.ts` |
| Autenticação, tentativas e bloqueio | `server/src/modules/production/production-auth.service.ts`; `production-auth.repository.ts`; `server/src/config/env.ts` |
| Estados de credencial | `server/src/modules/production/production-credential-status.ts` |
| Autorização do equipamento | `server/src/modules/production/production-kiosk.middleware.ts` |
| Fila e cartões | `src/features/kiosk/KioskActivityCards.tsx`; `src/domain/production/kioskWorkQueueUi.ts`; `src/features/production/ProductionWorkQueuePage.tsx` |
| Origem da fila | `server/src/modules/production/production-work-queue.service.ts` → `server/src/modules/my-work-queue/my-work-queue.service.ts` |
| Regras de apontável/concluível | `server/src/modules/production/production-work-queue.rules.ts` |
| Cartão de apontamento do totem | `src/features/kiosk/KioskActivityCard.tsx`; `src/domain/production/kioskActivityCardLogic.ts` |
| Tempo previsto, cobertura e excesso | `src/domain/production/kioskActivityCardLogic.ts`; `server/src/modules/production/production-time-entries.service.ts` |
| Criação do apontamento de produção | `server/src/modules/production/production-time-entries.service.ts` |
| Outra atividade | `src/features/kiosk/KioskOutraAtividadeFlow.tsx`; `src/features/kiosk/kioskOutraAtividadeFlowLogic.ts` |
| Extra Esteira | `src/features/kiosk/KioskExtraEsteiraFlow.tsx`; `src/features/kiosk/kioskExtraEsteiraFlowLogic.ts` |
| Apontamento pelo navegador | `src/features/production/ProductionTimeEntryDialog.tsx` |
| Sessão, inatividade e saída | `server/src/modules/production/production-session-timeout.ts`; `production-auth.middleware.ts`; `src/layouts/ProductionShellLayout.tsx`; `server/src/config/env.ts` |
| Data de realização | `src/domain/operational/workDate.ts`; `src/components/ui/WorkDateField.tsx` |
| Justificativas | `src/domain/operational/timeEntryJustificationField.ts`; `src/components/operational/JustificationSelect.tsx` |
| Redefinição de PIN pelo gestor | `src/features/gestor/ColaboradoresPage.tsx`; `server/src/modules/admin-collaborators/admin-collaborators.repository.ts` |
| Mensagens de serviço | `src/services/production/productionApiService.ts` |

## Canais reais do Modo Fábrica

Dois, ambos ativos:

| Canal | Shell | Observação |
|---|---|---|
| **Totem** | `src/features/kiosk/*`, tela cheia (`fixed inset-0`, `select-none`, `touch-manipulation`) | canal completo da operação |
| **Navegador da fábrica** | `src/layouts/ProductionShellLayout.tsx` + `src/features/production/*` | recursos reduzidos; cabeçalho "SGP+ Produção" |

Nenhum dos dois é alcançável pelo menu do sistema; o equipamento abre direto na tela. O capítulo não ensina endereço nem rota.

## Fluxo de entrada

Totem: seleção de colaborador → PIN → (criação de PIN, se exigida) → fila. Sair encerra a sessão e volta à seleção.

A lista traz colaboradores operacionais ativos, em ordem alfabética, com foto, nome e equipe, e busca por nome. Cartões de quem não pode entrar aparecem com opacidade reduzida e, ao serem tocados, exibem o motivo — a seleção é recusada em qualquer estado diferente de credencial liberada.

Quando `PRODUCTION_KIOSK_TOKEN` está configurado no ambiente, as rotas públicas do Modo Fábrica exigem o cabeçalho de dispositivo; sem ele, a listagem falha com “Este dispositivo não está autorizado para o modo produção.”. Sem o token configurado, a rota fica aberta (dev/teste).

## Regras de PIN e divergência entre canais

**Divergência reconfirmada e ainda aberta (VAL-004):**

| Onde | Dígitos aceitos | Evidência |
|---|---|---|
| Totem — entrada e criação de PIN | **exatamente 4** | `PIN_LENGTH = 4` em `KioskPinPad.tsx` e `KioskChangePin.tsx` |
| Navegador da fábrica | **4 a 8** | “Digite um PIN de 4 a 8 dígitos.” em `ProductionPinPage.tsx` e `ProductionChangePinPage.tsx` |
| Servidor | **4 a 8** | `PIN_REGEX = /^\d{4,8}$/` em `production.schemas.ts` |

Efeito prático: um PIN de 5 a 8 dígitos é aceito no cadastro e no navegador, mas **não é digitável no totem**. O capítulo ensina a orientação segura — **usar sempre 4 dígitos** — e remete a pendência ao capítulo 21, sem “resolver” a divergência no texto.

Outras regras confirmadas: no totem a autenticação dispara automaticamente ao completar o quarto dígito, sem botão de confirmar. Tentativas erradas máximas: **5** por padrão (`PRODUCTION_PIN_MAX_FAILED_ATTEMPTS`). Bloqueio: **15 minutos** por padrão (`PRODUCTION_PIN_LOCKOUT_MINUTES`). Ambos configuráveis — o capítulo diz “tipicamente”, não apresenta como imutável. Login bem-sucedido zera o contador de falhas. O bloqueio é temporário (`locked_until`) e **expira sozinho**.

A redefinição de PIN pelo gestor grava o PIN inicial padrão, **habilita a credencial, zera as tentativas, limpa o bloqueio** (`locked_until = NULL`) e força a criação de novo PIN no próximo acesso. É, portanto, também o caminho de desbloqueio imediato — e o capítulo diz isso.

Não existe ação dedicada de “desbloquear” na tela de Colaboradores: o caminho é esperar ou redefinir o PIN.

## Primeiro acesso

O servidor devolve, no login, o indicador de troca obrigatória (`must_change_pin`), e o totem encaminha para a tela de criação. Dois passos: “Crie seu PIN de 4 dígitos” (*“Este será seu acesso pessoal ao Modo Fábrica”*) e “Confirme seu novo PIN” (*“Digite o mesmo PIN novamente para confirmar”*). Concluído, o colaborador cai direto na fila.

Erros: “Os PINs não coincidem. Tente novamente.”; “Escolha um PIN diferente do PIN inicial padrão.”; “Não foi possível alterar o PIN. Tente novamente.” (no navegador a mensagem equivalente é “Não foi possível alterar o PIN agora. Tente novamente.”).

Colaborador **sem credencial alguma** não cria PIN no totem: a seleção é recusada com “PIN não configurado. Solicite ao gestor.”. A criação só ocorre depois de o gestor provisionar.

## Estados de credencial

`resolveProductionCredentialStatus`: sem credencial → sem PIN configurado; credencial não habilitada → desabilitada; bloqueio futuro → bloqueada; caso contrário → liberada. O capítulo usa esses quatro conceitos em linguagem de usuário, sem os códigos.

## Fila e origem das atividades

A fila do Modo Fábrica reaproveita a fila do colaborador: **plano semanal publicado**, para a data de hoje, incluindo itens atrasados de dias anteriores. Sem plano publicado para a semana, a resposta é vazia.

Apontável (`resolveProductionCanTrackTime`) exige: atividade não concluída, não dispensada, item do plano não cancelado, planejada para o colaborador, e esteira em **A iniciar** ou **Em andamento**. Fora de sequência **continua apontável**, com justificativa. Concluível segue o mesmo critério.

Totem: carrossel (com arraste e flechas) ou lista agrupada em **Próxima atividade recomendada**, **Atenção à sequência** e **Demais atividades**. O carrossel abre na atividade recomendada e volta a ela após cada registro. Busca local por atividade, setor e tarefa.

Cartão exibe esteira, tarefa, setor, nome da atividade, “Realizado: N min · Planejado: N min”, o percentual de tempo previsto e as etiquetas de sequência.

Navegador: lista com filtros **Todas**, **Pendentes**, **Concluídas**.

## Campos de apontamento

**Totem:** data de realização (atalhos Hoje/Ontem, futuro bloqueado); tempo trabalhado por atalhos de **15/30/45/60 min** ou campo livre; **Evolução da atividade (nesta sessão)** de 0 a 100% em passos de 5; justificativa quando exigida; alternador **Concluir atividade ao registrar**. **Não há campo de quantidade.**

**Navegador:** data de realização; **Tempo apontado (minutos)** obrigatório, mínimo 1; **Quantidade executada**, mínimo 0; justificativa quando exigida; observação.

**Outra atividade:** busca (mínimo 2 caracteres), data, minutos (mínimo 1), observação, justificativa. Sem quantidade, sem evolução de sessão, sem conclusão.

**Extra Esteira:** descrição de catálogo, data, minutos (mínimo 1), observação (até 500 caracteres). Sem quantidade, sem justificativa, sem conclusão.

## Regra confirmada de quantidade

O totem **não registra quantidade**: o campo não existe no cartão e o envio não inclui o dado. O navegador da fábrica registra. Isso confirma **VAL-003** da matriz, que já estava correta — nenhuma correção foi necessária ali. O capítulo informa a ausência e indica onde registrar quantidade quando necessário.

## Regra confirmada de sequência

Idêntica em conceito à da área autenticada: atividade anterior pendente **não bloqueia**, exige justificativa. No totem aparece a faixa “Fora de sequência — confirme o apontamento”, a lista das atividades anteriores em aberto (tarefa · setor · atividade) e o aviso “Existem etapas anteriores pendentes. Informe uma justificativa para apontar.”.

O servidor exige justificativa com **pelo menos 3 caracteres** (`PRODUCTION_OUT_OF_SEQUENCE_JUSTIFICATION_MIN = 3`, máximo 500) e recusa com “Informe uma justificativa para executar esta atividade fora da sequência recomendada.”. O botão passa a “Registrar apontamento (exceção)”.

No navegador, o cartão desabilita “Apontar horas” com o aviso “Informe uma justificativa para apontar fora da sequência.”.

## Regra confirmada de tempo previsto e excedido — ponto crítico

**Ao contrário da área autenticada, no Modo Fábrica a regra existe e é exigida.** A rodada do capítulo 7 confirmou que não há aviso nem bloqueio por tempo acima do previsto na área autenticada; aqui há, nas duas camadas.

| Comportamento | Regra | Evidência |
|---|---|---|
| Percentual de cobertura exibido | `min(100, round(realizado ÷ previsto × 100))`, rotulado “Tempo previsto: N%” | `productionTimePlannedCoveragePct` / `productionTimePlannedCoverageLabel` |
| Aviso de previsto atingido | quando a atividade não está concluída, há previsto > 0 e **realizado ≥ previsto**: “Tempo previsto atingido. Marque como concluída para liberar a próxima atividade.” | `productionPlannedTimeReachedHint` |
| Exigência de justificativa | quando **realizado acumulado + minutos deste apontamento > previsto** | `kioskRequiresExcessTimeJustification` (tela) e `productionRequiresExcessTimeJustification` (servidor) |
| É bloqueio ou confirmação? | **não é bloqueio**: é confirmação com justificativa obrigatória | faixa “Tempo acima do previsto — confirme o apontamento” |
| Base do previsto | o tempo previsto do **item do plano semanal publicado** daquele colaborador na atividade | `resolveProductionExcessCheckPlannedMinutes` |
| Base do realizado | soma acumulada por atividade na esteira | `sumRealizedMinutesByStepForConveyor` |
| Quantidade interfere? | **não** — a regra olha só tempo | nenhuma referência a quantidade no cálculo |
| Mensagem do servidor | “Informe uma justificativa para apontar acima do tempo previsto da atividade.” | `TIME_ENTRY_EXCEEDED_PLANNED_JUSTIFICATION_MESSAGE` |
| Diferença entre apontar e concluir | a checagem é **ignorada** no fluxo de conclusão sem tempo novo (0 minutos + concluir) e quando minutos = 0 | `isCompletionOnly` em `serviceCreateProductionTimeEntry` |

Atingir o previsto **não conclui** a atividade: o sistema apenas avisa e sugere concluir. O capítulo afirma isso explicitamente.

## Conclusão de atividade

No totem, pelo alternador **Concluir atividade ao registrar**, que conclui na mesma operação do apontamento. Confirmação: “Apontamento registrado!” + “Atividade concluída. Avançando…”.

Conferência adicional: marcar para concluir com a evolução da sessão **abaixo de 80%** abre o diálogo “Confirmar conclusão?” — *“Você marcou como concluída, mas indicou apenas N% de progresso nesta sessão. Confirma mesmo assim?”* — com **Confirmar** e **Cancelar**. Não impede.

**Conclusão sem novo tempo:** 0 minutos + conclusão marcada é aceito e representa encerrar a atividade quando o tempo já foi apontado antes. Nesse fluxo **não é criada linha de apontamento**; a rastreabilidade fica no status de conclusão do nó e no evento de conclusão. Detalhe tratado em VAL-013, corrigido nesta rodada.

Reabrir não é possível pelo Modo Fábrica.

No **navegador da fábrica não é possível concluir**: o botão **Concluir etapa** está permanentemente desativado, com o título “Disponível na próxima etapa”.

## Outra atividade

Aparece sempre no cabeçalho da fila do totem, como **+ Outra atividade**. Busca com **mínimo de 2 caracteres**, limite de 20 resultados, incluindo atividades fora da alocação do colaborador — por isso a justificativa é exigida. Campos: data, minutos (mínimo 1), observação, justificativa. Revisão com Colaborador, Atividade, Contexto, Data de realização, Minutos, Observação e Justificativa, e botão **Confirmar apontamento**. Não conclui e não registra quantidade. Estados: “Digite ao menos 2 caracteres…”, “Buscando…”, “Nenhuma atividade encontrada.”.

## Extra Esteira

**+ Extra esteira** no cabeçalho da fila do totem. Descrição de catálogo obrigatória (placeholder “Selecione uma descrição...”), data, minutos (atalhos ou livre, mínimo 1), observação até 500 caracteres. Revisão com Colaborador, Tipo, Descrição, Data, Minutos e Observação. Sem quantidade, sem justificativa, sem conclusão. Falha de catálogo: “Não foi possível carregar as descrições.”. Catálogo vazio não exibe mensagem própria: o seletor fica apenas com o placeholder e o envio não libera — o capítulo descreve exatamente isso.

Comparado ao capítulo 7: mesmo contrato de dados (descrição, data, minutos, observação) e mesmas regras de mínimo e de data não futura; o placeholder difere entre canais (“Selecione uma descrição...” no totem, “Selecione um motivo...” na área autenticada).

## Botão Atualizar

Existe **no cabeçalho da fila do totem** (`KioskActivityCards.tsx`), rotulado **Atualizar**, com estado **Atualizando…** e rótulo acessível “Atualizar atividades”.

O que faz: recarrega **apenas a fila de atividades**. Não mexe na sessão, não exige PIN de novo e não recarrega dados de credencial. Falha vira aviso com a mensagem do erro — “Não foi possível carregar suas atividades.” no caso genérico — e a fila anterior permanece na tela.

Após cada apontamento a fila já é recarregada automaticamente, inclusive reposicionando o carrossel na atividade recomendada.

No navegador da fábrica **não há Atualizar na tela da fila**; existe um **Atualizar** apenas na tela de escolha do colaborador.

## Mensagens e toasts

Todas verificadas literalmente e usadas no capítulo. Entrada: “PIN não configurado. Solicite ao gestor.”, “Acesso bloqueado. Solicite ao gestor.”, “Acesso desabilitado.”, “Acesso indisponível.”, “PIN inválido. Tente novamente.”, “PIN inválido ou acesso não habilitado.”, “Não foi possível entrar agora. Tente novamente mais tarde.”, “Este dispositivo não está autorizado para o modo produção.”, “Não foi possível carregar os colaboradores.”, “Nenhum colaborador encontrado para essa busca.”, “Nenhum colaborador ativo encontrado.”. No navegador: “PIN ainda não configurado. Solicite ao gestor.”, “Acesso bloqueado por tentativas incorretas. Solicite ao gestor.”, “Acesso de produção desabilitado. Solicite ao gestor.”.

PIN: “Crie seu PIN de 4 dígitos”, “Confirme seu novo PIN”, “Este será seu acesso pessoal ao Modo Fábrica”, “Digite o mesmo PIN novamente para confirmar”, “Os PINs não coincidem. Tente novamente.”, “Escolha um PIN diferente do PIN inicial padrão.”, “Não foi possível alterar o PIN. Tente novamente.”, “Digite um PIN de 4 a 8 dígitos.”, “Confirme o PIN com 4 a 8 dígitos.”.

Fila e cartão: “Nenhuma atividade disponível no momento.”, “Nenhuma atividade encontrada para essa busca.”, “Nenhuma atividade planejada para você no momento.”, “Confirme com o gestor se o planejamento da fábrica já foi publicado.”, “Nenhuma atividade para este filtro.”, “Tempo previsto: N%”, “Tempo previsto atingido. Marque como concluída para liberar a próxima atividade.”, “Atividade concluída”, “Apontamento bloqueado para esta atividade”, “Esta atividade já foi concluída operacionalmente.”, “Apontamento não disponível para esta atividade no momento.”, “Esta atividade já foi concluída.”, “Informe uma justificativa para apontar fora da sequência.”, “Apontamento indisponível para esta atividade.”.

Exceções: “Fora de sequência — confirme o apontamento.”, “Existem etapas anteriores pendentes. Informe uma justificativa para apontar.”, “Tempo acima do previsto — confirme o apontamento.”, “Este apontamento ultrapassa o tempo planejado da atividade. Informe uma justificativa para registrar.”, “Para apontar fora de sequência e acima do tempo previsto, informe o motivo.”, “Para apontar acima do tempo previsto, informe o motivo.”, “Para apontar mesmo assim, informe o motivo.”, “A justificativa deve ter pelo menos 3 caracteres.”, “Informe uma justificativa para apontar acima do tempo previsto da atividade.”, “Informe uma justificativa para executar esta atividade fora da sequência recomendada.”.

Registro: “Apontamento registrado!”, “Atividade concluída. Avançando…”, “Avançando para a próxima atividade…”, “Data de realização: …”, “Confirmar conclusão?”, “Registrar apontamento”, “Registrar apontamento (exceção)”, “Confirmar apontamento”, “Não foi possível registrar o apontamento.”, “Não foi possível carregar suas atividades.”, “Apontamento registrado.” (navegador), “Sessão de produção inválida ou expirada.”.

## Efeito sonoro: não existe

Busca por `Audio`, `audio`, `beep`, `sound`, `Howl` e `play()` em `src/features/kiosk`, `src/features/production` e `src/domain/production`: **zero ocorrências**. A confirmação é **apenas visual** — visto verde e “Apontamento registrado!”, por cerca de três segundos antes de a fila recarregar. O capítulo afirma explicitamente que não há som, conforme pedido. Não foi assumida a existência com base no histórico do projeto.

## Sessão e saída

Saída manual pelo botão **Sair**, presente nos dois canais. No totem encerra a sessão e volta à tela de seleção; falha no encerramento remoto não impede o retorno à seleção.

Expiração automática: por inatividade e por duração total, verificadas a cada requisição autenticada. Padrões: **30 minutos** de inatividade (`PRODUCTION_SESSION_IDLE_TIMEOUT_MINUTES`, 1 a 1440) e **12 horas** de duração absoluta (`PRODUCTION_SESSION_ABSOLUTE_TIMEOUT_HOURS`, 1 a 168). A atividade do colaborador renova o marcador de última atividade.

Proteção contra uso da sessão de outra pessoa: o colaborador vem **da sessão**, nunca do corpo da requisição, e a sessão é por equipamento. O capítulo trata isso como instrução operacional direta — sair sempre ao terminar, porque enquanto a sessão estiver aberta o registro sai no nome de quem entrou.

## Diferenças entre totem e navegador

Comparadas no capítulo somente onde há diferença real:

| Ponto | Totem | Navegador |
|---|---|---|
| título | SGP · Modo Fábrica | SGP+ Produção |
| PIN | exatamente 4, entra ao completar | 4 a 8, com confirmação |
| fila | carrossel ou lista agrupada, com busca | lista com filtros Todas/Pendentes/Concluídas |
| quantidade executada | não existe | existe |
| evolução da sessão | existe | não existe |
| concluir atividade | sim | **não** (botão desativado) |
| Outra atividade | sim | não |
| Extra Esteira | sim | não |
| Atualizar na fila | sim | não |
| data de realização | sim | sim |
| justificativa | sim | sim |
| Sair | sim | sim |

## Divergências novas encontradas

### 1. VAL-013 estava factualmente errada — matriz corrigida

Ver a seção “Alteração na matriz técnica”, adiante.

### 2. Validação de tela mais permissiva que a do servidor (0 minutos)

`canSubmitKioskProductionTimeEntry` só bloqueia o envio quando minutos, percentual de sessão **e** conclusão estão todos em zero/desligado. Como o percentual inicia no último valor registrado da atividade (`resolveKioskInitialSessionCompletionPct`), um colaborador pode abrir um cartão já com percentual > 0, tocar em registrar sem escolher o tempo, e receber erro do servidor (“minutes deve ser maior que zero.”) em vez de ver o botão desabilitado. Situação alcançável. Registrada em VAL-013 e refletida no capítulo como orientação (“informe o tempo, ou ligue a conclusão”).

### 3. “Voltando ao Kiosk…” — nome interno na tela do colaborador

Após registrar por **Outra atividade** ou **Extra Esteira**, o totem exibe “Voltando ao Kiosk…”. É o nome interno aparecendo para o usuário. Registrado no capítulo 21; o capítulo 13 não adota o termo.

### 4. Cabeçalhos com nomes diferentes para o mesmo canal

O totem exibe “SGP · Modo Fábrica”; o navegador da fábrica exibe “SGP+ Produção”. Mesmo canal, dois nomes. Registrado no capítulo 21. O capítulo 13 cita “SGP+ Produção” apenas como texto de tela, para o usuário reconhecer o equipamento.

### 5. “Concluir etapa” permanentemente desativado no navegador

Botão visível e sem função, com o título “Disponível na próxima etapa”. Registrado no capítulo 21, junto aos demais controles sem funcionamento.

### 6. Placeholder de Extra Esteira diferente entre canais

“Selecione uma descrição...” no totem e “Selecione um motivo...” na área autenticada, para o mesmo catálogo. Divergência menor; registrada aqui, sem ampliar o capítulo 21.

### 7. Ausência de ação de desbloqueio dedicada

Não há botão de “desbloquear credencial” na tela de Colaboradores. O desbloqueio acontece pela expiração do prazo ou como efeito colateral da redefinição de PIN. Funciona, mas não é óbvio para quem dá suporte — o capítulo explica os dois caminhos.

## Bugs e incoerências de produto

1. Validação de 0 minutos na tela mais permissiva que no servidor (item 2 acima).
2. Nome interno “Kiosk” visível ao colaborador (item 3).
3. Dois nomes para o mesmo canal (item 4).
4. Controle sem função visível no navegador (item 5).
5. Divergência de PIN entre canais, já conhecida (VAL-004), reconfirmada.
6. Mensagem de redefinição de PIN que diz “nova senha” — pendência já registrada em rodada anterior, reconfirmada neste código.

Nenhuma foi corrigida: a rodada é documental.

## Alteração na matriz técnica

**Afirmação anterior (VAL-013):** *“A lógica do Kiosk permite prosseguir com 0 minutos quando, por exemplo: o colaborador marca a atividade como concluída; ou informa percentual de sessão diferente de zero.”* — tratando os dois casos como aceitos, e pedindo confirmar se a diferença é deliberada.

**Evidência de código:** em `server/src/modules/production/production-time-entries.service.ts`, `serviceCreateProductionTimeEntry` recusa `minutes === 0` quando `markAsDone !== true`, com “minutes deve ser maior que zero.”. Logo, 0 minutos **com percentual de sessão e sem conclusão é recusado**, não aceito. O caso aceito — 0 minutos **com** conclusão — é deliberado e documentado no JSDoc da própria função, que explica o fluxo de conclusão sem novo tempo, a ausência de linha em `conveyor_time_entries` por causa da constraint `chk_conveyor_time_entries_minutes_positive`, e a rastreabilidade por status do nó e evento de conclusão.

**Correção aplicada:** VAL-013 reescrita com tabela das três combinações (tela × servidor × resultado real), marcada como **parcialmente resolvida** — o fluxo de conclusão sem tempo novo é deliberado e não depende de decisão —, com a pendência remanescente delimitada à inconsistência de validação da tela. Legenda de status da seção 49 e lista de correções do cabeçalho atualizadas.

Nenhuma outra afirmação da matriz sobre Modo Fábrica se mostrou errada. Conferidas e **corretas**: KSK-005 (justificativa por excesso de tempo), 44.11 (percentual limitado a 100%), 44.12 (mensagem de previsto atingido), 44.7 (4 dígitos no totem), 44.8 (estados de credencial), 44.9 (5 tentativas / 15 minutos, configuráveis), 44.10 (30 minutos / 12 horas, configuráveis), 44.13 (justificativa no totem), VAL-003 (quantidade ausente no totem e presente no navegador) e VAL-004 (divergência de PIN).

## Validações executadas

| Validação | Resultado |
|---|---|
| `git fetch origin --prune` | OK |
| SHA base conferido | idêntico ao esperado |
| `git status --short` | 2 arquivos de `docs/manual/source/` modificados, antes de criar este retorno |
| `git diff --check` | **sem avisos** (exit 0) |
| `git diff --name-only 11a8fa0c..HEAD` | somente os 3 arquivos permitidos, todos em `docs/` |
| Nenhuma alteração fora de `docs/` | confirmado |
| Marcador pendente no capítulo 13 | **ausente** |
| Capítulos 5 e 7 permanecem completos | sim — os três capítulos com conteúdo final (5, 7, 13) mantêm os seis blocos |
| Capítulos pendentes | 14 marcadores: capítulos 4, 6, 8 a 12 e 14 a 19 (13 capítulos), mais a citação do próprio marcador na seção 2.6 |
| Termos técnicos no capítulo 13 | `STEP` 0 · `endpoint` 0 · `backend` 0 · `migration` 0 · `schema` 0 · `repository` 0 · `query` 0 · `UUID` 0 · `payload` 0 · códigos internos de estado 0 · nomes de permissão 0 · `API` 0 |
| `Kiosk` e `Produção Web` no capítulo 13 | **0 ocorrências de ambos**. Aparece “SGP+ Produção” 2 vezes, nas duas como texto literal do cabeçalho do navegador, para reconhecimento do equipamento |
| Seis blocos editoriais no capítulo 13 | todos presentes |
| Marcadores de imagem no capítulo 13 | 5 (limite respeitado) |
| `STEP` no arquivo inteiro | 2 ocorrências, ambas nas linhas declaradas dos capítulos 20 e 21 |
| Busca por efeito sonoro | zero ocorrências em todo o código do Modo Fábrica |

**Nenhuma tela foi executada ou observada visualmente.** Toda a análise foi feita por leitura de código, migrations e testes do repositório.

**Build, lint e testes da aplicação: não executados.** Tarefa documental; nenhum arquivo sob build, lint ou teste foi tocado. Nenhum resultado de pipeline é alegado.

## Confirmação de branches e não alteração

Verificado por `git diff --name-only` contra a base: **não** foram alterados `src/`, `server/`, migrations, testes, CSS, assets, `package.json`, `app-version.json`, HTML/PDF do manual nem o relatório histórico da auditoria. Nenhum defeito encontrado foi corrigido — apenas documentado.

Branches preservadas, conferidas após o push:

| Branch | SHA |
|---|---|
| `origin/main` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `origin/develop` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `origin/homol` | `6b768c852a18b7428e3dadf761bad7e35c1d61ef` |
| `origin/docs/auditoria-cobertura-funcional-manual-sgp` | `1a951e4e5f65a958bbf22fec64c79e915164c4ed` |
| `origin/docs/manual-usuario-sgp-base-p0` | `eee4788c9ba2f8142ce035a4b5c6df39a697adbf` |
| `origin/docs/manual-usuario-sgp-cap05-painel-operacional` | `310ba2f9d95e94f36528be507ff4080ab159e199` |
| `origin/docs/manual-usuario-sgp-cap07-apontamentos` | `11a8fa0c49dec611c09b0dd766a378c8fd60c6d6` |

## Pendências de produto desta rodada

1. Alinhar a validação de 0 minutos da tela à do servidor no totem.
2. Substituir “Voltando ao Kiosk…” por linguagem de usuário.
3. Padronizar o nome do canal nos dois cabeçalhos.
4. Resolver o botão “Concluir etapa” desativado no navegador da fábrica — habilitar ou remover.
5. Padronizar a regra de PIN entre totem, navegador e cadastro (VAL-004).
6. Unificar o placeholder do catálogo de Extra Esteira entre canais.
7. Avaliar uma ação explícita de desbloqueio de credencial na tela de Colaboradores.

Pendências das rodadas anteriores seguem abertas, sem alteração.

## Commit e push

- Commit: `docs(manual): escreve capítulo 13 — Modo Fábrica`
- Branch remota: `origin/docs/manual-usuario-sgp-cap13-modo-fabrica`
- PR: não criado. Merge: não realizado. Force-push: não realizado. Nenhuma branch excluída.
- SHA final: `<preenchido no commit de registro>`

## Uso de contexto / sessão

`Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.`

`SESSION_CHECKPOINT.md` não foi atualizado: não houve handoff e a atividade foi concluída nesta sessão.
