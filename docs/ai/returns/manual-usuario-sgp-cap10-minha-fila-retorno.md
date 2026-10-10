# Retorno — `manual-usuario-sgp-cap10-minha-fila`

- **TASK_ID:** `manual-usuario-sgp-cap10-minha-fila`
- **Data/hora:** 2026-10-03 (UTC)
- **Objetivo:** enriquecer o capítulo 10 — Minha Fila do manual do usuário, substituindo o marcador pendente por capítulo operacional completo, fiel ao código atual.
- **Status final:** concluído.
- **Branch:** `docs/manual-usuario-sgp-cap10-minha-fila`
- **SHA base:** `1fc46bb26de5f4316556cb7c3b277cf07ee40eb8` (tip de `origin/docs/manual-usuario-sgp-cap09-agenda-semana`, exatamente o esperado pelo prompt)
- **SHA final:** registrado na seção *Commit e push*.
- **Natureza:** atividade exclusivamente documental. Nenhuma alteração em `src/`, `server/`, migrations, testes, CSS, assets, HTML ou PDF.

---

## 1. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | capítulo 10 reescrito; capítulo 21 corrigido e ampliado |
| `docs/ai/returns/manual-usuario-sgp-cap10-minha-fila-retorno.md` | criado (este arquivo) |

Nenhum outro arquivo criado, alterado ou removido. `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` **não** foi alterado (justificativa na seção 18).

---

## 2. Resumo do capítulo entregue

Capítulo 10 com os seis blocos editoriais obrigatórios:

1. **Para que serve** — a fila como ponto em que o planejamento vira trabalho; o que ela não é; relação com o Modo Fábrica.
2. **Onde fica** — menu **Colaborador → Minha fila**; títulos e avisos de origem literais.
3. **Quem costuma ter acesso** — todos os usuários autenticados; o vínculo conta↔colaborador é o que decide se há conteúdo.
4. **Como fazer** — origem da fila, por que algo não apareceu, data de trabalho, painel de números, grupos, próxima recomendada, leitura do cartão, o que o cartão não mostra, capacidade, apontar, justificativas, concluir, abrir esteira.
5. **O que esperar** — quando a tela atualiza, o que a fila reflete e o que ignora, atividade dispensada, estados vazios.
6. **Quando algo é bloqueado** — vínculo, falhas de carga, bloqueios de apontamento/conclusão, comparação com o Modo Fábrica.

4 marcadores `[IMAGEM SUGERIDA: ...]` (limite do prompt): visão geral da fila, cartão recomendado, aviso de capacidade, gaveta de apontamento.

---

## 3. Evidências principais (código consultado)

| Tema | Evidência |
|---|---|
| página e estados de tela | `src/features/my-work-queue/MyWorkQueuePage.tsx` |
| candidato de apontamento e ordenação de apoio | `src/features/my-work-queue/myWorkQueueUi.ts` |
| contrato de dados da fila | `src/domain/my-work-queue/my-work-queue.types.ts` |
| serviço da fila | `server/src/modules/my-work-queue/my-work-queue.service.ts` |
| elegibilidade e janela de datas | `server/src/modules/my-work-queue/my-work-queue.repository.ts` |
| ordenação de exibição | `server/src/modules/my-work-queue/work-queue-prioritization.ts` |
| sequência, recomendação e bloqueios | `server/src/modules/my-work-queue/work-queue-sequence-presentation.ts`, `work-queue-sequence-for-collaborator.ts` |
| sequência estrutural da esteira | `server/src/modules/conveyors/conveyorActivitySequence.logic.ts`, `stepOperationalStatus.ts` |
| gaveta de apontamento/conclusão | `src/features/shell/QuickTimeEntryDrawer.tsx`, `quickTimeEntryDrawerLogic.ts`, `QuickTimeEntryCandidateActions.tsx` |
| regras de data de realização | `src/domain/operational/workDate.ts`, `src/components/ui/WorkDateField.tsx` |
| validações do apontamento no servidor | `server/src/modules/conveyors/conveyorAssignments.service.ts`, `conveyorOperationalStatus.ts` |
| capacidade diária | `server/src/modules/operational-settings/operational-settings.service.ts` / `.repository.ts` |
| plano publicado, revisão e republicação | `server/src/modules/operational-planning/operational-planning.service.ts`, `operational-planning.week.ts` |
| Modo Fábrica (comparação) | `server/src/modules/production/production-work-queue.service.ts`, `production-work-queue.rules.ts`, `src/features/production/ProductionWorkQueuePage.tsx`, `src/features/kiosk/KioskActivityCard.tsx` |
| menu, rota e rótulo da página | `src/lib/shell/app-nav-config.ts`, `src/routes/AppRoutes.tsx`, `src/lib/page-meta.ts` |
| mensagens de erro de carga | `src/lib/errors/sgpErrorContract.ts`, `src/lib/errors/SgpErrorPresentation.tsx` |

