# Hotfix SGP+ — atividades ausentes no apontamento e no planejamento

Data da análise: 20/10/2026 (revisada às 13:23). Repositório: `multivacia/sgp`.
TASK_ID: `hotfix-listagem-atividades-tati`
Branch proposta: `hotfix/listagem-atividades-tati`
Execução: Claude Code, com esforço alto de raciocínio e o agente implementador definido pelo projeto.

## Objetivo e uso deste prompt

Use este prompt para diagnosticar, corrigir e validar os dois relatos abaixo em uma branch de hotfix baseada na `origin/main` atual. Entregue uma candidata para homologação. Não use este trabalho para incorporar funcionalidades da `develop`, alterar regras de negócio ou promover uma release.

O resultado esperado é uma correção com evidências reproduzíveis, testes pertinentes e roteiro para Gustavo/Tati homologarem. O truncamento sem continuação é a **causa principal provável**; a correspondência exata com os cortes relatados na OS 7467 ainda precisa ser demonstrada (ver "Diagnóstico obrigatório").

## Relatos da Tati

1. Em **Apontar horas**, ela procura uma atividade que existe na esteira e não a encontra na lista. Relata que a listagem termina na **tarefa 11 — Ombreira**, enquanto a estrutura chega à **tarefa 21 — Revestir Painel**. Ela suspeita de limitação de página.
2. Em **Gestão → Planejamento**, relata que a lista para em **montagem dos bancos traseiros**, embora existam outras atividades posteriores no mesmo setor e também nas tarefas **limpeza, inspeção e revestir painel**.

### Premissa corrigida: 21 tarefas, não 21 atividades

Na tela Gestão → Evolução das Esteiras do print, cada linha numerada de 1 a 21 é uma **TAREFA** (nó `OPTION`), e cada tarefa contém várias **atividades** (nós `STEP`, agrupados por setor/`AREA`). Nas tarefas visíveis no print aparecem contagens como 7 (Ombreira), 9 (Forros de portas), 2 (Acabamentos), 11–12 (Bancos traseiros), 14–15 (Bancos dianteiros), 7 (Tampão), 10 (Montagem veículo), 10 (Limpeza final), 1 (Inspeção de qualidade) e 7 (Revestir painel), somando 78–80 atividades só nessas tarefas. Essa relação parcial não comprova o total. A OS possui 21 tarefas com múltiplas atividades; confirmar o total estrutural e a quantidade elegível em cada consulta.

O print mostra o drawer global de Apontar horas com pesquisa "7467" e **Buscar outras atividades** marcado, e o backlog lateral do planejamento. Confirmar a OS/esteira e o usuário usados; não inventar identificadores a partir do print reduzido. Não confundir número de tarefa, número de atividade e quantidade devolvida pela API. Não presumir que as duas telas têm a mesma causa nem que toda atividade da estrutura deve ser elegível nas duas.

O selo **"Fora da sua alocação"** no último cartão visível identifica a origem **daquele cartão**, não da lista inteira. A resposta do apontamento combina três origens; conferir separadamente cada uma.

## Base já conferida — atualizar antes de trabalhar

Na consulta remota de 20/10/2026:

- `main`: `40a519ddadcbc3b29286b8229d6cd7c3c3540e6b` — `merge: promover develop para main`.
- `develop`: `192de6c5db9f8fe17efd7ce895ab1e020ba8777a`.
- Comparação `main...develop`: 1 commit exclusivo da main e 18 exclusivos da develop.
- Esses dados comprovam o estado Git consultado, não a versão efetivamente implantada na VPS.
- A análise foi somente de código e do print. Não houve acesso ao banco ou ao navegador de produção, reprodução do incidente real, alteração funcional, commit, push, merge ou deploy.

Faça `fetch`, confira o remoto e crie um checkout/worktree limpo a partir da `origin/main` atual. Registre o SHA usado. Se a main avançou, examine se já contém correção equivalente antes de continuar. Não reutilize uma branch existente sem conferir sua origem e conteúdo. Preserve alterações locais alheias.

Leia antes das alterações: `AGENTS.md`, `CLAUDE.md`, `docs/ai/context/PROJECT_CONTEXT.md` e `docs/ai/context/SESSION_CHECKPOINT.md`, além das instruções aplicáveis aos diretórios envolvidos. O checkpoint da main consultada ainda descrevia a release de 16/10: valide fatos no código/Git, sem tratar o checkpoint como estado atual.

