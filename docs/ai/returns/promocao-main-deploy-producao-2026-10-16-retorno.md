# Retorno — promocao-main-deploy-producao-2026-10-16

- **TASK_ID:** `promocao-main-deploy-producao-2026-10-16`
- **Data/hora:** 2026-10-16 17:40 UTC
- **Objetivo:** auditar a liberação `develop → main` e, só se todos os gates passassem, promover para `main` e acompanhar o deploy em produção (HostGator).
- **Prompt:** `docs/ai/prompts/promocao-main-deploy-producao-2026-10-16.md`
- **Status final:** **BLOQUEADO POR GATE** (parado na Fase A, item 7 — gate de aceite).
- **Branch de trabalho:** `ccr-fbc450f2-g81mhb` (criada a partir de `origin/main`; recebe apenas este retorno, o prompt e o checkpoint)
- **SHA inicial da branch de trabalho:** `c611d10feacf329bdc217fe391ebf47a90a6ea7a`
- **SHA final:** o do commit que contém este arquivo (`git log -1 origin/ccr-fbc450f2-g81mhb`).

## Resultado em uma frase

A `develop` contém, além da pesquisa `OS & Atividade` do Kiosk, pelo menos oito outras frentes funcionais **sem aceite humano documentado**. A pesquisa também **não pode ser publicada isolada** sem portar código não homologado. Por isso nada foi promovido: `main`, `homol`, produção, banco e workflows não foram tocados.

## SHAs das branches (inicial = final; nenhuma foi alterada)

| Branch | SHA inicial | SHA final |
|---|---|---|
| `origin/main` | `c611d10feacf329bdc217fe391ebf47a90a6ea7a` (1.9.8) | igual |
| `origin/develop` | `247b698589edf78d90f01461b264821f143ccd5a` (1.9.9) | igual |
| `origin/homol` | `6b768c852a18b7428e3dadf761bad7e35c1d61ef` | igual |

- `git merge-base --is-ancestor origin/main origin/develop` → exit 0 (promoção seria fast-forward).
- `homol` é ancestral de `main` e está **76 commits atrás de `main`** e 143 atrás de `develop` (último commit em 2026-09-07). O fluxo `develop → homol → main` não está sendo seguido; não há exceção documentada para esta publicação.
- Produção hoje: último run do workflow `Deploy HostGator VPS` = #24, `success`, `c611d10f` (1.9.8), 2026-10-02 19:20 UTC — https://github.com/multivacia/sgp/actions/runs/37053500596

## Delta `main..develop`

