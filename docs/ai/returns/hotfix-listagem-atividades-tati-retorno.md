# Retorno — hotfix-listagem-atividades-tati

- **TASK_ID:** `hotfix-listagem-atividades-tati`
- **Data/hora:** 2026-10-20, ~17:05 UTC
- **Prompt:** `docs/ai/prompts/hotfix-listagem-atividades-tati.md` (cópia literal do anexo)
- **Objetivo:** corrigir atividades ausentes em **Apontar horas** (web e Kiosk) e no **backlog do Planejamento**, com paginação por cursor ("Carregar mais"), mantendo as regras atuais.
- **Status final:** **CORREÇÃO IMPLEMENTADA e VALIDADA EM AMBIENTE ISOLADO** (banco Postgres local e descartável, com dados sintéticos). **NÃO homologada pela Tati.**
- **Branch:** `hotfix/listagem-atividades-tati`, criada a partir de `origin/main`.
- **SHA inicial (base):** `40a519ddadcbc3b29286b8229d6cd7c3c3540e6b` (`origin/main`, sem avanço desde a consulta do prompt).
- **SHA final:** o do commit que contém este arquivo (`git log -1 origin/hotfix/listagem-atividades-tati`).

## Três estados, separados

| Etapa | Situação |
|---|---|
| Correção implementada | Sim (backend, web, Kiosk, Planejamento). |
| Validada em ambiente isolado | Sim. Banco local, testes de integração com as consultas reais e navegador (notebook e celular). Tudo com **dados sintéticos**. |
| Homologada | **Validação informada pelo usuário (Gustavo) em 2026-10-20**, após a entrega da branch. O registro formal do aceite da Tati pelo roteiro abaixo continua recomendado antes do merge. |

## Causa por tela

### Apontar horas (web e Kiosk)

- **Comprovado no código:** havia três consultas, uma por origem (alocação estrutural, plano publicado e fora da alocação), cada uma com `LIMIT` próprio (50 na web e 20 no Kiosk), sem continuação. O drawer substituía a lista pela resposta.
- **Comprovado com dados sintéticos** (script de diagnóstico rodado contra o código **original**): numa esteira com 21 tarefas e 126 atividades, em cada uma das três origens:
  - a posição 50 é **Ombreira** (tarefa 11, última atividade);
  - a posição 51 é a 1ª de **Forros de portas** (tarefa 12);
  - a resposta com LIMIT é exatamente o prefixo da lista sem LIMIT;
  - ficam inacessíveis 76 atividades, das tarefas 12 a 21.

  A resposta da API (origem "fora da alocação", pesquisa pela OS) tinha 50 itens e terminava em Ombreira, que é o relato da Tati.
- **Calibração:** a fixture foi montada com 43 atividades nas tarefas 1–10. Assim, a coincidência com "Ombreira" **demonstra o mecanismo, não o caso real**. As contagens das tarefas 11–21 seguem o print.
- **Provável no caso real:** a Tati usou "7467" com **Buscar outras atividades**. A lista dela vinha da origem "fora da alocação" (talvez também das outras origens), cortada em 50. **Não confirmado com dados reais:** não houve acesso ao banco de produção.

### Planejamento (backlog)

- **Comprovado no código:** havia `LIMIT 100` após filtros e ordenação (`cv.name`, tarefa, setor, atividade), sem continuação.
- **Comprovado com dados sintéticos:** foram usadas uma esteira "OS 7466 …" com 27 elegíveis e a "OS 7467 …" com 126, ambas encontradas pela pesquisa.
  - A posição 100 é a **última de Montar bancos traseiros** (tarefa 14).
  - A posição 101 é a 1ª de **Montar bancos dianteiros**.
  - Ficam inacessíveis 53 atividades, das tarefas 15 a 21.

  Só com a OS 7467, o corte cairia em "Montagem veículo".
- **Hipótese (a confirmar):** no caso real, outras esteiras com nome anterior na ordenação ocuparam posições antes da OS 7467. Isso acontece se a pesquisa não foi aplicada (o campo recarrega a cada tecla) ou se ela casou com outras esteiras. Também pode haver atividades da OS excluídas por regra (já em plano, saldo zero). **A demonstrar com os dados reais.**

### Excluído por regra atual (não alterado)

