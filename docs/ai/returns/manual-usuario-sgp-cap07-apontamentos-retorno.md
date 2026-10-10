# Retorno — `manual-usuario-sgp-cap07-apontamentos`

- **TASK_ID:** `manual-usuario-sgp-cap07-apontamentos`
- **Data/hora:** 2026-10-03 (UTC)
- **Status final:** concluída
- **Branch:** `docs/manual-usuario-sgp-cap07-apontamentos`
- **SHA base:** `310ba2f9d95e94f36528be507ff4080ab159e199` — conferido contra `origin/docs/manual-usuario-sgp-cap05-painel-operacional`, **idêntico ao esperado**
- **SHA final:** `dd9da8b8` (commit do capítulo) + commit de registro deste SHA
- **Working tree ao encerrar:** limpo

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | alterado — capítulo 7 escrito; duas entradas novas no capítulo 21; cabeçalho de situação atualizado |
| `docs/ai/returns/manual-usuario-sgp-cap07-apontamentos-retorno.md` | criado |

`docs/manual/source/MANUAL_FUNCIONAL_SGP.md` **não foi alterado** — ver a seção sobre VAL-002 adiante.

## Resumo do capítulo entregue

Capítulo 7 — Apontamentos, com os seis blocos editoriais do padrão do capítulo 2:

- **Para que serve** — registrar trabalho; o apontamento inicia a esteira; Extra Esteira; correção gerencial.
- **Onde fica** — tabela com os três caminhos reais e o propósito de cada um; remissão ao capítulo 13 para o Modo Fábrica.
- **Quem costuma ter acesso** — tabela ação × quem consegue, em linguagem de capacidade, sem nomes técnicos de permissão; exigência do vínculo da conta com um colaborador.
- **Como fazer** — passo a passo de: registrar horas em atividade; os campos e sua obrigatoriedade; o que fazer quando a atividade não aparece; quando a justificativa é exigida; registrar e concluir no mesmo passo; concluir sem registrar horas; Extra Esteira; corrigir, remover e lançar por outra pessoa.
- **O que esperar** — a data manda no dia contabilizado; o que muda ao salvar; previsto/realizado/pendente e a ausência de aviso de estouro; tabela comparativa Extra Esteira × atividade; onde reencontrar o que foi lançado.
- **Quando algo é bloqueado** — cinco tabelas de mensagens reais (antes de salvar, ao salvar, ao concluir, na correção gerencial) e o caso da justificativa sem campo.

Três marcadores de imagem, no limite permitido.

## Caminhos de código usados como evidência

Reconferido no código em `310ba2f9`.

| Tema | Evidência |
|---|---|
| Botão global e alcance | `src/components/AppHeader.tsx` (botão **Apontar horas**); `src/layouts/AppShellLayout.tsx` (cabeçalho em toda a área autenticada) |
| Gaveta de apontamento rápido | `src/features/shell/QuickTimeEntryDrawer.tsx`; `src/features/shell/quickTimeEntryDrawerLogic.ts`; `src/features/shell/QuickTimeEntryCandidateActions.tsx` |
| Página de apontamento do colaborador | `src/features/colaborador/ApontamentoPage.tsx`; links em `src/features/colaborador/JornadaPage.tsx` e `src/features/colaborador/MinhasAtividadesPage.tsx` |
| Apontamento gerencial | `src/features/gestor/ApontamentoGestorPage.tsx`; entradas em `src/features/gestor/JornadaColaboradorGestorPage.tsx` e `src/features/esteiras/StepAnaliticoPanel.tsx` |
| Data de realização | `src/domain/operational/workDate.ts`; `src/components/ui/WorkDateField.tsx`; `server/src/shared/operationalWorkDate.ts` |
| Validação de criação, correção, remoção e lançamento por terceiro | `server/src/modules/conveyors/conveyorAssignments.schemas.ts`; `conveyorAssignments.service.ts` |
| Permissões das rotas | `server/src/modules/conveyors/conveyorAssignments.routes.ts` |
| Conclusão e reabertura de atividade | `server/src/modules/conveyors/conveyor-step-operational.service.ts` |
| Situações da esteira que aceitam apontamento | `server/src/modules/conveyors/conveyorOperationalStatus.ts` (`CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES`, `timeEntryBlockedMessage`) |
| Candidatas da gaveta | `server/src/modules/my-activities/my-activities.service.ts`; `my-activities.repository.ts` |
| Extra Esteira | `server/src/modules/my-activities/extra-time-entries.schemas.ts`; `extra-time-entries.service.ts` |
| Justificativas | `src/domain/operational/timeEntryJustificationField.ts`; `src/components/operational/JustificationSelect.tsx`; `server/src/shared/timeEntryJustificationResolver.ts` |
| Rótulos de sequência | `src/domain/production/production.helpers.ts` |
| Mensagem de conta sem colaborador | `src/lib/transversalUxCopy.ts` |

