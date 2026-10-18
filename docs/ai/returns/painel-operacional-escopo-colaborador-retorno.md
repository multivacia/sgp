# Retorno — painel-operacional-escopo-colaborador

- **TASK_ID:** `painel-operacional-escopo-colaborador`
- **Data/hora:** 2026-10-18 22:35 UTC
- **Objetivo:** no Painel Operacional (`/app/backlog` → `GET /api/v1/conveyors`), perfil `COLABORADOR` vê somente OSs com pelo menos uma atividade ativa alocada diretamente ao seu colaborador; demais perfis mantêm a lista global.
- **Status final:** IMPLEMENTADO E TESTADO LOCALMENTE — **sem push, sem merge, sem deploy**.
- **Branch:** `fix/painel-operacional-escopo-colaborador` (a partir de `origin/develop`)
- **SHA inicial (`develop`):** `32a02eec15782df2a8d6f49a9148654e392ce7bd`
- **SHA final:** commit local único sobre o SHA inicial (ver `git log -1`); não publicado.
- **Prompt:** `docs/ai/prompts/painel-operacional-escopo-colaborador.md`

## Resumo

Escopo resolvido **no backend**, a partir do usuário autenticado (`app_users` + `app_roles`, via `findAppUserProfileById` já existente). Nenhum parâmetro do cliente participa da decisão. O frontend não foi alterado.

## Regra de visibilidade final

| Situação da conta | Resultado |
| --- | --- |
| `role_code = 'COLABORADOR'` com `collaborator_id` | Só OSs com `EXISTS` de alocação direta válida (abaixo) |
| `role_code = 'COLABORADOR'` sem `collaborator_id` | `200` com `[]` — sem consulta e sem fallback global |
| Conta não encontrada no perfil (defensivo; `requireAuth` já barra) | `200` com `[]` |
| Qualquer outro perfil (`GESTOR`, `ADMIN`, demais, inclusive sem perfil) | Lista global, idêntica ao comportamento anterior |

Alocação direta válida (predicado `EXISTS` correlacionado a `conveyors.id`):

- `cna.deleted_at IS NULL`;
- `cna.assignment_type = 'COLLABORATOR'`;
- `cna.collaborator_id = <colaborador da conta>`;
- nó `STEP`, `is_active = TRUE`, `deleted_at IS NULL`, da mesma esteira.

Sem recorte por situação da atividade (concluída/dispensada continuam contando). Alocação por equipe não conta. Filtros `q`, `priority`, `responsible`, `operationalStatus` e a ordenação `created_at DESC` foram preservados e são aplicados sobre o conjunto já autorizado.

## Arquivos

| Arquivo | Alteração | Justificativa |
| --- | --- | --- |
| `server/src/modules/conveyors/conveyors.repository.ts` | Tipo `ListConveyorsScope`; `listConveyors` recebe `scope` obrigatório e adiciona o `EXISTS` quando `COLLABORATOR` | Regra aplicada no SQL, sem `JOIN` que duplicaria linhas; parâmetro obrigatório impede chamada sem escopo |
| `server/src/modules/conveyors/conveyors.service.ts` | `serviceResolveConveyorListScope` (perfil → escopo) e `serviceListConveyors` com escopo; `NONE` retorna `[]` | Escopo derivado no servidor; conta sem vínculo nunca cai na lista global |
| `server/src/modules/conveyors/conveyors.list.controller.ts` | Resolve o escopo por `req.authUser.id` e repassa ao serviço | Único ponto de entrada de `GET /api/v1/conveyors` |
| `server/src/tests/conveyors-list-collaborator-scope.integration.test.ts` | Novo teste de integração HTTP (supertest + Postgres) | Cobre os 7 cenários obrigatórios e casos adicionais |
| `docs/ai/prompts/painel-operacional-escopo-colaborador.md` | Novo | Prompt da atividade (protocolo `CLAUDE.md`) |
| `docs/ai/returns/painel-operacional-escopo-colaborador-retorno.md` | Novo | Este retorno |

**Migrations:** nenhuma. Os índices existentes em `conveyor_node_assignees` (`collaborator_id`, `conveyor_id`, parciais em `deleted_at IS NULL`) atendem ao `EXISTS`.

## Escopo congelado — confirmação