---

## 4. Fonte real da fila

Confirmado no serviço e no repositório:

1. a data escolhida define a **semana operacional** (segunda a sexta, `mondayOfWeekContaining`);
2. busca-se **um** plano daquela semana com situação publicada, não excluído, ordenado pela publicação mais recente;
3. os itens vêm desse plano, filtrados por **`assigned_collaborator_id` = colaborador da sessão**.

Pontos confirmados:

- **usa somente versão publicada.** Rascunho e revisão nunca entram — o filtro de situação do plano está tanto na busca do plano quanto na consulta dos itens.
- **identificação do colaborador:** pelo vínculo conta de acesso → cadastro de colaborador.
- **sem vínculo:** resposta vazia + motivo literal *"Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso."* — exibido em faixa amarela, sem bloquear a tela.
- **a fila é nominal, não por alocação.** O que coloca o item na fila é o nome gravado no planejamento; a alocação na estrutura da esteira só define se haverá exigência de justificativa (`is_assigned_to_me`, derivado de alocação individual ou por equipe ativa).
- **itens planejados apenas para equipe não chegam à fila.** O esquema de salvamento do planejamento exige colaborador individual, então hoje isso não ocorre na prática.

### Modo Fábrica usa a mesma fonte?

**Sim, com um filtro adicional.** `serviceGetProductionWorkQueue` chama o mesmo `serviceGetWorkQueueForCollaborator`, acrescentando a restrição de situação do item de plano a `['PLANNED']`, e depois enriquece com tempo realizado, tempo pendente e percentual da última sessão. Não é composição diferente — é a mesma fila com filtro mais estreito e mais dados.

---

## 5. Dependência do plano publicado — reconferência dos capítulos 8 e 9

As quatro afirmações dos capítulos 8 e 9 foram **confirmadas no código**:

| Afirmação | Resultado | Evidência |
|---|---|---|
| item só chega após publicação | **confirmada** | fila lê apenas plano publicado |
| revisão não publicada não altera a fila | **confirmada** | ao salvar sobre semana publicada, `serviceSaveOperationalWeekPlan` cria um **novo plano rascunho** semeado a partir do publicado (`seedDraftFromPublishedPlan`); o publicado não é tocado |
| remoção em revisão não some da fila até republicar | **confirmada** | mesma mecânica: a remoção ocorre no rascunho |
| republicação substitui o que o colaborador vê | **confirmada** | `servicePublishOperationalWeekPlan` exclui logicamente o plano publicado anterior e seus itens antes de publicar o novo |

Nenhuma correção foi necessária nos capítulos 8 e 9.

---

## 6. Elegibilidade de atividades

Entra na fila o item que satisfaz **todas** as condições:

| Dimensão | Regra confirmada |
|---|---|
| plano | publicado, não excluído, da semana da data escolhida |
| item do plano | não excluído e situação **diferente de cancelada** (ou seja, planejada e movida entram na Minha Fila) |
| colaborador | item gravado para o colaborador da sessão |
| esteira | não excluída. **Não há filtro por situação operacional da esteira na consulta** — esteira em elaboração, em planejamento, finalizada ou cancelada continua gerando cartão; o bloqueio aparece depois, no apontamento |
| atividade | ativa, não excluída, do tipo atividade |
| ancestrais | tarefa e setor ativos e não excluídos — atividade sob setor/tarefa inativados **desaparece** da fila |
| data | igual à data escolhida; **ou** anterior à data escolhida, ainda pendente, e dentro da janela segunda–sexta do mesmo plano |
| situação da atividade | concluída e dispensada entram no agrupamento de concluídas **no dia planejado**; em datas anteriores são excluídas pela consulta |