- Atividade concluída, esteira fora de A_INICIAR/EM_ANDAMENTO (apontamento) e esteiras FINALIZADA/CANCELADA/EM_ELABORACAO/AGUARDANDO_PLANEJAMENTO (backlog).
- Itens já em plano semanal ou de esteira ativos (backlog), saldo zero (backlog) e "fora da alocação" sem checkbox ou com termo de menos de 2 caracteres.
- **Inconsistência preexistente, documentada e não corrigida:** o backlog exclui só STEP `COMPLETED`; STEP `ABORTED` (dispensado) continua elegível nele, enquanto o apontamento exclui os dois. Está coberto por teste que fixa o comportamento atual.

### Posições 50/51 e 100/101 — resultado

| Lista | Posição limite | Próxima (1ª ausente antes) | Igual ao relato? |
|---|---|---|---|
| Apontar — cada origem | 50 = Ombreira · S2 · A3 (tarefa 11) | 51 = Forros de portas · S1 · A1 (tarefa 12) | Sim no sintético (calibrado) |
| Backlog | 100 = Montar bancos traseiros · S2 · A6 (tarefa 14) | 101 = Montar bancos dianteiros · S1 · A1 | Sim no sintético (com 27 itens de outra esteira antes) |

**Limite da reprodução:** é sintética. A correspondência no caso real (OS 7467, usuário da Tati) continua **pendente**.

## Contrato de paginação adotado

- **Keyset com cursor opaco** (`base64url` de `{s: escopo, k: chave}`), validado no backend. Cursor ausente indica a primeira página. Cursor malformado, adulterado ou de outro endpoint retorna **HTTP 400** ("Cursor de paginação inválido. Recarregue a lista.").
- **`limit + 1`:** a linha extra só indica continuação. O **`nextCursor` vem do último item devolvido** (após deduplicação) e é `null` no fim.
- **Tamanhos de página:** 50 no apontamento web, máximo de 50 mantido; 100 no backlog, máximo de 100 mantido. O **Kiosk mantém 20** por página (tamanho atual, sem mudar a apresentação).
- **Apontar horas (`/me/time-entry-candidates` e `/production/me/time-entry-candidates`):**
  - um único SQL: `UNION ALL` das três origens e `DISTINCT ON (step)` pela maior precedência (alocação → plano → fora da alocação);
  - **sem LIMIT interno**; elegibilidade, pesquisa (`q` livre e `OS & atividade`) e deduplicação valem para o conjunto inteiro;
  - ordem e chave: origem → [plano: atrasada, data, `planned_order`] → tarefa → setor → atividade → `step.id`;
  - `meta`: `collaboratorId`, `unavailableReason`, **`limit`**, **`nextCursor`**.
- **Backlog (`/operational-planning/backlog`):** chave `(cv.name, opt.order_index, area.order_index, step.order_index, step.id)`; `meta` = `{ limit, nextCursor }`.
- **Mudança visível de ordem:** nenhuma. Cada origem mantém sua ordem funcional anterior. Só os **empates** (mesmos `order_index`), que antes tinham ordem indefinida, agora seguem `step.id`.
- **Itens preservados:** `isAssignedToMe`, `requiresJustification`, `plannedDate`, `isOverdue`, sequência e justificativas. A análise de sequência roda sobre os itens da página.
- Sem migration e sem índice novo: as consultas usam os mesmos joins e filtros, e só o LIMIT mudou de lugar.

## Comportamento do frontend

O hook `useCursorPagedList` é usado no drawer, no Kiosk e no backlog.

- **Fim e continuação:**
  - botão **"Carregar mais"** (sem rolagem infinita);
  - o fim da lista é decidido **só por `nextCursor` nulo**.
- **Respostas antigas e chamadas duplicadas:**
  - cada reinício incrementa uma **geração**: busca, checkbox e recarga após persistência, mesmo com os mesmos filtros;
  - respostas de geração anterior são descartadas no sucesso, no erro e na finalização;
  - botão desabilitado durante o carregamento; cliques repetidos não disparam nova requisição.
- **Erro em página posterior:** mantém os itens, mostra o erro e oferece **"Tentar novamente"** com o mesmo cursor; a deduplicação defensiva é por ID.
- **Após apontamento ou conclusão (drawer):** recarrega da 1ª página com a mesma pesquisa e o mesmo checkbox.
- **Kiosk:** ao concluir, o fluxo fecha (como antes); ao reabrir, começa da 1ª página.
- **Planejamento:**
  - após salvar, publicar ou concluir, recarrega da 1ª página com a mesma busca;
  - inclusão **só no rascunho local** oculta o item e **mantém páginas e cursor**, sem refazer a consulta;
  - se todas as páginas carregadas estiverem no plano local e houver continuação, a mensagem não é definitiva e "Carregar mais" continua disponível;
  - erro de carregamento do backlog agora aparece no painel (antes só ia ao log).