- 67 commits (63 sem merge + 4 merges: #37, #34, #35 e o merge de atualização da #34).
- 269 arquivos, +37 530 / −2 294. Fora de `docs/` e `*.md`: **172 arquivos, +8 229 / −872** (backend, frontend, `package.json`, `package-lock.json`, `vite.config.ts`, plugin Vite novo, scripts).
- `server/migrations/`: **nenhuma diferença** (53 arquivos em ambas, último `0053`).
- Nenhuma PR aberta ou branch pendente embutida: #36 (backup/restore), #27 (data sugerida), #7 (resumo de capacidade), #4 (homologação), `kiosk-redesign-zero-scroll` (carrossel), `time-efficiency`, `admin-session-idle-sync`, `conveyor-progress-operational-evolution` (sessão), `theme-contrast`, `backup-management`, `export-planejamento-xlsx`, `kiosk-consolidacao-zero-scroll-outra-atividade` e `kiosk-outros-apontamentos` **não são ancestrais** da `develop`, e `git cherry` não encontrou patch equivalente.

## Gate de aceite — inventário

| Funcionalidade | Commits | Evidência de aceite | Risco em produção | Decisão pendente |
|---|---|---|---|---|
| **Pesquisa `OS & Atividade` no Kiosk** (Buscar atividade… e Outra atividade) | `f4d38a42`, `ba9adf06`, `4a0bc0bf`, merge `247b6985` (PR #37) | **Homologação informada pelo usuário neste pedido.** PR #37 integrada por `multivacia` em 16/10; CI `verify` verde. | **Médio.** Ver achados 1 e 2: a fila do Kiosk passou a expor cliente, veículo e placa, contrariando teste de contrato existente; o teste novo de "Outra atividade" falha com banco real (fixture). | Aceitar ou não a exposição desses campos no Kiosk; corrigir fixture e contrato dos testes. |
| **Ajustes da Tati — frente A**: filtros/períodos, Minha fila por período, PDF Retrato/Paisagem, Extra Esteira, justificativas, Dashboard, pesquisa "esteira & atividade" na web, planejamento por período entre semanas, exportação para IA | `935dc943` (56 arq.), `438f8a00` (25 arq.) | **Nenhuma.** Os retornos `ajustes-tati-2026-10-07-retorno.md` e `...-integracao-retorno.md` dizem "sem homologação; a aceitação depende da validação com a Tati". Nenhum registro de aceite encontrado em `docs/`. | **Alto.** Novos endpoints (planejamento por período, export IA), mudanças em fila, jornada, dashboard e progresso de esteiras. | Aceite da Tati / do responsável. |
| **Apontamento só em atividade planejada** (web, Kiosk e gestor) | `61757c26`, `b080c047`, `13c9495c`, `71b9d12d`, `d3ecb3fa`, `bd88ccf8`, `54b23b5f` | Promoção para `develop` autorizada pelo Gustavo em 08/10 **"para homologação"**. O retorno pede "homologar na develop e comunicar os gestores antes de levar para `homol`/`main`". Pendência com a Tati (distribuição em mais de um dia). Sem registro de aceite. | **Alto.** Gate no backend recusa apontamentos em atividades não planejadas; a fila do Kiosk passa a listar todas as atividades planejadas em aberto. Muda a operação de chão de fábrica. | Homologação explícita e comunicação aos gestores. |
| **Menu "? Ajuda" + Manual do Usuário integrado** | `0b19d7e2`, `a10d4bf1`, `1924ae01` | Retorno: "validado em código, build e navegador. **Não validado em produção.**" Sem aceite humano. | **Médio.** Altera o build (`vite-plugin-manual-usuario.ts`, `vite.config.ts`, `tsconfig.node.json`) e adiciona dependência `marked`. | Aceite funcional. |
| **Tema claro/escuro nos Guias + guia do gestor por permissão** | `c10301b2`, `437cffbd` (PR #34) | PR #34 mergeada por `multivacia` em 14/10. A regra "guia do gestor por permissão" foi aprovada pelo humano. O retorno da PR lista como pendente a "homologação visual humana dos guias dentro do SGP+". | Baixo/médio. | Confirmar se o merge da #34 vale como homologação. |
| **Textos pt-BR** (remove pt-PT, STEP e nomes técnicos de telas e mensagens da API) | `79f08bab`, `dfdaba7b` (PR #35) | Merge autorizado pelo usuário; CI verde. Sem registro de homologação. | Baixo/médio. Mensagens de erro da API mudaram. | Confirmar se o merge autorizado vale como aceite. |
| **Guias Práticos de Colaborador e Gestor** | `3d6f1a30`, `a4a3d5d6` | Retorno: "**PRONTO PARA VALIDAÇÃO DA TATI — COM RESSALVAS**". O próprio prompt avisa que isso não equivale a homologado. | Baixo (documentação), mas visível ao usuário pelo menu Ajuda. | Aceite da Tati. |
| **Manual do Usuário** (capítulos 4 a 19, auditorias, gerador HTML) | ~40 commits `docs(manual)` / `docs(ai)` | Auditoria final registrada; sem aceite humano registrado. | Baixo (documentação), visível ao usuário. | Aceite do conteúdo. |
| **Metadados da release 1.9.9** | `ecb26da7` | — | `releaseName` = "Ajuda contextual e Manual do Usuário integrado" (07/10) **não descreve** ajustes da Tati, regra de apontamento planejado, textos nem pesquisa do Kiosk. | Autorizar ajuste de versão/`releaseName` (não editado aqui). |

**Conclusão do gate:** só a primeira linha tem aceite. Pela regra de parada do prompt, a promoção integral está bloqueada.

## Liberação isolada da pesquisa do Kiosk (Fase A, item 8)

Simulação somente leitura com `git merge-tree --write-tree --merge-base=<c>^ origin/main <c>` (nenhum branch criado ou alterado):

| Commit | Resultado sobre `main` |
|---|---|
| `f4d38a42` (Outra atividade) | **CONFLITO** em `server/src/modules/my-activities/my-activities.controller.ts` |
| `ba9adf06` (docs) | conflito modify/delete no retorno (só docs) |
| `4a0bc0bf` (Buscar atividade…) | backend auto-mescla; conflito só no retorno (docs) |

Dependências exatas:

- `f4d38a42` move `resolveCandidateSearchTerms`, que **não existe em `main`**; foi criada em `438f8a00` (ajustes da Tati), junto com `server/src/shared/accentInsensitiveSearch.ts`.
- `438f8a00` é um commit único que também traz o planejamento por período e a exportação para IA (25 arquivos). Portar a pesquisa exigiria backport parcial de funcionalidade não homologada.
- `production-work-queue.service.ts` da `develop` mistura a pesquisa com a regra de apontamento planejado (`allOpenPlanned: true`). A homologação foi feita sobre esse comportamento, que não existe em `main`.

**Conclusão:** a liberação isolada não é possível sem backport de regras não aprovadas. Nenhum backport nem branch de release foi criado.

## Achados técnicos

1. **Kiosk passa a receber cliente, veículo e placa.** `4a0bc0bf` adiciona `conveyorCode`, `clientName`, `vehicleDescription` e `licensePlate` ao item de `GET /api/v1/production/me/work-queue`. O teste existente `production-work-queue.integration.test.ts` › "não retorna campos sensíveis no item" exige o contrário e **falha com banco real**. Ele passa no CI e em execução isolada só porque a lista de itens fica vazia. O teste não foi atualizado na PR. Conflita com "preservar isolamento do kiosk/produção" e precisa de decisão humana.
2. **Teste novo de "Outra atividade" falha com banco real.** `production-unassigned-time-entries.integration.test.ts` › "pesquisa Esteira & atividade (q com &)" devolve 0 itens. Causa: a fixture não cria item de plano publicado, que a regra de apontamento planejado passou a exigir. Prova: uma cópia temporária do teste com `seedPublishedPlanItem` passou (1/1); o arquivo foi removido. É defeito de teste, **não do produto**.
3. **CI não detecta os achados 1 e 2.** O workflow `verify` não sobe banco, e os testes de integração ficam `skipIf(!hasDb)`.
4. `server/src/tests/env.test.ts` espera versão `1.9.4`: falha preexistente, também em `main`.
5. `operational-planning.weekly-view.http.test.ts` (fórmula `'=SUM(A1:A9)`) falha com banco: preexistente, também em `main`.
6. `git diff --check origin/main..origin/develop` → exit 2, apenas espaços finais em 3 arquivos Markdown. Não bloqueia.

## Validação executada

Worktrees limpos e destacados em `/tmp/claude-0/.../scratchpad/wt-develop` (`247b6985`) e `.../wt-main` (`c611d10f`). Banco de teste **local e descartável** (PostgreSQL 16 do contêiner, bancos `sgp_audit_test` e `sgp_audit_main`), criado do zero com as 53 migrations e removido ao final. Nenhum ambiente compartilhado foi usado.

| Comando (worktree) | Exit | Resultado |
|---|---|---|
| CI `Verify deploy readiness` run 38937061816 em `247b6985` | — | `success` |
| `npm ci` / `npm ci --prefix server` (develop) | 0 / 0 | ok |
| `npm run verify:deploy` (develop; mesmo comando do CI) | **0** | build ok; front 219 arquivos / 1463 testes ok; server operational-planning 170 ok + 19 pulados; work-queue 13 ok; sequence 15 ok |
| `server: npx tsc -p tsconfig.json --noEmit` (develop) | **0** | — |
| `server: npx vitest run` sem banco (develop) | 1 | 1 falha (`env.test`, preexistente) · 865 ok · 449 pulados |
| `server: npx vitest run` **com banco local** (develop) | 1 | **4 falhas** · 1295 ok · 16 pulados — `env.test`, `weekly-view.http`, **`production-unassigned` (&)**, **`production-work-queue` (campos sensíveis)** |
| `server: npx vitest run` **com banco local** (main) | 1 | 4 falhas · 1243 ok · 16 pulados — `env.test`, `weekly-view.http`, `my-activities-time-entry-candidates`, `my-work-queue.service` |
| `npx eslint .` (develop / main) | 1 / 1 | 123 / 94 erros. Os 29 a mais estão todos em `server/dist/*.d.ts`, gerado pelo build local. Erros no código-fonte: idênticos por arquivo e regra. |
| Sonda temporária do achado 2 | 0 | 1 ok (arquivo removido; worktree limpo) |

Novas falhas na develop em relação à main: só os achados 1 e 2. Duas falhas da main estão corrigidas na develop.

## Banco de produção e infraestrutura

- **Migrations aplicadas em `sgp_prod`: NÃO VERIFICADO.** A sessão não tem acesso: a política de rede bloqueou `sgp.multivacia.com` (proxy 403) e não há credencial SSH.
- O migrador (`server/src/scripts/migrate.ts`) **não mantém tabela de migrations aplicadas**; ele reexecuta todos os `.sql`. Confirmar o estado real exige inspeção do schema no próprio servidor.
- **Fase B e Fase C não executadas.** Sem acesso à VPS, sem backup, sem push, sem `workflow_dispatch`, sem deploy.
- Nenhuma migration executada em ambiente compartilhado.

## Rollback

Não aplicável: nada foi publicado. Referência: `main` = `c611d10f` (1.9.8), em produção desde o run #24.

## Decisões necessárias para continuar

1. **Aceite integral da 1.9.9:** registrar aceite de cada linha da tabela do gate, em especial ajustes da Tati e apontamento só em planejadas. Também decidir sobre a exposição de cliente/veículo/placa no Kiosk.
2. **Ou release isolada:** autorizar explicitamente um backport mínimo de `parseConveyorActivitySearch` / `resolveCandidateSearchTerms` para uma branch a partir de `main`. Isso exigiria nova homologação, porque o comportamento sem a regra de planejadas é diferente do homologado.
3. **Fluxo `homol`:** confirmar se a publicação passa por `homol` ou se há exceção aprovada.
4. **Acesso para a Fase B:** liberar o host de produção na política de rede, ou executar backup e verificações na VPS por um humano.
5. **Metadados:** autorizar o ajuste de `releaseName` da 1.9.9 e do `env.test.ts`.

## Arquivos desta atividade

- Criado: `docs/ai/prompts/promocao-main-deploy-producao-2026-10-16.md` (cópia literal do anexo)
- Criado: `docs/ai/returns/promocao-main-deploy-producao-2026-10-16-retorno.md`
- Alterado: `docs/ai/context/SESSION_CHECKPOINT.md`
- Código-fonte, testes, versão e migrations: **não alterados**.

## Git

- Commit e push normal apenas em `ccr-fbc450f2-g81mhb`. Sem PR, sem merge, sem force-push.
- `git status --short` final: limpo após o commit.
- Worktrees temporários de auditoria removidos ao final.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