Consequência relevante e não óbvia: **atraso não atravessa semanas.** Como a janela de datas é limitada ao intervalo do plano da semana consultada, pendência da semana anterior não aparece como atrasada na semana seguinte. Documentado no capítulo em linguagem de usuário.

Diferença Minha Fila × Modo Fábrica nesta dimensão: a Minha Fila aceita item com situação **movida**, o Modo Fábrica não. Hoje nenhum caminho de código grava essa situação (todos os itens nascem planejados), então é divergência **latente**, não visível. Não foi levada ao manual.

---

## 7. Verificação crítica — atividade dispensada

**Resultado: o entendimento anterior estava incorreto e foi corrigido.**

Os capítulos 8/9 e o capítulo 21 registravam que a atividade dispensada *"não aparece"* na fila do colaborador nem no Modo Fábrica. A reconferência no serviço da Minha Fila mostra outro comportamento:

| Pergunta do prompt | Resposta confirmada |
|---|---|
| a dispensada aparece como executável? | **não** — o servidor marca o item como não apontável, com motivo de bloqueio próprio |
| aparece em algum agrupamento? | **sim** — no agrupamento **Concluídas**, no dia para o qual foi planejada |
| aparece como concluída? | **não exatamente** — o selo **Concluída** depende de conclusão operacional, que a dispensa não produz. O cartão fica em **Concluídas** **sem selo** |
| some completamente? | **não** no dia planejado. **Sim** em datas anteriores: a consulta de atrasadas exclui concluída e dispensada |
| conta em totais/capacidade? | **sim** — soma em **Atividades de hoje**, em **Minutos planejados** e no cálculo do aviso de capacidade do dia |
| cria divergência visível? | **sim**, e maior que o previsto (abaixo) |

### Divergência visível nova

Na Minha Fila o botão **Apontar horas** é desabilitado **apenas** por conclusão operacional (`disabled={item.isActivityCompleted}`). A página **não consulta** `canPointTime` nem `blockingReason`. Para uma atividade dispensada:

- o botão permanece **clicável**;
- a gaveta abre normalmente;
- o registro só é recusado **ao salvar**, com *"Esta atividade foi dispensada; não é possível novo apontamento."* (conflito 409, exibido como texto de erro no formulário).

No Modo Fábrica o mesmo caso é tratado antes: a regra de produção bloqueia explicitamente a situação dispensada e o cartão exibe *"Apontamento bloqueado para esta atividade"* / *"Apontamento não disponível para esta atividade no momento."*, sem botão.

### Efeito no capítulo 21

O alcance mudou, então o anexo foi corrigido com evidência (ver seção 17).

---

## 8. Regras de data

| Pergunta | Resultado |
|---|---|
| data padrão | hoje, pela data local do dispositivo (`todayIsoLocal` na página) |
| navegação | **Dia anterior**, campo de calendário, **Próximo dia**, **Hoje** |
| limites | **nenhum** — o campo da fila não tem data máxima; **data futura é navegável** |
| dias sem planejamento | estado vazio, com texto que depende de haver ou não plano publicado na semana |
| semana | segunda a sexta; sábado resolve para a segunda da mesma semana e domingo para a segunda da semana anterior — nos dois casos não há atividade do próprio dia, apenas atrasadas da semana correspondente |
| fuso operacional | a **fila** usa a data local do dispositivo; o **apontamento** usa a data civil de São Paulo |
| rótulos hoje/ontem | **não existem na fila**. A fila mostra a data por extenso (*"segunda-feira, 06 de out."*). Os atalhos **Hoje** / **Ontem** são da gaveta de apontamento |
| apontamento retroativo pela fila | **sim** — a data é escolhida na gaveta, sem limite para o passado; data futura é recusada |

Ponto de atenção confirmado e documentado: a gaveta aberta pelo cartão **sempre inicia a data de realização em hoje**, mesmo quando a fila está exibindo um dia anterior (`startForm` reinicia `workDate` com a data operacional corrente). A data da fila **não** é herdada.