Siga os papéis de contexto, impacto, especificação, implementação e revisão previstos em `AGENTS.md`. Só o implementador pode alterar código/testes. Considere aprovados o escopo funcional e o desenho de paginação deste prompt: corrigir a omissão de atividades elegíveis e sua navegação, preservando as regras atuais. Não peça nova confirmação para decisões rotineiras dentro desse escopo. Se surgir necessidade de mudar regra de negócio ou um gate do projeto diferente de `SEGUIR`, apresente a evidência e a decisão necessária.

## Evidências encontradas na main consultada

### Apontar horas

- `src/features/shell/QuickTimeEntryDrawer.tsx`, função `load`: chama `listTimeEntryCandidates` com `limit: 50`, substitui `items` pela resposta e não oferece continuação. O drawer não descarta itens no frontend: `assignedCandidates` e `otherCandidates` apenas separam a lista recebida.
- `server/src/modules/my-activities/my-activities.schemas.ts`: `timeEntryCandidatesQuerySchema` admite no máximo 50.
- `server/src/modules/my-activities/my-activities.repository.ts`: três consultas, cada uma com `LIMIT` próprio e ordenação por tarefa → setor → atividade (`opt.order_index`, `area.order_index`, `step.order_index`), sem desempate por ID:
  - `listTimeEntryCandidatesForCollaborator` (alocação estrutural direta ou por time);
  - `listTimeEntryCandidatesFromPublishedPlan` (plano publicado vigente; ordena antes por atraso, data e `planned_order`);
  - `listTimeEntryUnassignedOpenStepsForCollaborator` (fora da alocação; só com `includeUnassigned` e termo de pelo menos 2 caracteres).
- `server/src/modules/my-activities/my-activities.service.ts`, `serviceListTimeEntryCandidates`: concatena as origens nessa precedência (alocada → plano → não alocada), deduplicando por `step_node_id`. O limite de 50 vale **por origem**; a resposta final pode ter mais de 50 itens e ainda assim estar truncada em qualquer origem.
- O controller e `src/services/my-activities/myActivitiesApiService.ts` não transportam informação de continuação.
- A busca `OS & atividade` é interpretada no backend por `time-entry-candidates.search.ts`; preservar essa semântica, inclusive no Kiosk ("Outra atividade"), que usa o mesmo serviço.

### Planejamento

- `src/features/operational-planning/OperationalPlanningPage.tsx`, `loadBacklog`: chama `listOperationalPlanningBacklog` com `limit: 100` e substitui a lista; não oferece continuação.
- `server/src/modules/operational-planning/operational-planning.schemas.ts`: `operationalPlanningBacklogQuerySchema` limita a 100.
- `server/src/modules/operational-planning/operational-planning.repository.ts`, `listOperationalPlanningBacklog`: aplica `LIMIT $4::int` após os filtros e a ordenação `cv.name, opt.order_index, area.order_index, step.order_index`, sem desempate por ID.
- `server/src/modules/operational-planning/operational-planning.service.ts`: o retorno traz `meta.limit`, sem próxima página nem indicação de esgotamento.
- Filtros legítimos do backlog: status da esteira, atividade não concluída, saldo de minutos maior que zero, exclusão de itens já em planos (esteira e semanal) e regra de esteira em produção com plano ativo, com a exceção de inclusão tardia (`operational-planning.backlog-eligibility.ts`). O frontend ainda oculta itens presentes no plano local por `buildVisiblePlanningBacklogItems`.
- A busca do backlog tem botão **Buscar**; confirmar se, no caso real, o termo "7467" estava aplicado. Sem ele, atividades de outras esteiras com nome anterior na ordenação também ocupam as 100 posições.
- `planningOperationalLayout.ts` já define rolagem independente para o backlog. Validar o comportamento real, incluindo o último cartão e seu botão.

### Conclusão atual

- **Comprovado no código:** as duas listas aplicam limites (50 por origem no apontamento, 100 no backlog) sem continuação nem aviso. Com mais atividades elegíveis do que o limite, as excedentes ficam inacessíveis.
- **Causa principal provável:** a OS 7467 possui 21 tarefas com múltiplas atividades, e a ordenação por tarefa faz o corte cair nas tarefas intermediárias, como relatado. Confirmar o total estrutural e a quantidade elegível em cada consulta.
- **A demonstrar:** que as atividades nas posições 50/51 (apontamento, por origem) e 100/101 (backlog) correspondem exatamente aos pontos de corte relatados pela Tati.