- **`handleCardPointTime` (cartão do Planejamento → Apontar):** pedia `limit: 100`, acima do máximo de 50, recebia 422 e **sempre** caía no fallback. Agora percorre as páginas, com até 10 de 50, pesquisando pelo nome da atividade, até achar o candidato. Se não achar, mantém o fallback anterior. As permissões ficaram inalteradas.

## Arquivos

**Backend (alterados):**
- `server/src/modules/my-activities/my-activities.{repository,service,schemas,controller}.ts`: as três consultas foram substituídas por `listTimeEntryCandidatesPage`.
- `server/src/modules/production/production-time-entry-candidates.controller.ts`
- `server/src/modules/operational-planning/operational-planning.{repository,service,schemas,controller}.ts`

**Backend (novos):**
- `server/src/shared/pagination/keysetCursor.ts`
- `server/src/tests/listing-pagination.integration.test.ts` (13 cenários)
- `server/src/tests/listingPaginationFixtures.ts`
- `server/src/tests/keyset-cursor.test.ts`

**Testes backend ajustados ao novo contrato:**
- `my-activities-time-entry-candidates.test.ts` (mocks da consulta única; a deduplicação agora é coberta na integração);
- `operational-planning.backlog-eligibility.test.ts` (+ casos de `nextCursor` e de 400).

**Frontend (alterados):**
- `src/features/shell/QuickTimeEntryDrawer.tsx`
- `src/features/kiosk/KioskOutraAtividadeFlow.tsx`
- `src/features/operational-planning/OperationalPlanningPage.tsx`
- `src/features/operational-planning/planningCardActions.ts`
- `src/services/my-activities/myActivitiesApiService.ts`
- `src/services/production/productionApiService.ts`
- `src/services/operational-planning/operationalPlanningApiService.ts`
- `src/domain/operational-planning/operational-planning.types.ts`

**Frontend (novos):**
- `src/lib/pagination/useCursorPagedList.ts` (+ teste)
- `src/components/ui/LoadMoreFooter.tsx`
- `src/features/operational-planning/planningBacklogListState.ts` (+ teste)
- `src/features/shell/QuickTimeEntryDrawer.pagination.test.tsx`
- `src/features/kiosk/KioskOutraAtividadeFlow.pagination.test.tsx`
- `planningCardActions.test.ts` (+ 3 casos)

**Docs:** este retorno, o prompt e `docs/ai/context/SESSION_CHECKPOINT.md`.

**Migrations:** **nenhuma**. `package*.json`, `.github/` e secrets **não foram tocados**.

## Validação (comandos reais, ambiente isolado)

O banco usado foi um Postgres 16 local criado nesta sessão (`initdb`, porta 55432, banco `sgp_hotfix_test`), com migrations `0001`–`0053` e seed aplicados **só nele**. Nenhum banco compartilhado foi usado.

| Comando | Resultado |
|---|---|
| Diagnóstico **antes** (`tsx diag-before.ts` contra o código original) | exit 0; cortes 50/51 e 100/101 conforme a tabela acima |
| Testes novos de integração rodados num worktree **da main sem correção** | **12/12 falham** (ex.: `expected [ 50 ] to deeply equal [ 50, 50, 26 ]`; backlog `[ 100 ]` vs `[ 100, 53 ]`; 139 de 186 itens com sobreposição) |
| Teste do drawer na main sem correção | **5/5 falham** |
| `npx vitest run src/tests/listing-pagination.integration.test.ts` (com correção) | exit 0, **13/13** (o 13º, incluído após a revisão, cobre plano com atrasadas e `planned_order` invertido na fronteira de página) |
| `npx vitest run` dos 6 arquivos backend relacionados + `keyset-cursor` | exit 0, todos passam |
| `npm --prefix server run build` (`tsc -p`) | exit 0 |
| `npm --prefix server test` (suíte completa, com banco) | exit 1: **2 falhas preexistentes**, idênticas na main (`env.test` fallback de versão; `operational-planning.weekly-view.http` `=SUM`); 1318 passam e 17 são ignorados |
| `npx tsc -b` (frontend) | exit 0 |
| `npm run build` (frontend) | exit 0 (só o aviso de chunk > 500 kB, preexistente) |
| `npx vitest run` (frontend, completo, versão final) | exit 0, **223 arquivos / 1460 testes** (main: 219 / 1438) |
| `npm run lint` | exit 1, **117 problemas (94 erros, 23 avisos), iguais aos da main** (mesmo conjunto de arquivos; nenhum novo). Observação: rodar o lint com `server/dist` presente acrescenta 29 erros de `.d.ts` gerados; o diretório foi removido |