## Formas reais de entrada para apontamento

| Entrada | Como se chega | Observação |
|---|---|---|
| **Apontar horas** (gaveta) | botão na barra superior, em todas as telas da área autenticada | caminho mais completo: duas abas, busca de candidatas, justificativa, salvar e concluir |
| Página **Apontamento** | botão **Apontar** na linha da atividade em **Minha jornada**; também de **Minhas Atividades** | **sem campo de justificativa** — ver divergências |
| **Apontamento gerencial** | botão **Apontamento gerencial** em **Jornada por colaborador**; link **Apontamento gerencial neste passo** no detalhe da esteira | ambas as entradas exigem ao menos uma das capacidades de apontamento gerencial |

A gaveta também é montada em **Minha fila**, **Planejamento** e **Agenda da semana**, além do cabeçalho.

O link para a página de apontamento presente em `EsteiraDetalhePage.tsx` está dentro de `EsteiraDetalheMockPage`, componente não referenciado por nenhuma rota — não é caminho real.

## Campos e obrigatoriedade

**Apontamento em atividade (gaveta):**

| Campo | Obrigatório | Regra |
|---|---|---|
| Data em que o trabalho foi realizado | sim | inicia em hoje; atalhos Hoje/Ontem; `max` = hoje |
| Tempo (minutos) | sim | inteiro ≥ 1; o campo inicia em `'0'`, mantendo o botão desabilitado |
| Quantidade executada | sim na prática | inteiro ≥ 0; inicia em `'1'`; valor vazio invalida o formulário, embora a API aceite ausência |
| Justificativa operacional | condicional | obrigatória fora da alocação e/ou fora de sequência; complemento obrigatório em algumas opções |
| Descrição | não | texto livre |

**Extra Esteira:** Descrição do apontamento (obrigatória, de catálogo ativo), data (não futura), minutos (inteiro ≥ 1), observação (opcional, até 500 caracteres). **Não há quantidade nem justificativa.**

**Lançamento por terceiro (tela gerencial):** Colaborador alvo (apenas alocados), data, minutos, observação opcional, **motivo obrigatório**, e justificativa de fora de sequência quando aplicável. **Não há campo de quantidade executada na tela**, embora a API aceite.

**Correção:** um campo por vez — minutos **ou** quantidade — mais **motivo obrigatório**.

## Regras de data, minutos, quantidade, sequência e tempo previsto

**Data de realização.** Referência é a data civil de São Paulo nas duas camadas. Datas passadas **sem limite**; data futura recusada no campo e na gravação, com a mensagem “A data de realização não pode ser futura.”. Lançamento retroativo é ancorado ao meio-dia de São Paulo e a hora **nunca é exibida** (`formatWorkDateFromEntryAt` devolve apenas a data). O dia contabilizado é o da data escolhida.

**Minutos.** Inteiro positivo nas duas camadas (`z.number().int().positive()`; `if (input.minutes <= 0) throw`). Zero e decimais não são aceitos.

**Quantidade executada.** Inteiro ≥ 0, opcional e anulável na API; **zero é valor válido** e significa “trabalhou sem concluir unidade”. Na correção é possível limpá-la.

**Sequência.** Atividade anterior pendente **não bloqueia**: exige justificativa. Mensagem do servidor: “Informe uma justificativa para executar esta atividade fora da sequência recomendada.”. A tela mostra a faixa **Fora de sequência**, a contagem de pendentes e a lista tarefa › setor › atividade. Quando não há exigência, aparece apenas aviso neutro (“Aguardando etapa …” / “Aguardando N etapas anteriores”). O apontamento fora de sequência gera evento próprio no histórico da esteira.