As regras do capítulo 7 não foram assumidas: foram reconferidas em `src/domain/operational/workDate.ts` e no `WorkDateField`.

---

## 9. Agrupamentos

Três grupos reais, nesta ordem, renderizados apenas quando têm conteúdo:

| Grupo | Rótulo literal | Critério | Contagem na tela |
|---|---|---|---|
| atrasadas | **Atrasadas** | data planejada anterior à data exibida e atividade não encerrada | número **Atrasadas** no painel |
| hoje | **Hoje** | data planejada igual à data exibida, atividade não encerrada | não tem contador próprio |
| concluídas | **Concluídas** | atividade concluída **ou dispensada** | não tem contador próprio |

- **concluídas permanecem visíveis** — não desaparecem da tela;
- mudança de grupo ocorre por conclusão, por virada de data, ou por reabertura da atividade. **Reabrir não exige republicar o plano**: a fila lê a situação atual da atividade;
- os títulos de seção não exibem contagem.

---

## 10. Priorização e recomendação

### Ordem de exibição (`applyWorkQueuePrioritization`)

1. grupo (atrasadas → hoje → concluídas);
2. atividades **sem** pendência anterior antes das que têm;
3. data planejada;
4. identificador da esteira;
5. **sequência estrutural da esteira** (tarefa → setor → atividade);
6. desempate final estável pelo identificador do item.

**A ordem de planejamento do dia não é usada na ordenação.** Ela só alimenta o número exibido no cartão.

### Próxima atividade recomendada

`resolveIsNextRecommended` é avaliado **por item**, não escolhendo um vencedor:

- atividade não encerrada, **sem** atividade anterior aberta, e esteira liberada para apontamento → recebe o selo **Próxima atividade recomendada**.

Consequências confirmadas e documentadas:

- **vários cartões podem trazer o selo ao mesmo tempo**;
- **a recomendação é apenas visual** — não bloqueia nem desabilita nenhuma outra atividade;
- não há peso de tempo, de atraso, de prioridade manual nem desempate: é critério estrutural binário.

### Divergência de leitura registrada

O número do cartão vem da ordem do planejamento no dia; a ordem dos cartões vem do critério acima. Os dois não coincidem, e o usuário vê números fora de sequência. Levado ao capítulo 21 e explicado no capítulo 10.

---

## 11. Sequência

| Pergunta | Resultado |
|---|---|
| indicação de atividade anterior pendente | **sim**: *"Etapa anterior pendente: «nome»"* com uma predecessora, **Atenção à sequência** com mais de uma |
| predecessora de outro colaborador | aviso informativo *"Aguardando etapa «nome»"* / *"Aguardando N etapas anteriores"* |
| pode apontar fora da sequência? | **sim** |
| exige justificativa? | **sim**, por pendência anterior — faixa **Fora de sequência — confirme o apontamento** com a contagem de pendências e a lista das predecessoras |
| bloqueia conclusão? | **não bloqueia**; exige a mesma justificativa |
| o que fecha a sequência | atividade concluída **ou dispensada** deixa de bloquear as sucessoras (`isStepClosedForSequence`) |
| relação com o capítulo 7 | mesma regra e mesma gaveta — a fila só pré-seleciona a atividade |
| diferença para o Modo Fábrica | mesma regra de sequência; o texto exibido é outro e o Modo Fábrica acumula a exigência com a de tempo acima do previsto |

---

## 12. Capacidade

| Pergunta | Resultado |
|---|---|
| a tela exibe capacidade diária? | **não** como número isolado; aparece **dentro do aviso de sobrecarga** |
| planejado | número **Minutos planejados** no painel |
| excedente | não há campo de excedente; o aviso traz planejado e capacidade |
| aviso | faixa amarela, apenas quando planejado > capacidade |
| texto literal | *"Planejamento acima da capacidade do dia: «planejado» planejados para «capacidade» de capacidade."* |
| base de cálculo | soma do tempo previsto dos itens **do plano publicado** com data igual à data exibida — **incluindo concluídas e dispensadas** |
| Extra Esteira entra? | **não** |
| realizado entra? | **não** — a comparação é planejamento × capacidade |
| capacidade usada | ajuste individual válido para a data → padrão global → **480 minutos** quando nada está cadastrado |
| bloqueia algo? | **não** |
| o que o colaborador deve fazer | avisar a gestão; o capítulo **não** ensina a alterar capacidade |