Ponto adicional para a regressão do contrato compartilhado: `handleCardPointTime`, no planejamento, solicita candidatos com `limit: 100`, incompatível com o máximo de 50 do schema, e captura o erro usando fallback. Se esse fluxo for atingido pelo hotfix, corrija a chamada de forma coerente com o novo contrato, sem ampliar indiscriminadamente o limite nem retirar validações de permissão.

## Diagnóstico obrigatório antes da correção

1. Identifique versão executada, tela, busca, checkbox, perfil e colaborador. Use dados disponíveis em ambiente local/homologação. Se houver acesso de leitura já autorizado aos dados do incidente, compare-os sem modificá-los. Não faça do acesso à produção uma condição para reproduzir o defeito com dados sintéticos.
2. **Levantamento inicial (estrutural):** contar atividades por tarefa na OS 7467. Isso dimensiona o problema, mas **não confirma** o corte, porque ignora colaborador, vínculos, planos e saldo.
3. **Confirmação pelos mesmos filtros dos endpoints:** executar as consultas reais (ou equivalentes que reproduzam exatamente seus filtros) com os mesmos parâmetros do caso: busca, colaborador, `includeUnassigned`, vínculos, status, planos publicados/ativos e saldo. Para cada origem do apontamento e para o backlog:
   - listar os IDs elegíveis **sem** o LIMIT, na ordenação atual;
   - listar os IDs devolvidos **com** o LIMIT;
   - identificar as atividades exatamente nas posições 50 e 51 (cada origem do apontamento) e 100 e 101 (backlog);
   - verificar se a posição 50 (ou 100) é a última atividade visível relatada e se a 51 (ou 101) é a primeira ausente. Chegar "perto" desses números não basta.
4. No apontamento, conferir separadamente quantos itens da resposta vêm de cada origem, a deduplicação entre elas e a precedência aplicada. Não atribuir a lista inteira à origem não alocada com base no selo de um cartão.
5. Para a esteira investigada, comparar por ID: estrutura completa → elegíveis pelas regras atuais → resposta da API → itens renderizados → itens alcançáveis por rolagem. Classificar cada ausência com evidência: truncamento, exclusão correta por regra, problema visual ou resposta antiga sobrescrevendo busca recente.
6. Registrar separadamente: defeito comprovado, hipótese e exclusão correta por regra atual. Sem dados do incidente, declarar a reprodução sintética e a validação real pendente, sem atribuir certeza ao caso da Tati.

## Desenho da correção (aprovado)

### Contrato de paginação

- Paginação por **cursor/keyset**, não por offset. Offset pula itens quando a lista muda entre páginas (por exemplo, atividade incluída no plano).
- Toda ordenação recebe **desempate final por `step.id`**, garantindo ordem determinística.
- A consulta busca **`limit + 1`** linhas; se vier a linha extra, há próxima página. A resposta devolve **`nextCursor`** (nulo quando não houver mais) e os itens da página, sem a linha extra.
- **`nextCursor` é calculado a partir do último item efetivamente devolvido na página, após a deduplicação.** A linha extra serve somente para detectar continuação; usá-la como cursor pularia uma atividade.
- O cursor é opaco para o frontend (codificar os valores da chave de ordenação) e validado no schema; cursor inválido retorna 400.
- Tamanho de página: **50** no apontamento e **100** no backlog. Os máximos dos schemas permanecem.
- Os filtros de pesquisa continuam aplicados na consulta inteira, antes da paginação.

### Backlog do planejamento

- Chave de cursor: `(cv.name, opt.order_index, area.order_index, step.order_index, step.id)`, na mesma ordem funcional atual.
- `meta` passa a incluir `nextCursor`; manter `meta.limit`.

### Apontar horas (web e Kiosk)

- Unificar as três origens em **um único SQL** (por exemplo, `UNION ALL` das três origens + `DISTINCT ON (step.id)` escolhendo a de maior precedência), com **um cursor global**. Não haverá continuação independente por origem.
- Elegibilidade e deduplicação ocorrem **antes** da paginação final. Precedência atual: alocação estrutural → plano publicado → não alocada. A origem não alocada continua incluída somente com `includeUnassigned` e termo de pelo menos 2 caracteres.
- **Remover os LIMITs internos** de cada origem: só a paginação final limita. Nenhum LIMIT interno pode continuar ocultando atividades.
- Ordem final determinística: precedência da origem → ordem funcional atual da origem (no plano: atraso, data, `planned_order`, depois tarefa → setor → atividade; nas demais: tarefa → setor → atividade) → `step.id`. Se essa composição exigir mudança visível de ordem em relação à tela atual, registrar no retorno.
- Preservar, por item: `isAssignedToMe`, `requiresJustification`, `plannedDate`/`isOverdue`, sequência e justificativas. A análise de sequência por esteira continua sendo feita sobre os itens da página.
- O endpoint do Kiosk (`/production/me/time-entry-candidates`) adota o mesmo contrato sem mudar autenticação, privacidade nem apresentação. Não redesenhar o Kiosk.