**Tempo previsto.** **Não existe aviso nem bloqueio de estouro de tempo previsto na área autenticada.** Busca por `previsto`, `excede`, `Excesso` e `acima do` em `QuickTimeEntryDrawer.tsx`: **zero** ocorrências; o serviço de criação também não compara realizado com previsto. O previsto aparece apenas como informação, ao lado de realizado e pendente, no cartão da candidata. A exigência de justificativa por extrapolação de tempo é comportamento do **Modo Fábrica** e foi remetida ao capítulo 13.

## Situações da esteira que permitem ou bloqueiam apontamento

Permitem: **A iniciar** e **Em andamento** (`CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES`).

Bloqueiam, com mensagem própria de `timeEntryBlockedMessage`: rascunho, aguardando planejamento, em planejamento, finalizada e cancelada.

Bloqueios da atividade: concluída (“Esta atividade já está concluída operacionalmente; não é possível novo apontamento.”) e dispensada (“Esta atividade foi dispensada; não é possível novo apontamento.”).

A lista de candidatas já respeita essas regras: as três consultas filtram `cv.operational_status IN ('A_INICIAR','EM_ANDAMENTO')` e excluem atividades concluídas e dispensadas.

**Primeiro apontamento inicia a esteira:** com a esteira em **A iniciar**, a criação do apontamento a move para **Em andamento** na mesma transação.

## Comportamento de Extra Esteira

Lançamento independente de esteira e de atividade. Exige descrição ativa de catálogo, data não futura e minutos ≥ 1. Sem quantidade e sem justificativa. O colaborador revê seus lançamentos no bloco **Últimos apontamentos extra esteira** da própria aba; o total consolidado por colaborador aparece à gestão em **Jornada por colaborador** (`extraTimeEntriesSummary`). Não há exibição de Extra Esteira na tela **Minha jornada** do próprio colaborador — conferido por busca no arquivo.

## Comportamento de salvar e concluir

**Salvar apontamento** grava o tempo e mantém a atividade aberta.

**Salvar apontamento e concluir atividade** envia a marcação de conclusão junto, e o serviço conclui a atividade na mesma transação. Aparece sempre no formulário (`canShowSaveAndCompleteButton` só esconde quando a candidata declara não poder concluir, e esse campo vem fixo como verdadeiro).

**Concluir atividade** isolado, no cartão, aparece apenas para atividades **dentro** da sua alocação (`canShowCompleteActivityButton` esconde quando há exigência de justificativa por exceção). Nessa rota o servidor valida: gestão passa direto; colaborador precisa de vínculo, de esteira em situação que aceite, e de alocação na atividade — senão “Para concluir esta atividade, informe uma justificativa ao registrar o apontamento.”, que na prática aponta para o caminho de salvar e concluir.

Consumir o tempo previsto não conclui a atividade.

## Correção gerencial

**Entrada:** **Jornada por colaborador** e detalhe da esteira. Ambos os links exigem ao menos uma das três capacidades de apontamento gerencial.

**Capacidades lidas do código** (nomes técnicos citados aqui apenas como evidência; não aparecem no capítulo):

| Ação | Exigência na rota / serviço |
|---|---|
| Lançar por terceiro | `time_entries.create_on_behalf` |
| Corrigir apontamento | `time_entries.edit_any` — **sempre**, inclusive sobre o próprio apontamento |
| Remover apontamento | ser o autor, **ou** `time_entries.delete_any` |
| Reabrir atividade | `conveyors.create` |

**Campos editáveis:** minutos **ou** quantidade executada, um por correção, mais motivo obrigatório. **Data e justificativa não são editáveis** — não há caminho na API nem na tela. O capítulo orienta remover e relançar quando a data estiver errada.

**Concorrência:** a correção envia a versão esperada do apontamento; divergência devolve “O apontamento foi alterado por outro usuário. Atualize a tela e tente novamente.” — tanto na checagem prévia quanto na própria atualização.

**Remoção:** quem tem a capacidade de remover de qualquer pessoa precisa **sempre** informar motivo, inclusive ao remover o próprio lançamento (`managerial = hasDeleteAny || !isOwner`). O autor sem essa capacidade remove com simples confirmação. A remoção é lógica, preservando o registro.

**Efeitos:** correção e remoção gerenciais gravam evento na trilha administrativa (`time_entry_edited_by_manager` com campo, valor anterior e novo; `time_entry_deleted_by_manager` com o motivo). Lançamentos por terceiro ficam marcados na lista como **Registrado pelo gestor**, com autor e motivo.