---

## 13. Tempo previsto

| Pergunta | Resultado |
|---|---|
| cartão mostra minutos previstos? | **sim**, em selo cinza, formatado (*"1 h 30 min"*); `—` quando não há valor |
| realizado | **não exibido** |
| pendente | **não exibido** |
| percentual | **não exibido** |
| origem do previsto | tempo gravado no item do plano publicado |
| mesmo valor do Modo Fábrica? | **sim**, mesma origem. O Modo Fábrica exibe ainda realizado e pendente, calculados a partir dos apontamentos |
| exige justificativa por exceder o previsto? | **não** |

Reconfirmação específica solicitada pelo prompt: a Minha Fila **não** exige justificativa por tempo acima do previsto. A validação do apontamento no servidor cobre tempo maior que zero, quantidade válida, colaborador ativo, situação da esteira, conclusão, dispensa e justificativas de exceção/sequência — nada sobre excesso de tempo. A exigência é regra de interface do totem. Conclusão do capítulo 7 **mantida**.

Observação complementar: ao montar o candidato de apontamento a partir do cartão, a Minha Fila fixa papel **apoio** e realizado **0**. Como a gaveta exibe o papel, um colaborador principal verá *"Apoio"* nessa linha. Divergência cosmética, registrada aqui; não levada ao manual por não afetar nenhuma decisão do usuário.

---

## 14. Ações do cartão

Ações realmente disponíveis:

| Ação | Observação |
|---|---|
| **Apontar horas** | abre a gaveta de apontamento; desabilitado **apenas** quando a atividade está concluída |
| **Abrir Esteira** | leva à tela da esteira posicionada na atividade |

**Não existem** na Minha Fila: concluir direto no cartão, imprimir ticket, reabrir, menu de ações, correção de apontamento.

Fora do cartão: **Atualizar** (passa a **Atualizando...**), **Dia anterior**, **Próximo dia**, **Hoje** e o campo de calendário.

### Apontar

- abre a gaveta **Execução rápida**, aba **Esteira**, **já no formulário** (título **Registrar tempo**), com a atividade herdada do cartão;
- campos: **Data em que o trabalho foi realizado** (atalhos **Hoje** / **Ontem** + calendário, sem data futura), **Tempo (minutos)** (começa em 0, mínimo 1), **Quantidade executada** (começa em 1, mínimo 0, não pode ficar vazia), **justificativa operacional** (quando exigida), **Descrição (opcional)**;
- **a data não é herdada da fila**: começa sempre em hoje;
- justificativa exigida em dois casos: atividade fora da alocação do colaborador e atividade anterior aberta;
- confirmação: *"Apontamento registrado com sucesso."*, acrescentando a data de realização quando retroativo.

### Concluir

- **não há botão de conclusão no cartão.** O caminho pela fila é **Salvar apontamento e concluir atividade**, dentro da gaveta — o que implica **sempre registrar pelo menos 1 minuto**;
- conclusão **sem novo apontamento** pela gaveta existe apenas na lista (**← Voltar à lista**), onde atividades alocadas ao colaborador trazem **Concluir atividade** com a confirmação *"Concluir esta atividade?"* e o texto *"Esta ação marca a atividade como concluída e pode liberar a próxima atividade da sequência."*;
- pré-condições: atividade não concluída nem dispensada e esteira liberada para apontamento;
- justificativa exigida quando há atividade anterior aberta;
- mensagens: *"Apontamento salvo e atividade concluída."* (pelo formulário) e *"Atividade concluída."* (pela lista).

---

## 15. Atualização após ação

| Evento | Recarrega a fila? |
|---|---|
| troca de data | **sim** |
| botão **Atualizar** | **sim** |
| **fechar** a gaveta | **sim** |
| **salvar apontamento** com a gaveta aberta | **não** — a página não recebe aviso de salvamento; a gaveta volta à lista e recarrega os próprios candidatos |
| concluir pela lista da gaveta | **não** para a fila; **sim** para a lista da gaveta |
| retorno de foco à aba/janela | **não** — não há recarga por foco ou visibilidade |
| erro | a fila anterior é descartada; o estado passa a vazio com faixa de erro ou janela bloqueante |