### Comportamento do frontend

- Botão **"Carregar mais"** ao fim da lista enquanto `nextCursor` não for nulo. Não usar rolagem infinita.
- O fim da lista é decidido **somente** por `nextCursor` nulo, nunca pelo tamanho da lista. No backlog, isso vale mesmo quando todos os itens carregados estão ocultos por estarem no plano local: a continuação permanece disponível e não se mostra lista vazia definitiva.
- **Respostas antigas:** todo reinício da lista incrementa uma geração da consulta (por exemplo, `useRef`): mudança de busca, mudança do checkbox e recarga após persistência (apontamento ou planejamento), **mesmo mantendo os mesmos filtros**. Sem isso, um "Carregar mais" anterior pode terminar depois e contaminar a lista reiniciada. Respostas de geração anterior são descartadas no sucesso, **no tratamento de erro e na finalização** (não alteram itens, cursor, mensagem de erro nem o estado de carregamento da geração atual). Pode-se usar `AbortController` como complemento. O debounce atual permanece.
- **Chamadas duplicadas:** enquanto uma página está em carregamento, o botão fica desabilitado e cliques repetidos não disparam nova requisição.
- **Reinício:** mudança de busca ou do checkbox zera itens e cursor e volta à primeira página.
- **Acréscimo:** páginas novas entram no fim, com deduplicação defensiva por ID.
- **Erro em página posterior:** manter os itens já carregados, mostrar o erro e oferecer "Tentar novamente" com o mesmo cursor, sem duplicar itens.
- **Após apontamento persistido** (web e Kiosk): recarregar a partir da primeira página, mantendo busca e checkbox, com nova geração da consulta.
- **Após persistir o planejamento** (salvar ou publicar): recarregar o backlog a partir da primeira página, mantendo os filtros, com nova geração da consulta.
- **Após inclusão apenas no rascunho local do planejamento:** ocultar o item (comportamento atual de `buildVisiblePlanningBacklogItems`) e **manter páginas e cursor**, sem refazer a consulta e sem perder alterações pendentes do rascunho. Seleção, drag and drop, apontamento e conclusão devem funcionar para itens carregados após a primeira página.

## Limites do hotfix

Preservar permissões, status, sequência estrutural, justificativas, alocação e semântica dos planos publicados. Em particular, não introduzir a regra de que todo apontamento exige planejamento prévio: essa seria uma mudança de negócio fora do escopo.

Não liberar indiscriminadamente atividades concluídas, dispensadas, inativas ou de esteiras canceladas para fazê-las aparecer. Não remover exclusões legítimas do backlog. Se encontrar inconsistência preexistente nessas regras, documentar e separar da correção de listagem.

Não alterar dados reais, executar migrations, mexer em secrets, aplicar correção manual em banco, mudar versão sem necessidade autorizada, refatorar outros módulos ou incorporar V2/beta. Se uma migration ou índice parecer necessário, justificar antes de incluí-lo: os indícios atuais não demonstram essa necessidade.

## Validação e critérios de aceite

Use testes de comportamento que falhem no defeito original e passem com a correção. Não basta verificar que um número de limite ou classe CSS mudou.

