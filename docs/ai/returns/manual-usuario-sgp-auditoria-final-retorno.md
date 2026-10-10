# Retorno — manual-usuario-sgp-auditoria-final

- **TASK_ID:** `manual-usuario-sgp-auditoria-final`
- **Data/hora:** 2026-10-04 16:05 UTC
- **Objetivo:** auditoria integral de `docs/manual/source/MANUAL_USUARIO_SGP.md` contra o código atual: coerência entre capítulos e com o produto, linguagem pt-BR, termos técnicos, referências cruzadas e cabeçalho.
- **Status final:** CONCLUÍDO (rodada documental). Build, lint e testes da aplicação **não foram executados** — não exigidos nesta rodada; testes existentes foram lidos como evidência.
- **Branch:** `docs/manual-usuario-sgp-auditoria-final`
- **SHA base (completo):** `2072f38bd220e66d682cc0d6399db69312b09d18` — tip de `origin/docs/manual-usuario-sgp-cap19`, conferido antes de criar a branch.
- **SHA final:** é o commit único desta branch que contém este arquivo (`git log -1 origin/docs/manual-usuario-sgp-auditoria-final`). Não é registrado aqui para evitar commit extra de ajuste.
- **PR, merge, rebase, force-push:** nenhum. Nenhuma promoção para `develop`, `main` ou `homol`. HTML não gerado.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | cabeçalho; capítulo 2 (2.3 e remoção da 2.6); capítulo 4 (4.3); capítulo 13 (estados da credencial e "Não consigo entrar"); capítulo 16 (16.5, quadro PIN); capítulo 21 (21.3) |
| `docs/ai/returns/manual-usuario-sgp-auditoria-final-retorno.md` | este retorno |

Nenhum arquivo fora desses dois foi alterado. Código da aplicação, HTML gerado, README e a matriz técnica `MANUAL_FUNCIONAL_SGP.md` não foram tocados. Migrations: nenhuma criada, alterada ou executada.

Resultado: o manual passou de 6553 para 6546 linhas (`git diff --stat`: 8 inserções, 15 remoções).

## Achados

### F-01 — Capítulo 2: texto e seção de "capítulos pendentes" obsoletos
- **Afirmação:** 2.3 dizia "Esse é o padrão que os capítulos pendentes deverão adotar quando forem escritos"; a seção 2.6 "Capítulos ainda pendentes" explicava o marcador `[PENDENTE DE ENRIQUECIMENTO …]`.
- **Evidência:** nenhum capítulo 1–21 contém o marcador (busca por `PENDENTE` após a correção: zero ocorrências). Nenhuma referência cruzada aponta para a seção 2.6.
- **Decisão:** CORRIGIDO NO MANUAL.
- **Alteração:** frase da 2.3 reduzida a "Os capítulos de recurso seguem a mesma sequência:"; seção 2.6 removida.

### F-02 — Capítulos 13 e 16: credencial "desabilitada"
- **Afirmação:** "desabilitada — o acesso foi desligado"; "Acesso desabilitado." — "o acesso de produção foi desligado"; selo **Desabilitado** — "o acesso foi desligado".
- **Evidência:** o estado existe (`server/src/modules/production/production-credential-status.ts`, `DISABLED` quando `enabled = false`). Só o teste grava `enabled = false` (`server/src/tests/production-auth.integration.test.ts:92`); nenhuma rota, tela ou script de produção o faz. **Redefinir PIN** grava `enabled = true` (`adminResetProductionPin` em `server/src/modules/admin-collaborators/admin-collaborators.repository.ts`). O script `seed-production-pins.ts` também religa.
- **Decisão:** CORRIGIDO NO MANUAL. A observação do capítulo 13 ("Não existe uma ação específica para desligar o PIN…") e o aviso do 16.5 já estavam corretos (JÁ ESTAVA CORRETO).
- **Alteração:** as três linhas passam a dizer que a credencial foi desligada fora das telas do sistema, que nenhuma tela atual produz esse estado e que **Redefinir PIN** religa o acesso.

### F-03 — Capítulo 4, seção 4.3: nomes de permissão "exatamente como na primeira coluna"
- **Afirmação:** os nomes na tela **Permissões por papel** aparecem exatamente como na tabela.
- **Evidência:** `server/migrations/0013_app_permissions.sql` contém sete nomes com dupla codificação (ex.: `Esteiras: gerir alocaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes por etapa`) e termina com `ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`. O migrador (`server/src/scripts/migrate.ts`) executa **todos** os arquivos a cada execução, então o nome corrompido é regravado em toda atualização. `rbac.repository.ts` lê `name` sem tratamento e `src/features/admin/rbac/RbacRolePermissionsPage.tsx:342` exibe `{p.name}`. As migrations 0016, 0019, 0036 e 0053 não têm o defeito. Já registrado como não corrigido no retorno do cap04 (item 3), sem verificação de banco.
- **Ressalva:** comprovado por código; **não** verificado em banco em execução (não há PostgreSQL neste ambiente). Por isso o texto não descreve a aparência exata dos símbolos.
- **Decisão:** CORRIGIDO NO MANUAL + PENDÊNCIA DE PRODUTO (corrigir a codificação em `0013`).
- **Alteração:** 4.3 lista os sete nomes afetados e orienta reconhecê-los pelo trecho legível e pelo identificador técnico; nova linha na tabela 21.3.