Consequência documentada: números e grupos só refletem o registro depois de fechar a gaveta ou usar **Atualizar**.

---

## 16. Estados vazios e mensagens

Textos reais (nenhum inventado):

| Situação | Texto |
|---|---|
| carregando | *"Carregando Minha fila..."* |
| sem plano publicado na semana (ou sem vínculo) | *"Você ainda não possui atividades planejadas para este dia."* + *"Quando um plano semanal for publicado, suas atividades aparecerão aqui."* |
| com plano publicado, nada para o colaborador | *"Não há atividades planejadas para você neste dia."* + a mesma segunda linha |
| origem da fila, no cabeçalho | *"Exibindo plano publicado."* / *"A fila mostra apenas planos publicados."* |
| sem vínculo operacional | *"Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso."* |
| sobrecarga | *"Planejamento acima da capacidade do dia: … planejados para … de capacidade."* |

**Fila concluída não é estado vazio:** com todas as atividades encerradas, o grupo **Concluídas** continua na tela.

Falhas de carga, conforme a severidade: janela bloqueante (**Não foi possível continuar** para falha de comunicação, **Sessão inválida** para sessão expirada, **Sem permissão**, **Operação não concluída** para indisponibilidade) ou faixa vermelha na própria tela, **sem** botão de nova tentativa — o caminho é **Atualizar**.

Bloqueios ao apontar/concluir, todos exibidos **ao salvar**: dispensa, conclusão operacional, esteira finalizada, cancelada, em elaboração ou em planejamento, colaborador inativo, justificativa ausente ou sem complemento, data futura.

---

## 17. Execução fora do plano; concluída / reaberta / dispensada

### Execução fora do plano

| Pergunta | Resultado |
|---|---|
| altera a Minha Fila? | **não** |
| cria cartão? | **não** — a fila é construída a partir de itens de plano, não de apontamentos |
| remove pendência? | **somente** se o apontamento concluir uma atividade que **já estava** no plano do colaborador |
| afeta ordem? | indiretamente: concluir uma predecessora muda a classificação de sequência da sucessora, o que muda a ordenação e pode acender o selo de recomendação |
| invisível à fila? | **sim**; o registro aparece em **Minha jornada** e para a gestão |
| Extra Esteira | nunca aparece na fila nem entra na conta de capacidade |

### Ciclo visual

| Evento | Efeito na fila | Precisa republicar? |
|---|---|---|
| concluída | vai para **Concluídas**, com selo **Concluída**; botão desabilitado | não |
| reaberta | volta a pendente, em **Hoje** ou **Atrasadas** conforme a data planejada | **não** |
| dispensada | consta em **Concluídas**, **sem selo**; apontamento recusado ao salvar | não |
| dispensa desfeita | volta a pendente | **não** |

A fila lê a situação atual da atividade, não uma fotografia da publicação. É o ponto de coerência com o capítulo 6 futuro.

---

## 18. Diferenças confirmadas para o Modo Fábrica

| Dimensão | Minha Fila | Modo Fábrica |
|---|---|---|
| fonte | mesmo plano publicado | mesma fonte, restrita a itens com situação planejada |
| acesso | e-mail e senha | colaborador e PIN |
| data | navegação livre, inclusive futura | sempre o dia corrente, sem parâmetro de data |
| organização | grupos **Atrasadas** / **Hoje** / **Concluídas** | filtros **Todas** / **Pendentes** / **Concluídas** no navegador da fábrica |
| tempo | só previsto | previsto, realizado e pendente |
| capacidade | aviso de sobrecarga | não existe no resumo |
| quantidade | sim, no apontamento | não no totem; sim no navegador da fábrica |
| conclusão | junto com o apontamento, ou pela lista da gaveta | ação própria |
| justificativa por excesso de tempo | **não exige** | **exige** |
| dispensada | em **Concluídas**, botão ainda clicável | cartão bloqueado com mensagem explícita |
| Outra atividade | equivalente: **Buscar outras atividades** na gaveta | ação própria no totem |
| Extra Esteira | aba da gaveta | ação própria no totem |
| atualização | manual | fluxo próprio do totem |