**Lançamento por terceiro exige alocação ativa do alvo** — “O colaborador indicado não está alocado nesta atividade.” — ao contrário do apontamento próprio, que admite exceção com justificativa.

## Mensagens principais

Todas verificadas literalmente no código e usadas no capítulo: “A data de realização não pode ser futura.”, “Data inválida.”, “Informe a data em que o trabalho foi realizado.”, “Selecione uma justificativa operacional para este apontamento.”, “Esta justificativa exige complemento.”, “Nenhuma justificativa operacional ativa encontrada.”, “Não foi possível carregar as justificativas padronizadas. Informe a justificativa manualmente.”, “Esta esteira ainda não foi liberada para produção.”, “Esta esteira está em planejamento e ainda não permite apontamento.”, “Esta esteira está finalizada e não permite novos apontamentos.”, “Esta esteira está cancelada e não permite novos apontamentos.”, “Esta atividade já está concluída operacionalmente; não é possível novo apontamento.”, “Esta atividade foi dispensada; não é possível novo apontamento.”, “Informe uma justificativa para executar esta atividade fora da sequência recomendada.”, “Conta sem colaborador operacional associado. Contate o administrador.”, “Esta esteira não está liberada para conclusão operacional de atividades.”, “Para concluir esta atividade, informe uma justificativa ao registrar o apontamento.”, “Esta atividade já está concluída.”, “Sem permissão para reabrir esta atividade.”, “Não foi possível concluir esta atividade.”, “Informe o motivo da correção.”, “Informe o tempo em minutos, com um número inteiro de pelo menos 1.”, “Informe a quantidade executada como um número inteiro igual ou maior que zero, ou limpe a quantidade.”, “Altere apenas o tempo ou apenas a quantidade executada em cada correção.”, “O apontamento foi alterado por outro usuário. Atualize a tela e tente novamente.”, “Informe o motivo da remoção.”, “O colaborador indicado não está alocado nesta atividade.”, “Indique o motivo.”, “Colaborador inexistente, inativo ou indisponível.”, “Esta atividade não está incluída na sequência operacional recomendada.”, “Não foi possível remover este apontamento.”, “Apontamento não encontrado.”, “Apontamento registrado com sucesso.”, “Apontamento salvo e atividade concluída.”, “Atividade concluída.”, “Apontamento extra esteira registrado com sucesso.”, “Apontamento registrado em nome do colaborador selecionado.”, “Apontamento corrigido.”, “Apontamento removido.”, “Não há descrições ativas configuradas.”, “Não há colaboradores alocados neste passo. Aloque antes de apontar.”, “Contexto operacional ausente”.

## Divergências novas e incoerências encontradas

### 1. Nenhum aviso de estouro de tempo previsto na área autenticada

O marcador pendente que este capítulo substituiu dizia que a justificativa é exigida em “fora de sequência **e tempo acima do previsto**”. **A segunda metade não se aplica à área autenticada.** Não há aviso, bloqueio ou exigência de justificativa por extrapolação de tempo na gaveta nem no serviço de criação. É comportamento do Modo Fábrica. O capítulo afirma isso explicitamente e remete ao capítulo 13 — se tivesse copiado o marcador, ensinaria algo falso.

### 2. Página Apontamento sem campo de justificativa — VAL-002 confirmada

`src/features/colaborador/ApontamentoPage.tsx` não contém nenhuma referência a justificativa (busca por `justification`/`justificativa`: zero ocorrências). A página é alcançável por **Minha jornada**, onde o botão **Apontar** aparece quando a atividade está em execução ou em atraso. Se a atividade exigir justificativa, o registro é recusado e **não há campo para atendê-la**.

A matriz técnica já registra isso em **VAL-002**, pedindo validação em ambiente. A validação por código está feita e **confirma** o risco. **Não alterei a matriz**: VAL-002 não contém afirmação factualmente errada — está vaga, e sharpening não é correção. Fica a recomendação de precisá-la em rodada própria da matriz.

No manual de usuário, a pendência foi registrada no **capítulo 21** (nova subseção) e o capítulo 7 orienta o desvio: usar **Apontar horas**.

### 3. Lançamento por terceiro não valida a situação da esteira