- `listConveyors` (repositório) tem um único chamador: `serviceListConveyors`, chamado somente por `GET /api/v1/conveyors`. Dashboard (`listConveyorsForDashboard`) e Evolução das Esteiras (`listConveyorsForProgress`) usam funções próprias e **não foram tocados**.
- **Não alterados:** frontend (incluindo `BacklogPage.tsx`), Minha fila, Minha jornada, Apontamento de horas, Kiosk, Planejamento Semanal, Agenda da semana, Dashboard, Evolução das Esteiras, detalhe da esteira, `GET /conveyors/:id` e suas permissões, rotas (`conveyors.routes.ts` intacto), RBAC, manual, versão.
- Nenhum `collaboratorId` vindo do cliente é lido; teste comprova que é ignorado.

## Validação (execução real)

Ambiente: Postgres 16 local e descartável (sandbox), migrations `0001`–`0053` + seed aplicados.

| Comando | Resultado |
| --- | --- |
| `npx vitest run src/tests/conveyors-list-collaborator-scope.integration.test.ts` (server) | **12/12 passaram** |
| Mesmo teste contra o código original da `develop` (implementação em stash) | 8 falham / 4 passam — os testes detectam o problema; os 4 que passam são os cenários positivos/globais |
| `npm run build` (server, `tsc -p`) | exit 0 |
| `npx vitest run` (server, suíte completa) | 1299 passaram, 2 falharam, 16 ignorados — falhas **preexistentes**, idênticas na `develop` |
| `npx tsc -b` (raiz) | exit 0 |
| `npm test` (frontend) | 1438/1438 passaram (219 arquivos) |
| `npx eslint` nos 4 arquivos alterados/criados | exit 0, sem apontamentos |
| `npm run lint` (repositório) | exit 1 — 146 problemas, **mesma contagem na `develop`** (preexistentes, nenhum nos arquivos desta atividade) |

Cobertura dos testes obrigatórios:

1. Alocação direta em uma atividade → OS retornada. ✅
2. Sem alocação direta na OS `7070` (só outro colaborador) → OS não retornada. ✅
3. OS com duas atividades do colaborador → aparece uma vez. ✅
4. Alocação só por equipe (com o colaborador como membro) → não visível. ✅
5. `COLABORADOR` sem `collaborator_id` → `200` e `[]`. ✅
6. Gestor e Admin → todas as OSs, inclusive sem alocação para eles. ✅
7. Filtros `priority` e `q` dentro do escopo do colaborador. ✅

Adicionais: alocação com `deleted_at`, atividade inativa e OS sem alocação não aparecem; conjunto exato do colaborador; `collaboratorId` na URL ignorado para colaborador e gestor.

Falhas preexistentes (não relacionadas, já listadas no `SESSION_CHECKPOINT.md`):

- `src/tests/env.test.ts` — espera `1.9.4`, `app-version.json` está em `1.10.0`;
- `src/tests/operational-planning.weekly-view.http.test.ts` — asserção `'=SUM(A1:A9)'`.

## Decisões e ressalvas

- **Perfil sem `role_code` (NULL)** é tratado como não-colaborador → lista global, conforme “demais perfis mantêm o comportamento atual”. Se a regra desejada for o contrário, é ajuste de uma linha em `serviceResolveConveyorListScope`.
- **Colaborador vinculado inativo/excluído:** não há verificação extra; o recorte é pelo `collaborator_id` da conta. A conta de um colaborador desligado normalmente já fica inativa.
- **Edição/consulta direta por ID não muda:** um colaborador que conheça o ID de uma OS ainda pode abri-la pelo detalhe (`GET /conveyors/:id`) — fora do escopo, por decisão do prompt.
- O cenário real da Edna/OS `7070` não foi verificado em base compartilhada (sem acesso e sem autorização); a regra está coberta pelo teste equivalente.
- Uma query adicional por requisição (perfil do usuário) — custo desprezível.

## Próximo passo recomendado

Revisar o diff, publicar a branch e abrir PR para `develop`; homologar com a conta da Edna e com um gestor.

## Git

- `git status` final: limpo após o commit local.
- Commit: local, na branch acima. **Push: não realizado** (sem autorização; sessão sem permissão de escrita no remoto). **PR/merge: não.**
- Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