### F-04 — Capítulo 4: VAL-010 / VAL-011
- **Afirmação:** gerir as permissões por papel e lançar horas em nome de outro colaborador não são atribuídas pela instalação padrão.
- **Evidência:** nenhuma migration insere `rbac.manage_role_permissions` nem `time_entries.create_on_behalf`; a matriz técnica mantém VAL-010 e VAL-011 abertos.
- **Decisão:** JÁ ESTAVA CORRETO (4.3, 4.4, 4.7 e capítulo 7). PENDÊNCIA DE PRODUTO mantida.

### F-05 — Capítulo 4: migrations reaplicam permissões padrão
- **Evidência:** `migrate.ts` reexecuta todos os arquivos; `0013`, `0016`, `0019` e `0053` reinserem as permissões de Administrador/Gestor (`ON CONFLICT DO NOTHING`); `0047` retira `system_settings.*` de três perfis (UUIDs `1111…`, `2222…`, `3333…`).
- **Decisão:** JÁ ESTAVA CORRETO (aviso "Atenção às atualizações do sistema", 4.7). PENDÊNCIA DE PRODUTO.

### F-06 — Capítulo 4: "Esteiras: gerir alocações por etapa"
- **Evidência:** a permissão só protege `server/src/modules/conveyors/conveyorAssignments.routes.ts:49,60`; o front não usa essas rotas para alocar (alocação é feita pela edição da esteira, que exige `conveyors.create`).
- **Decisão:** JÁ ESTAVA CORRETO ("nenhum efeito visível nas telas atuais"). PENDÊNCIA DE PRODUTO.

### F-07 — Termos técnicos na interface
Todas as ocorrências restantes no manual são citações de texto real da tela, com tradução ao lado:

| Termo | Onde aparece na tela (evidência) | Classificação |
|---|---|---|
| **Actor** | `src/features/admin/users/AdminAuditTrailPage.tsx:182` | mostrado pela UI; explicado (4.8) |
| **RBAC** | `RbacRolePermissionsPage.tsx:307`, `OperationalSettingsPage.tsx:348` | mostrado pela UI; o manual o cita como "sigla técnica", sem reproduzi-la |
| **ARGOS** | `LoginBrandPanel.tsx:67,97`, `BacklogTable.tsx:68`, `conveyorHealthDisplay.ts:337,340` | marca do ecossistema exibida na UI; cabeçalho do manual mantido |
| **STEP / STEPs / STEPS** | `ApontamentoPage.tsx:337`, `JornadaPage.tsx:523`, `DashboardPage.tsx:517`, `JornadaColaboradorGestorPage.tsx:728`, `operationalSemantics.ts:33` | mostrado pela UI; explicado (15, 16, 18, 20, 21.3) |
| **draft**, **partItems** | `draftToCreateConveyorInput.ts:940` e mensagens do capítulo 17 | texto inadequado da UI; explicado (17), não "corrigido" |
| **snapshot**, **fallback**, **override**, **default global** | `collaboratorOperationalHealthDisplay.ts:62,97` e rótulos do Dashboard | mostrado pela UI; explicado (15, 18) |
| **Ficheiro** / **ficheiro** | `NovaEsteiraPorDocumentoPage.tsx:452` e mensagens de extração de PDF | texto PT-PT da UI; citado literalmente |
| **bucket** | `JornadaColaboradorGestorPage.tsx:647,670,696`, `DashboardPage.tsx:628` | mostrado pela UI; explicado (12, 15, 21.3) |
| **soft delete** | `ColaboradoresPage.tsx:603`, `UsersPage.tsx:701` | mostrado pela UI; explicado (21.3) |
| **Kiosk** | `KioskExtraEsteiraFlow.tsx:155`, `KioskOutraAtividadeFlow.tsx:205` | mostrado pela UI; explicado (21.3) |

- **Decisão:** SEM AÇÃO NECESSÁRIA. Nenhum termo apenas de código ficou como vocabulário do manual. Os textos inadequados da UI são PENDÊNCIA DE PRODUTO (já listados na 21.3).