O apontamento próprio verifica `canConveyorAcceptTimeEntry` e recusa fora de **A iniciar** / **Em andamento**. O lançamento por terceiro (`serviceCreateConveyorTimeEntryOnBehalf`) **não faz essa verificação** — busca por `canConveyorAcceptTimeEntry`, `timeEntryBlockedMessage` e `findConveyorById` no corpo da função: zero ocorrências. Valida alocação, sequência, atividade concluída e dispensada, mas não a situação da esteira.

Efeito: com a permissão correspondente, é possível lançar horas por outra pessoa em esteira **finalizada**, **cancelada** ou ainda **em planejamento** — situações em que o próprio colaborador seria recusado.

Assimetria correlata: esse caminho também **não** promove a esteira de **A iniciar** para **Em andamento**, ao contrário do apontamento próprio.

Não documentei isso como recurso no capítulo, para não ensinar a contornar a regra. Fica como pendência de produto.

### 4. Busca de candidatas não cobre o nome da tarefa que o campo promete

O campo **Pesquisar** diz “Esteira, cliente, veículo, placa, setor, tarefa, atividade…”. As duas consultas principais — alocações do colaborador e plano publicado — comparam esteira, código, cliente, veículo, placa, **setor** e **atividade**, mas **não** o nome da tarefa. Só a consulta de “Buscar outras atividades” inclui o nome da tarefa.

Procurar pelo nome da tarefa, portanto, não encontra a própria atividade alocada. O capítulo ensina a cobertura real e omite “tarefa” da lista.

### 5. “passo” como sinônimo de atividade nas telas gerenciais

“Lançamentos no passo”, “Apontamento gerencial neste passo”, “Carregando passo…”, “Indique a esteira e o passo (URL incompleta).”, “Não há colaboradores alocados neste passo.”. Termo diferente de “atividade” para o mesmo conceito. Registrado no capítulo 21 e explicado no capítulo 7.

### 6. Lançamento gerencial sem campo de quantidade

A API aceita quantidade executada no lançamento por terceiro, mas a tela só oferece colaborador, data, minutos, observação e motivo. O gestor não consegue registrar quantidade por outra pessoa. Registrado aqui; o capítulo informa o fato sem apresentá-lo como falha.

### 7. Grafia “Registo” no cabeçalho do apontamento gerencial

“Registo em nome de um colaborador alocado neste passo.” — grafia de Portugal, fora do padrão de português do Brasil do produto. O capítulo cita a frase literalmente, como manda a regra de fidelidade.

### 8. Voltar do apontamento gerencial cai no Dashboard

Chegando por **Jornada por colaborador**, o endereço carrega a origem `jornada_gestao`, mas `backLink` só trata a origem `esteira`; o resto cai em **Dashboard**. Quem vem da jornada volta para outro lugar. Não mencionei no capítulo para não documentar um desvio como se fosse projeto.

### 9. Colaborador não corrige o próprio apontamento

A correção exige a capacidade de corrigir apontamentos de qualquer pessoa, mesmo sobre o próprio lançamento. O colaborador comum só pode **remover** o próprio. Não é defeito — é a regra implementada — mas é contraintuitivo e está ensinado explicitamente no capítulo.

### Hipótese verificada e descartada

Suspeitei que as candidatas da gaveta não fossem filtradas por situação da esteira, porque `mapCandidateRow` fixa `conveyorOperationalStatus: 'EM_ANDAMENTO'`, `isActivityCompleted: false` e `canCompleteStep: true` com um comentário que **assume** o filtro anterior. Ao ler a função correta (`listTimeEntryCandidatesForCollaborator`, e não `listActivitiesRawForCollaborator`, que é de “Minhas Atividades”), confirmei que as três consultas **filtram** situação da esteira e excluem atividades concluídas e dispensadas. **O comentário está correto e não há defeito.** Registro a hipótese descartada para que uma auditoria futura não a reabra.

## Alterações na matriz técnica

Nenhuma. Não encontrei afirmação factualmente errada na matriz sobre apontamentos. A recomendação de precisar **VAL-002** fica registrada acima, para rodada própria.

## Validações executadas