1. **Cenário sintético principal:** esteira com **21 tarefas e mais de 100 atividades elegíveis**, com **Ombreira na tarefa 11** e **Revestir Painel na tarefa 21**, distribuídas em setores, e dados de status, vínculos, planos e saldo suficientes para ultrapassar 50 elegíveis em cada origem do apontamento e 100 no backlog. Demonstrar que, antes da correção, o corte cai na posição 50/100 e, depois, todas as atividades até Revestir Painel são alcançáveis por "Carregar mais" e rolagem, com o último botão acionável, em resolução de notebook e celular.
2. Mais de 50 candidatos em **cada origem**, com sobreposição de IDs entre origens: percorrer até o fim e comparar o conjunto exato de IDs esperado com o recebido, sem ausências nem duplicidades, e com a origem de maior precedência mantida para cada ID.
3. Mais de 100 elegíveis no backlog: mesmo critério de conjunto exato.
4. Empates de ordenação (mesmos `order_index`), múltiplas esteiras, pesquisa por OS, `OS & atividade`, mudança de busca durante carregamento e alternância de `Buscar outras atividades`: sem respostas antigas aplicadas.
5. Itens legítimos excluídos pelas regras atuais continuam excluídos. Testar também usuário sem colaborador vinculado e a exigência de justificativas.
6. Primeira página do backlog toda ocupada por itens do plano local, com elegíveis nas páginas seguintes: a continuação permanece acessível.
7. Falha ao carregar página posterior: itens anteriores mantidos, erro exibido, nova tentativa sem duplicação. Cliques repetidos não geram requisições simultâneas.
8. Apontamento persistido com atividade de página posterior: a lista recarrega a partir da primeira página com os mesmos filtros. Persistência do planejamento: o backlog recarrega a partir da primeira página com os mesmos filtros. Inclusão apenas no rascunho local com atividade de página posterior: item oculto, páginas e cursor mantidos, alterações pendentes preservadas.
9. **Fronteira do cursor:** com exatamente `limit`, `limit + 1` e `2 × limit + 1` elegíveis, a atividade da posição `limit + 1` aparece como primeira da página seguinte, sem ausência nem repetição; no apontamento, inclusive quando a deduplicação remove linhas perto da fronteira. Cursor inválido, adulterado ou incompatível com o endpoint retorna 400.
10. **Corrida com reinício:** um "Carregar mais" em andamento que termina depois de uma recarga pós-persistência (mesmos filtros) não altera a lista reiniciada, nem em sucesso, nem em erro, nem na finalização do carregamento.
11. Regressão do Kiosk ("Outra atividade") e da ação Apontar no cartão de planejamento (`handleCardPointTime`).

Execute os testes direcionados e os builds de frontend e backend previstos no projeto, além do lint aplicável. Para o risco de SQL/paginação, inclua **teste de integração em banco isolado** que execute as consultas reais; mocks de listas prontas não comprovam LIMIT, keyset ou deduplicação. Não rodar testes de escrita em banco compartilhado. Se não houver ambiente, registrar a limitação, sem declarar validação de banco concluída.

Registre comandos, exit codes e falhas reais. Compare falhas preexistentes na base somente quando necessário para avaliar a mudança. Não corrigir problemas alheios ao escopo para produzir uma alegação de suíte verde. Faça uma verificação visual no navegador; se indisponível, registre-a como pendente.

## Entrega e Git

Prepare o diff e a candidata apenas na branch `hotfix/listagem-atividades-tati`, com base registrada na main. A execução deste prompt contempla commit da correção, testes e retorno e push normal **somente dessa branch** após os gates pertinentes. Se houver bloqueio, entregue o estado concreto e a evidência sem forçar a publicação.

Não fazer merge em `main`, `develop` ou `homol`, não fazer deploy, não usar force-push, não reescrever histórico e não apagar branches. A homologação humana vem antes de qualquer merge ou deploy. Depois da aprovação e integração na main, o mesmo hotfix deverá ser reconciliado na develop por operação separada, preservando as alterações já existentes nela.

Se salvar este prompt no repositório, usar `docs/ai/prompts/hotfix-listagem-atividades-tati.md`.
Gerar/atualizar `docs/ai/returns/hotfix-listagem-atividades-tati-retorno.md` com:

- Causa de cada tela, separando comprovado, provável e excluído por regra; resultado da comparação nas posições 50/51 e 100/101; limites da reprodução real/sintética.
- Branch, SHA de base, SHA final, arquivos alterados, estado do working tree e situação de commit/push.
- Contrato de paginação adotado (cursor, `nextCursor`, ordenação e desempate) e impacto nas regras existentes, incluindo qualquer mudança visível de ordem.
- Comandos/testes executados, exit codes, resultado visual, riscos e pendências.
- Roteiro curto para a Tati homologar na OS 7467: atividades das tarefas 12 a 21 no Apontar horas e as posteriores a Montar bancos traseiros no backlog, além dos dados adicionais estritamente necessários para confirmar o incidente real.
- Declaração do estado de merge/deploy/migrations e próxima ação.

Atualize o checkpoint apenas conforme o protocolo do projeto, sem inventar percentuais de tokens. A resposta final deve distinguir **correção implementada**, **validada em ambiente isolado** e **homologada pela Tati**. Uma etapa não comprova as outras.