**Verificação visual** (Chromium/Playwright, API e Vite locais, dados "OS 7466/7467 VISUAL", notebook 1366×768 e celular 390×844):
- **Apontar horas** ("7467 VISUAL" + Buscar outras atividades):
  - a página 1 tem 50 cartões e o último é Ombreira · S2 · A3;
  - "Carregar mais" leva a 100 e depois a 126 cartões; o último é Revestir Painel · S2 · A3;
  - o botão "Apontar" do último cartão está na área visível, recebe o clique (`elementFromPoint`) e abre o formulário. OK nos dois tamanhos.
- **Planejamento** (busca "VISUAL"):
  - a página 1 contém Montar bancos traseiros · S2 · A6 e não contém dianteiros;
  - depois de "Carregar mais", aparece Revestir Painel · S2 · A3 e o rodapé some (fim);
  - o último "Adicionar ao plano" está visível e clicável no painel com rolagem própria. OK nos dois tamanhos.
- As capturas ficaram só na sessão (não versionadas).
- **Kiosk:** não houve verificação visual no navegador, porque exige token/PIN do quiosque. Está coberto por teste de componente: paginação de 20, acréscimo e resposta antiga descartada. **Pendente visualmente.**

## Mapa critério de aceite → evidência

| # | Critério | Cobertura |
|---|---|---|
| 1 | 21 tarefas e >100 elegíveis; corte em 50/100 antes e alcance até Revestir Painel depois; último botão acionável | Integração ("cenário Tati" e "backlog Tati"), diagnóstico antes e visual nos dois tamanhos |
| 2 | >50 por origem com sobreposição; conjunto exato e precedência | Integração "mais de 50 em cada origem…" (186 IDs em ordem exata; alocação vence plano; plano vence fora) |
| 3 | >100 no backlog, conjunto exato | Integração "backlog Tati" (153 IDs em ordem exata) |
| 4 | Empates, multi-esteira, pesquisa por OS, `OS & atividade`, troca de busca e checkbox sem resposta antiga | Integração "empates…" e Kiosk `&`; drawer "mudança de pesquisa…" e "apontamento…" (checkbox); hook "corrida" e "primeira página antiga" |
| 5 | Exclusões legítimas, usuário sem colaborador e justificativas | Integração "exclusões…", "sem Buscar outras…" e "usuário sem colaborador…"; unitários de `requiresJustification` |
| 6 | 1ª página do backlog toda no plano local | `planningBacklogListState.test.ts` + `useCursorPagedList` ("página vazia com cursor mantém continuação") |
| 7 | Erro em página posterior e cliques repetidos | Hook + drawer (erro → "Tentar novamente" com o mesmo cursor, sem duplicar; cliques repetidos = 1 requisição) |
| 8 | Recarga após apontamento e após persistir o planejamento; rascunho local mantém páginas | Drawer "apontamento em atividade da página 2…"; no Planejamento, recarga em salvar/publicar/concluir (código) e rascunho local sem refetch (código + visual). **Sem teste de componente do `OperationalPlanningPage` inteiro**: a página tem 2,5 mil linhas e muitas dependências |
| 9 | Fronteira do cursor (limit, limit+1, 2×limit+1, deduplicação na fronteira) e cursor inválido 400 | Integração "fronteira do cursor…" (apontamento e backlog) e "cursor inválido…" (web, Kiosk e backlog); `keyset-cursor.test.ts` |
| 10 | Corrida com reinício pós-persistência (sucesso, erro e finalização) | `useCursorPagedList.test.ts` "corrida…" |
| 11 | Regressão do Kiosk e de `handleCardPointTime` | Integração do Kiosk + teste de componente; `findTimeEntryCandidateForPlanningCard` (página posterior, fim, `&`) |

## Revisão independente (`sgp-test-reviewer`)

- **Veredito:** PASSA COM RESSALVAS, **nenhum bloqueante**.
- **Comandos reexecutados pelo revisor:**
  - `tsc` server e frontend: exit 0;
  - 7 arquivos backend: 67 testes, exit 0;
  - frontend (pagination/shell/kiosk/planejamento): 352 testes, exit 0;
  - eslint nos arquivos do diff: 0 erros (3 avisos preexistentes).