| Validação | Resultado |
|---|---|
| `git fetch origin --prune` | OK |
| SHA base conferido | idêntico ao esperado |
| `git status --short` | apenas `docs/manual/source/MANUAL_USUARIO_SGP.md` modificado, antes de criar este retorno |
| `git diff --check` | **sem avisos** (exit 0) |
| `git diff --name-only 310ba2f9..HEAD` | somente os 2 arquivos permitidos, ambos em `docs/` |
| Nenhuma alteração fora de `docs/` | confirmado |
| Marcador pendente no capítulo 7 | **ausente** |
| Capítulo 5 permanece completo | sim — segue com os seis blocos e sem marcador |
| Capítulos pendentes | 15 marcadores: capítulos 4, 6 e 8 a 19 (14 capítulos), mais a citação do próprio marcador na seção 2.6 |
| Termos técnicos no capítulo 7 | `STEP` 0 · `endpoint` 0 · `backend` 0 · `migration` 0 · `schema` 0 · `repository` 0 · `query` 0 · `UUID` 0 · `payload` 0 · `enum` 0 · `A_INICIAR` 0 · `EM_ANDAMENTO` 0 · `PENDING` 0 · `COMPLETED` 0 · `ABORTED` 0 · `REOPENED` 0 · `DRAFT` 0 · `PUBLISHED` 0 · nomes de permissão 0 · `API` 0 · `URL` 0 |
| Seis blocos editoriais no capítulo 7 | todos presentes |
| Marcadores de imagem no capítulo 7 | 3 (limite respeitado) |
| `STEP` no arquivo inteiro | 2 ocorrências, ambas nas linhas declaradas dos capítulos 20 e 21 |

Nenhuma reprodução literal de termo técnico foi necessária no capítulo 7. A palavra **passo** aparece porque é rótulo real das telas gerenciais, e o capítulo explica que significa atividade.

**Nenhuma tela foi executada ou observada visualmente.** Toda a análise foi feita por leitura de código, migrations e testes do repositório.

**Build, lint e testes da aplicação: não executados.** Tarefa documental; nenhum arquivo sob build, lint ou teste foi tocado. Nenhum resultado de pipeline é alegado.

## Confirmação de branches e não alteração

Verificado por `git diff --name-only` contra a base: **não** foram alterados `src/`, `server/`, migrations, testes, CSS, assets, `package.json`, `app-version.json`, HTML/PDF do manual, o relatório histórico da auditoria nem a matriz técnica. Nenhum defeito encontrado foi corrigido — apenas documentado.

Branches preservadas, conferidas após o push:

| Branch | SHA |
|---|---|
| `origin/main` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `origin/develop` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` |
| `origin/homol` | `6b768c852a18b7428e3dadf761bad7e35c1d61ef` |
| `origin/docs/auditoria-cobertura-funcional-manual-sgp` | `1a951e4e5f65a958bbf22fec64c79e915164c4ed` |
| `origin/docs/manual-usuario-sgp-base-p0` | `eee4788c9ba2f8142ce035a4b5c6df39a697adbf` |
| `origin/docs/manual-usuario-sgp-cap05-painel-operacional` | `310ba2f9d95e94f36528be507ff4080ab159e199` |

## Pendências de produto identificadas nesta rodada

1. Página **Apontamento** sem campo de justificativa (confirma VAL-002).
2. Lançamento por terceiro não valida a situação da esteira, e não inicia esteira em **A iniciar**.
3. Campo de busca promete “tarefa” que as consultas principais não cobrem.
4. “passo” usado como sinônimo de atividade nas telas gerenciais.
5. Lançamento gerencial sem campo de quantidade executada.
6. Grafia “Registo” no cabeçalho do apontamento gerencial.
7. Voltar do apontamento gerencial cai no Dashboard quando a origem é a jornada.

Pendências das rodadas anteriores seguem abertas, sem alteração.

## Commit e push

- Commit: `docs(manual): escreve capítulo 7 — Apontamentos`
- Branch remota: `origin/docs/manual-usuario-sgp-cap07-apontamentos`
- PR: não criado. Merge: não realizado. Force-push: não realizado. Nenhuma branch excluída.
- SHA do commit do capítulo: `dd9da8b8`
- Um segundo commit registra este SHA neste retorno, mesmo padrão já usado em `docs/ai/returns/`; sem amend e sem force-push.

## Uso de contexto / sessão

`Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.`

`SESSION_CHECKPOINT.md` não foi atualizado: não houve handoff e a atividade foi concluída nesta sessão.