### F-08 — Capítulos 16 e 21: remoção e restauração
- **Evidência:** Colaboradores: `collaboratorsUrlStateToListApi` não envia `deleted`, e o repositório usa `exclude` por padrão (`admin-collaborators.repository.ts:56-58`). Usuários: a listagem sempre filtra `u.deleted_at IS NULL` (`admin-users.repository.ts:79`). O item **Restaurar** existe no menu, mas nunca recebe um registro removido.
- **Decisão:** JÁ ESTAVA CORRETO ("remover é, na prática, definitivo" em 16.6, 16.10 e 21.3). PENDÊNCIA DE PRODUTO.

### F-09 — Capítulo 16: conta removida segura e-mail e colaborador
- **Evidência:** a conta removida continua com o e-mail e o `collaborator_id`; Colaboradores calcula o vínculo com `au.deleted_at IS NULL` (`admin-collaborators.repository.ts:13`) e passa a mostrar **Sem vínculo**.
- **Decisão:** JÁ ESTAVA CORRETO (16.10).

### F-10 — Capítulos 13 e 16: não há ação para desligar o PIN
- **Decisão:** JÁ ESTAVA CORRETO (13 e 16.5). Inativar o colaborador bloqueia o Modo Fábrica, como já descrito.

### F-11 — Capítulo 16: usuário inativado com sessão aberta
- **Evidência:** `requireAuth` (`server/src/modules/auth/auth.middleware.ts`) consulta `findPasswordStampForSessionAuth`, que filtra só `deleted_at IS NULL` e não olha `is_active`. A conta inativada continua com a sessão aberta; a removida perde a sessão na ação seguinte.
- **Decisão:** JÁ ESTAVA CORRETO (16.10). PENDÊNCIA DE SEGURANÇA/AUTORIZAÇÃO (a inativação não encerra a sessão aberta). Código não alterado.

### F-12 — Capítulo 17: Importação por documento
- **Decisão:** JÁ ESTAVA CORRETO. Cliente, Placa e Prazo estimado não são gravados; a esteira nasce sem prazo; a comparação é feita pelo texto da descrição contra as matrizes, sem "código Nano" (17 e 21.3).

### F-13 — Capítulo 15: limitações do Dashboard
- **Decisão:** JÁ ESTAVA CORRETO. Estão descritas no capítulo:
  - o atraso herda a limitação do Painel;
  - **Previsto vs capacidade diária** compara o previsto acumulado com a capacidade de um único dia;
  - a carga por colaborador ignora alocações de equipe (consulta em `dashboard.repository.ts` lista só `conveyor_node_assignees` diretos);
  - o anel gerencial sobrepõe categorias.
- PENDÊNCIA DE PRODUTO.

### F-14 — Capítulos 14 e 15: totais incluiriam esteiras excluídas?
- **Evidência:** a exclusão é física, por `physicalDeleteConveyor` (`DELETE FROM conveyors`). Os nós saem por `ON DELETE CASCADE` (`0005_conveyors_and_nodes.sql:55`), e os apontamentos têm `ON DELETE RESTRICT` (`0006`), além de impedirem a exclusão pela regra de serviço. As somas do Dashboard filtram `deleted_at IS NULL`.
- **Decisão:** JÁ ESTAVA CORRETO. A hipótese foi refutada: esteira excluída não pode compor totais. As frases dos capítulos 14 e 15 ("Esteiras removidas do sistema não aparecem", "apontamentos de esteiras excluídas não aparecem") são fiéis.

### F-15 — Capítulo 18: Saúde operacional, limitações
- **Decisão:** JÁ ESTAVA CORRETO. Estão descritas no capítulo, com limiares conferidos (`collaborator-operational-health-summary.service.ts:182`, Atenção acima de 75%, coerente com a tabela 42h/90h/180h):
  - **Sobrecarga** conta em dobro;
  - atividades dispensadas, de esteiras finalizadas, canceladas e em rascunho seguem na carga;
  - limite de 50 sem paginação;
  - dia de referência em UTC;
  - "Sem dados suficientes" na prática não ocorre.
- PENDÊNCIA DE PRODUTO.

### F-16 — Capítulo 18: autorização do backend da Saúde operacional
- **Evidência:** `server/src/modules/collaborators/collaborators.routes.ts:40-44` e `:61-65` — `/collaborators/operational-health-summary` e `/collaborators/:collaboratorId/operational-health-snapshot` usam só `requireAuth()`. A Jornada exige `requirePermission('collaborators_admin.view')`. Os controllers trazem `TODO(RBAC)`. O menu e a rota de tela exigem **Colaboradores admin: consultar**.
- **Decisão:** **PENDÊNCIA DE SEGURANÇA/AUTORIZAÇÃO.** Qualquer conta autenticada obtém os dados pela API. O manual descreve apenas o comportamento da tela e não ensina caminho alternativo (2.5). Código não alterado.
- **Ocorrência correlata:** `conveyor-health.routes.ts:13` (ARGOS Health da esteira) também usa só `requireAuth()` — VAL-016 na matriz.