- **Confirmações do revisor:**
  - filtros equivalentes às 3 consultas originais;
  - precedência e dedup iguais ao `seenStep` antigo;
  - ordem visível inalterada;
  - sem risco de NULL no keyset;
  - mesma colação no keyset do backlog.
- **Recomendações:**
  - teste com itens atrasados na fronteira: **feito** (13º cenário);
  - documentar que, se a origem de um step mudar entre páginas, ele pode mudar de posição (é inerente ao keyset; a repetição é contida pela dedup no cliente): registrado no risco 6;
  - EXPLAIN com volume de produção: risco 3;
  - testes de componente da página do Planejamento: lacuna aceita (critérios 6, 8 e 11 cobertos por função pura, leitura de código e verificação visual).

## Riscos e pendências

1. **Homologação real pendente:** sem acesso ao banco nem ao navegador de produção, o caso exato da OS 7467 não foi reproduzido.
2. **"Agenda da semana"** (`/app/agenda-semanal`) usa o mesmo endpoint do backlog com `limit: 100` e o mesmo `handleCardPointTime` com `limit: 100`. Ficou **fora do escopo** do hotfix: continua mostrando só a 1ª página, compatível com o contrato porque `meta.limit` foi mantido. O botão "Apontar" dela continua caindo no fallback. Está registrada como pendência, com correção análoga sugerida.
3. **Desempenho:** sem LIMIT interno, a consulta sem pesquisa do usuário ordena todo o conjunto elegível (alocadas + plano) antes de paginar, e a origem "fora da alocação" exige um termo de 2 ou mais caracteres. O tempo foi baixo no banco local; **não foi medido com o volume de produção**. Os indícios não justificam índice novo.
4. **Kiosk:** falta a verificação visual no navegador.
6. Se a alocação ou o plano de uma atividade mudar entre duas páginas do Apontar horas, a origem dela muda e a atividade pode mudar de posição (pular ou repetir; a repetição é descartada no cliente). Recarregar a lista resolve.
5. Cursor com `cv.name` muito longo é aceito até 2048 caracteres codificados; nomes maiores (improváveis) causariam 400 ao "Carregar mais".

## Roteiro curto para a Tati (OS 7467)

Fazer numa versão com este hotfix, num ambiente de homologação.
1. **Apontar horas:** pesquisar "7467", marcar **Buscar outras atividades** e rolar até o fim.
   - Esperado: botão **Carregar mais**. Clicar até ele sumir.
   - Conferir atividades das **tarefas 12 a 21**: Forros de portas, Acabamentos, Montar bancos traseiros/dianteiros, Tampão, Montagem veículo, Limpeza final, Inspeção, Revestir Painel.
   - Apontar numa atividade de página posterior: após salvar, a lista volta ao início com a mesma pesquisa.
2. **Sem marcar o checkbox:** repetir para ver só "Minhas atividades" e "Carregar mais", se houver mais de 50.
3. **Gestão → Planejamento:** digitar "7467" e clicar em **Buscar**. Rolar o backlog e usar **Carregar mais** até ele sumir.
   - Conferir as atividades **posteriores a Montar bancos traseiros** (bancos dianteiros, Tampão, Montagem veículo, Limpeza final, Inspeção, Revestir Painel).
   - Arrastar ou adicionar uma delas ao rascunho: o item some e a lista continua de onde estava.
   - Salvar: a lista recomeça da 1ª página.
4. **Kiosk → Outra atividade:** pesquisar "7467" e usar Carregar mais.

**Dados adicionais estritamente necessários** para confirmar o incidente real (somente leitura):
- usuário/colaborador da Tati e a data do relato;
- se a pesquisa "7467" estava aplicada no backlog (botão Buscar);
- contagem de atividades da OS 7467 por tarefa e, por ID, quais estavam elegíveis no backlog (não concluídas, saldo > 0, fora de planos) e nas origens do apontamento naquele dia;
- versão implantada na VPS no dia.

## Git, merge, deploy e migrations

- Commit e push **somente** da branch `hotfix/listagem-atividades-tati` (detalhes no fim da sessão / `git log`). **Sem PR aberta**: o prompt não pediu.
- **Sem merge** em `main`, `develop` ou `homol`. **Sem deploy.** **Sem migration.** Sem force-push.
- **Próxima ação:**
  1. homologação humana (roteiro acima);
  2. se aprovada, PR para `main` com aprovação explícita;
  3. depois, reconciliar na `develop` em operação separada. Na `develop` existem 18 commits a mais; conferir conflitos em `my-activities.repository.ts` e `QuickTimeEntryDrawer.tsx`.

## Uso de contexto

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