Tabela comparativa incluída no capítulo porque orienta decisão real do usuário (onde conferir realizado, onde conferir atraso). O capítulo 13 não foi duplicado.

---

## 19. Divergências novas e incoerências encontradas

1. **Atividade dispensada aparece na fila do colaborador** — contraria o que o capítulo 21 afirmava (*"não aparece"*). Corrigido com evidência.
2. **Botão Apontar horas ativo em atividade dispensada** na Minha Fila; o servidor recusa ao salvar. O Modo Fábrica bloqueia antes. Registrado no capítulo 21.
3. **Dispensada e concluída somam na capacidade do dia** e nos números de **Atividades de hoje** / **Minutos planejados**. Amplia o efeito já descrito no capítulo 21.
4. **Numeração do cartão não acompanha a ordem da tela.** Registrado no capítulo 21.
5. **Rótulos presos a "hoje"** — *"Atividades de hoje"*, *"Minutos planejados"* e a frase de apoio continuam dizendo "hoje" ao navegar para outra data. Registrado no capítulo 21.
6. **Fila não recarrega após salvar apontamento com a gaveta aberta.** Explicado no capítulo 10; não classificado como defeito de produto por haver caminho claro (**Atualizar** / fechar a gaveta).
7. **Atraso não atravessa semanas** — por desenho, não por falha; documentado no capítulo.
8. **Sem filtro de situação da esteira na montagem da fila** — cartões de esteira finalizada ou cancelada podem aparecer; o bloqueio vem no apontamento. Explicado nos bloqueios do capítulo 10.
9. **Papel fixado como apoio** no candidato gerado pelo cartão. Divergência cosmética, registrada apenas aqui.
10. **Situação "movida" de item de plano** entra na Minha Fila e não no Modo Fábrica. Divergência latente — nenhum caminho de código grava essa situação hoje. Registrada apenas aqui.
11. **Fuso da data padrão da fila** é o do dispositivo; o apontamento usa a data civil de São Paulo. Sem efeito prático no Brasil; registrado apenas aqui.
12. **Matriz técnica, `FIL-004`:** as mensagens citadas (*"Nenhuma atividade planejada para você no momento."* / *"Confirme com o gestor se o planejamento da fábrica já foi publicado."*) pertencem ao navegador da fábrica, não à Minha Fila — e o próprio texto da matriz atribui corretamente a "Produção Web". **Não é erro factual**, por isso a matriz **não** foi alterada. Fica a sugestão de, em rodada futura, registrar em `FIL-*` os estados vazios reais da Minha Fila.

---

## 20. Alterações feitas no capítulo 21

Todas com evidência em código, conforme a regra de ampliar o anexo somente com fato novo:

| Onde | Alteração |
|---|---|
| *Atividade dispensada volta a aparecer como planejável* | cabeçalho de alcance ampliado para incluir Minha Fila e Modo Fábrica |
| mesma seção, tabela de efeitos | linha *"fila do colaborador e Modo Fábrica — não aparece"* **substituída** por três linhas: comportamento real na Minha Fila, comportamento real no Modo Fábrica e o caso de datas anteriores |
| mesma seção, corpo | parágrafo de efeito reescrito + nota explícita da correção de entendimento |
| mesma seção, orientação | acrescentado *Como reconhecer na Minha fila* e orientação ao colaborador |
| §21.3, tabela | nova linha sobre os rótulos presos a "hoje" na Minha fila |
| §21.3, nova subseção | *Numeração dos cartões da Minha fila não segue a ordem da tela* |

Nenhum relatório histórico em `docs/ai/reports/` foi editado.

---

## 21. Validações executadas

### Git

```
git status --short
 M docs/manual/source/MANUAL_USUARIO_SGP.md

git diff --check
(sem saída — nenhum problema de espaço em branco)

git diff --stat
 docs/manual/source/MANUAL_USUARIO_SGP.md | 364 +++++++++++++++++-
 1 file changed, 353 insertions(+), 11 deletions(-)
```