### F-17 — Matriz técnica `MANUAL_FUNCIONAL_SGP.md`
- **Conferido:**
  - SAU-003/SAU-004 (100%, 200%, cerca de 75%);
  - 44.8 (`DISABLED`);
  - linha 1970 (inativação não encerra a sessão);
  - VAL-010, VAL-011, VAL-016 e VAL-017;
  - 46.6 (exclusão e restauração de Matriz).
- **Decisão:** SEM AÇÃO NECESSÁRIA. Nenhuma contradição comprovada com os capítulos do usuário; a matriz está fora do escopo editável. Sugestão para rodada própria: registrar na matriz o achado F-03 (nomes corrompidos em `0013`) e a ausência de produtor do estado `DISABLED` (F-02).

### F-18 — Capítulo 13: "Sessão de produção inválida ou expirada" — "credencial desligada durante o uso"
- **Decisão:** SEM AÇÃO NECESSÁRIA. A causa principal descrita (sessão expirada) é correta; o desligamento direto na base continua possível, ainda que nenhuma tela o produza (F-02).

## Validações executadas

| Comando / verificação | Resultado |
|---|---|
| `git diff --check` | sem saída, exit code 0 |
| `git status --short` (antes do commit) | apenas os dois arquivos permitidos |
| revisão integral de `git diff` | 7 trechos alterados, todos listados acima |
| busca `PENDENTE\|pendentes deverão\|ainda pendentes\|TODO\|TBD\|[A DEFINIR` | uma única ocorrência, linha 2821 — mensagem de tela ("ainda pendentes nesta esteira"), não é marcador |
| cabeçalho | `**Revisão deste manual:** 2026-10-04` · `**Situação:** capítulos 1 a 21 com conteúdo final, revisados na auditoria final de 2026-10-04.` |
| referências cruzadas (script: todo "capítulo N" e "seção N.M" contra os títulos existentes) | 21 capítulos, 94 seções; **zero** referências quebradas. As seções mais citadas (3.6, 4.5, 4.6, 6.14, 6.18, 15.2, 15.4, 15.7, 16.6, 16.9, 16.10, 16.13, 18.7, 19.5, 21.3) conferem com o assunto citado |
| busca de PT-PT | ver abaixo |
| busca de termos técnicos (STEP, STEPS, RBAC, Actor, ARGOS, draft, partItems, snapshot, Ficheiro, bucket, fallback, override, soft delete, Kiosk) | todas as ocorrências classificadas em F-07 |
| build, lint, testes | **não executados** (rodada documental; não exigidos) |

**PT-PT:** as ocorrências restantes são de dois tipos:
- citações literais da tela ou nomes de permissão: "Contacte o administrador", "Registo em nome de…", "ficheiro", "autenticar-se", "Candidato principal aceite", "Utilizadores", "gerir", "repor", "eliminação lógica";
- formas válidas em pt-BR: "gerir" em prosa, "o aceite" como substantivo, "definições".

Nenhuma correção foi necessária.

## Pendências de produto (não corrigidas — exigem mudança de código)

1. Corrigir a codificação dos sete nomes em `server/migrations/0013_app_permissions.sql`, ou criar migration corretiva (F-03).
2. Provisionar `rbac.manage_role_permissions` e `time_entries.create_on_behalf` (VAL-010/011).
3. Impedir que o migrador desfaça ajustes de permissão feitos na tela (F-05).
4. Dar efeito ou retirar "Esteiras: gerir alocações por etapa" (F-06).
5. Expor removidos e **Restaurar**, ou retirar o item (F-08).
6. Liberar e-mail e colaborador ao remover conta (F-09).
7. Ação para desligar o PIN, ou retirar o estado `DISABLED` (F-02).
8. Limitações do Dashboard (F-13) e da Saúde operacional (F-15).
9. Textos técnicos e PT-PT na interface (21.3).

## Pendências de segurança/autorização

1. **Saúde operacional sem permissão no backend** (F-16): resumo e detalhe atendem qualquer conta autenticada. Aplicar `requirePermission('collaborators_admin.view')`, ou permissão dedicada, nas duas rotas.
2. **Inativação de usuário não encerra sessão aberta** (F-11).
3. Correlata: ARGOS Health da esteira só com `requireAuth()` (VAL-016).

## Não comprovado

- Aparência exata dos sete nomes corrompidos na tela: comprovada pelo código, mas não observada em banco em execução (F-03). O manual não descreve a aparência exata.

## Estado final

- Commit único documental na branch `docs/manual-usuario-sgp-auditoria-final`, publicado só nessa branch.
- Working tree limpa após o push (confirmado na resposta final da sessão).
- Próximo passo recomendado: revisão humana da branch e decisão sobre as pendências de segurança F-16 e F-11.