`git diff --name-only <SHA_BASE>..HEAD` executado antes do commit retornou vazio, como esperado (as alterações estavam na árvore de trabalho). A lista definitiva de arquivos do commit está na seção *Commit e push*.

### Marcadores

```
grep -n "PENDENTE DE ENRIQUECIMENTO" docs/manual/source/MANUAL_USUARIO_SGP.md
```

- capítulo 10: **sem marcador pendente** ✔
- capítulos 5, 7, 8, 9 e 13: **continuam completos** ✔
- capítulos 4, 6, 11, 12, 14, 15, 16, 17, 18 e 19: **continuam pendentes** ✔ (a ocorrência da linha 78 é a explicação do marcador em §2.6, não um capítulo)

### Linguagem técnica no capítulo 10

Busca por `STEP`, endpoint, backend, migration, schema, repository, query, UUID, payload, enum, API, URL, códigos internos de situação e nomes de arquivo/função: **nenhuma ocorrência**. As únicas correspondências do filtro foram as palavras *finalizada* e *cancelada* dentro de mensagens literais da interface em português. O termo *"etapa"*, que aparece em rótulos da tela, é citado e traduzido como **atividade**.

### Estrutura

Seis blocos editoriais confirmados, na ordem exigida: **Para que serve**, **Onde fica**, **Quem costuma ter acesso**, **Como fazer**, **O que esperar**, **Quando algo é bloqueado**. 4 marcadores de imagem (limite 4).

### Execução visual

**Não houve execução visual.** Nenhuma tela foi aberta, nenhum screenshot foi gerado, nenhum HTML ou PDF foi produzido. Toda a verificação foi por leitura de código e de migrations.

### Build, lint e testes

**Não executados** — tarefa exclusivamente documental, sem alteração de código, conforme §15 do prompt. Nenhum resultado de build, lint ou teste é alegado.

---

## 22. Branches

Trabalho feito em `docs/manual-usuario-sgp-cap10-minha-fila`, criada a partir de `1fc46bb26de5f4316556cb7c3b277cf07ee40eb8`.

Sem rebase, sem force-push, sem reescrita de histórico, sem exclusão de branch, sem merge e sem PR.

Confirmadas **intactas** (nenhum commit, push ou alteração de referência):

- `main`
- `develop`
- `homol`
- `docs/auditoria-cobertura-funcional-manual-sgp`
- `docs/manual-usuario-sgp-base-p0`
- `docs/manual-usuario-sgp-cap05-painel-operacional`
- `docs/manual-usuario-sgp-cap07-apontamentos`
- `docs/manual-usuario-sgp-cap13-modo-fabrica`
- `docs/manual-usuario-sgp-cap08-planejamento-semanal`
- `docs/manual-usuario-sgp-cap09-agenda-semana`

---

## 23. Pendências, riscos e ressalvas

- Os itens 2, 4 e 5 da seção 19 são **defeitos de produto em aberto**. Documentados, não corrigidos — a tarefa proíbe alterar código.
- Capítulos 11, 12 e 14 continuam pendentes; o capítulo 10 faz apenas remissões curtas a eles.
- A sugestão de registrar os estados vazios reais da Minha Fila em `FIL-*` da matriz técnica fica para rodada futura.

## 24. Próximo passo recomendado

Capítulo **11 — Minha Jornada**: é a tela a que o capítulo 10 remete para tempo realizado e histórico, e fecha a visão do colaborador sobre a própria execução.

---

## 25. Commit e push

- Commit documental na branch `docs/manual-usuario-sgp-cap10-minha-fila`: `32b7e474d2e720a0655adf81d881fbb691e45c51` — capítulo 10, capítulo 21 e este retorno.
- Commit seguinte, apenas para gravar neste arquivo o identificador do commit documental: é o **tip atual da branch** e, por ser o commit que contém esta própria linha, seu identificador não pode ser escrito dentro dele. Obter com `git rev-parse docs/manual-usuario-sgp-cap10-minha-fila`.
- Histórico **não** reescrito: nenhum `--amend`, nenhum force-push.
- Push para `origin/docs/manual-usuario-sgp-cap10-minha-fila`.
- Sem PR, sem merge, sem force-push.
- Estado final do working tree: **clean**.

## 26. Uso de contexto

`Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.`
