# Retorno — manual-usuario-sgp-cap04

- **TASK_ID:** `manual-usuario-sgp-cap04`
- **Data/hora:** 2026-10-04 13:32 UTC
- **Objetivo:** construir integralmente o Capítulo 4 do Manual do Usuário SGP+, com base comprovada no código atual, e marcar o capítulo como concluído na linha **Situação**.
- **Status final:** CONCLUÍDO (rodada documental). Build, lint e testes da aplicação **não foram executados** (rodada puramente documental, sem alteração de código).
- **Branch criada/publicada:** `docs/manual-usuario-sgp-cap04`
- **SHA base (completo):** `a5b0214cfc891737ee2c044f557604e9c1216d1c` — tip de `origin/docs/manual-usuario-sgp-fix-acesso-restauracao-sessao` após `git fetch origin --prune`; começa por `a5b0214c`, conforme esperado.
- **Ancestralidade:** as 18 branches documentais anteriores (`base-p0`, cap05–cap14, cap16, cap17 e as cinco de correção) confirmadas como ancestrais da base com `git merge-base --is-ancestor`.
- **SHA final:** é o commit único desta branch que contém este arquivo (`git log -1 origin/docs/manual-usuario-sgp-cap04`). Não é registrado aqui para evitar commit extra de ajuste.

## Título real do Capítulo 4

`# 4. Perfis e permissões — visão para o usuário` — preservado sem alteração.

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | marcador pendente do Capítulo 4 substituído pelo capítulo completo (≈310 linhas, seis blocos padrão, seções 4.1–4.8); linha **Situação** do cabeçalho |
| `docs/ai/returns/manual-usuario-sgp-cap04-retorno.md` | este retorno |

Migrations: nenhuma alterada. Código-fonte, HTML gerado, `MANUAL_FUNCIONAL_SGP.md`, `SESSION_CHECKPOINT.md`, `docs/ai/reports/` e `docs/audits/`: não tocados.

## Escopo adotado

Os cinco tópicos do marcador foram cobertos: conta × colaborador e vínculo (4.1, 4.4); leitura de "Quem costuma ter acesso" (4.3); o que acontece quando falta permissão (4.4); função × permissão (4.1); com quem falar (4.6).

Também foram incluídas as telas **Permissões por papel** (4.7) e **Trilha administrativa**, só no uso para conferir alterações de permissão (4.8), porque:

- têm item de menu e são o único lugar onde perfis e permissões são consultados e alterados;
- o Capítulo 16 remete expressamente a definição de permissões para "fora deste capítulo", e nenhum outro capítulo pendente (15, 18, 19) cobre o tema;
- a auditoria de cobertura (linha 72, E15) apontava a tela de permissões como não documentada.

A Trilha administrativa **não** foi documentada integralmente (os outros dez tipos de evento ficam fora); ver pendências.

## Funcionalidades comprovadas

| Comportamento | Evidência |
|---|---|
| Item de menu oculto sem permissão; agrupamento vazio some | `src/lib/shell/app-nav-config.ts` (`navItemVisible`, `filterShellNavItems`); teste `app-nav-config.test.ts` |
| Tela "Sem permissão para esta área" + texto | `src/routes/RequirePermission.tsx`; rotas em `src/routes/AppRoutes.tsx` |
| Recusa no servidor (403) vira janela **Sem permissão** com *"Você não tem permissão para esta operação…"* | `server/src/modules/permissions/permissions.middleware.ts`; `src/lib/errors/sgpErrorContract.ts` (`modalTitleFor`, `refineUserMessage`) |
| Permissões conferidas no banco a cada requisição; uma conta = um perfil | `permissions.repository.ts` (`findPermissionCodesForAppUser`, junção `app_users.role_id`) |
| Menu atualiza só em recarga/novo login (ou ao salvar o próprio perfil) | `src/lib/auth-context.tsx` (`bootstrap`, `refreshUser`); chamadas de `refreshUser` em `RbacRolePermissionsPage.tsx`, `SessionIdleWarningHost.tsx`, `ChangePasswordPage.tsx` |
| Troca de perfil/permissões não encerra sessão | `rbac.service.ts` e `admin-users.service.ts` sem revogação por troca de papel |
| Nenhuma tela mostra o perfil do próprio usuário | `src/components/AppHeader.tsx` (só nome e e-mail); nenhum uso de `user.role` em telas |
| Itens liberados a todo autenticado | `app-nav-config.ts` (sem `permission`), botão **Apontar horas** sem gate em `AppHeader.tsx` |
| Tela Permissões por papel: campo **Papel** com todos os perfis (inclusive funções e inativos), ordem por código, primeiro selecionado; "Nome (CÓDIGO)"; grupos por domínio técnico; nome + identificador; **Salvar alterações/Salvando…**; *"Permissões do papel atualizadas."*; aviso do próprio papel; redirecionamento com *"Deixou de ter acesso à gestão de permissões…"*; Colaborador somente leitura; troca de perfil descarta marcações sem aviso; guarda **Sair desta página?** | `src/features/admin/rbac/RbacRolePermissionsPage.tsx`; `rbac.repository.ts` (`listRoles` sem filtro de ativo); `transient-context.tsx`, `TransientLeaveConfirmDialog.tsx` |
| Colaborador não editável; Administrador deve manter 6 permissões; registro de auditoria a cada gravação (inclusive sem mudança) | `server/src/modules/rbac/rbac.service.ts` (`ADMIN_REQUIRED_PERMISSION_CODES`, `assertAdminSafeguards`, `insertAdminAuditEvent`) |
| Trilha: filtros, recarga automática ao trocar filtro, colunas, limite 100, mensagens, filtro por UUID validado | `src/features/admin/users/AdminAuditTrailPage.tsx`; `admin-audit.schemas.ts`; `admin-audit.routes.ts` |
| Troca de perfil de conta registrada como "Usuário atualizado" com `changed_fields` | `admin-users.service.ts` (`buildPatchAuditPlan`) |
| Função inativada mantém permissões efetivas | `findPermissionCodesForAppUser` não verifica `app_roles.is_active` |
| "Esteiras: gerir alocações por etapa" sem efeito na interface | rotas POST/DELETE de `assignees` exigem a permissão (`conveyorAssignments.routes.ts`), mas nenhum serviço do front-end as chama (`conveyorStepAssignmentsApiService.ts` só lista) |
| Permissões que liberam **Apontamento gerencial** | `AppRoutes.tsx`, `StepAnaliticoPanel.tsx`, `JornadaColaboradorGestorPage.tsx`, `ApontamentoGestorPage.tsx` |
| Abas do Dashboard por permissão | `src/features/gestor/DashboardPage.tsx` |

## Permissões identificadas e configuração padrão (migrations)

| Perfil | Permissões atribuídas pelas migrations |
|---|---|
| Administrador | todas as existentes no catálogo a cada execução de `0013` (re-execução completa), menos `system_settings.*` (removidas por `0047`) |
| Gestor | `collaborators_admin.{view,create,edit,activate,deactivate}`, `conveyors.{create,edit_status,manage_assignments}`, `operation_matrix.{view,manage}`, `dashboard.view_operational`, `system.health_db`, `teams.*` (4), `operational_settings.manage`, `time_entries.{edit_any,delete_any}` |
| Colaborador | nenhuma |
| Super administrador | `system_settings.{view,manage}` |
| Funções criadas em Configurações operacionais | nenhuma |

`rbac.manage_role_permissions` e `time_entries.create_on_behalf` **não são criadas por nenhuma migration** (`0014` e `0015` têm 0 bytes) — VAL-010 e VAL-011 do manual funcional continuam abertos.

## Fluxo funcional documentado

Conceitos (4.1) → base de todo usuário (4.2) → leitura das permissões no manual, com tabela nome-na-tela × efeito × padrão (4.3) → sinais de falta de permissão e bloqueios que não são permissão (4.4) → efeito de mudanças (4.5) → pedido de liberação (4.6) → administração em Permissões por papel (4.7) → conferência na Trilha (4.8) → O que esperar → Quando algo é bloqueado.

## Inconsistências e limitações encontradas (não corrigidas)

1. **VAL-010/VAL-011 persistem:** sem provisionamento por migration para gerir permissões por papel e lançar em nome de terceiro. O capítulo diz, em linguagem funcional, que a instalação padrão não as atribui.
2. **Re-execução das migrations restaura permissões padrão:** o migrador roda todos os arquivos a cada execução (`server/src/scripts/migrate.ts`; acionado no deploy quando `MIGRATE_ON_DEPLOY=1`). `0013`, `0016`, `0019` e `0053` reatribuem as permissões padrão a Administrador e Gestor; `0047` remove Configurações do sistema de Administrador/Gestor/Colaborador. Retiradas feitas na tela podem ser desfeitas. Mencionado no capítulo como alerta.
3. **Nomes de permissão com dupla codificação em `0013`:** o arquivo contém texto corrompido (ex.: "eliminaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o") e usa `ON CONFLICT DO UPDATE SET name`, de modo que cada execução regrava esses nomes corrompidos (users/collaborators soft_delete, force_password_change, manage_assignments, operation_matrix.*, system.health_db). O estado real do banco não foi verificado; o capítulo usa a grafia correta.
4. **Nomes em português de Portugal** no catálogo ("Utilizadores", "gerir", "repor", "eliminação lógica"); o capítulo avisa que a tela usa essa grafia.
5. **Termos técnicos na tela Permissões por papel:** títulos de grupo em código de domínio em inglês; identificador técnico sob cada permissão; texto de apoio e aviso do perfil Colaborador citam "RBAC"; mensagem de salvaguarda do Administrador lista códigos técnicos. Na Trilha: coluna **Actor** (inglês), **Metadados** em JSON, coluna **Colab.** com identificador interno, filtro **ID do usuário alvo (UUID)**, rótulo "Usuário removido (soft delete)". Candidatos ao capítulo 21.3 em rodada futura.
6. **"Esteiras: gerir alocações por etapa" sem efeito na interface:** a alocação real exige "Esteiras: criar"; um perfil só com a primeira não aloca, e um com só a segunda aloca pela edição da esteira.
7. **Troca de perfil no campo Papel descarta marcações sem aviso**, apesar de a tela registrar contexto transitório (que só protege a navegação pelo menu).
8. **Auditoria a cada clique em Salvar**, mesmo sem mudança (listas vazias).
9. **Troca do perfil de uma conta** é auditada sem valores anterior/novo (só `changed_fields`).
10. **Função inativada mantém permissões** e continua selecionável como perfil em Permissões por papel; `roleExists` também não verifica ativo.
11. **Super administrador** recebe só Configurações do sistema; não vê Usuários nem Permissões por papel na configuração padrão.
12. **Filtro de ID na Trilha recarrega a cada tecla**; valor parcial gera erro de validação até completar o UUID.
13. **Revisão deste manual: 2026-10-03** continua desatualizada (fora do escopo, mantida).
14. **Capítulo 13** — pendência do estado "desabilitada"/"Acesso desabilitado." permanece; não tocada.

## Pontos não comprovados — por isso não documentados

1. Estado real do RBAC nos bancos dos ambientes (quem tem, de fato, as permissões não provisionadas; se os nomes aparecem corrompidos).
2. Nomes exibidos para `rbac.manage_role_permissions` e `time_entries.create_on_behalf` (não existem nas migrations) — descritos apenas pela função.
3. Se o deploy dos ambientes compartilhados usa `MIGRATE_ON_DEPLOY=1` — por isso o alerta diz "podem ser reatribuídas".
4. Exibição dos eventos de correção de apontamento na Trilha (o Capítulo 7 os cita; fora do escopo deste capítulo).
5. Uso integral da Trilha administrativa para os demais tipos de evento.

## Validações realizadas

| Validação | Resultado |
|---|---|
| `git fetch origin --prune`; tip da base | `a5b0214cfc891737ee2c044f557604e9c1216d1c` (OK) |
| Ancestralidade das branches documentais | 18/18 OK |
| `git status --short` antes do commit | `M docs/manual/source/MANUAL_USUARIO_SGP.md`; `?? docs/ai/returns/manual-usuario-sgp-cap04-retorno.md` |
| `git diff --check` | sem saída (OK) |
| Linhas removidas no diff | somente a linha **Situação** e o marcador + 5 tópicos do Capítulo 4 |
| Trecho antes do Capítulo 4 | idêntico, exceto a linha 5 (Situação) — conferido por script |
| Capítulos 5–21 | byte a byte idênticos à base — conferido por script |
| Marcador PENDENTE no Capítulo 4 | ausente |
| Busca de termos técnicos no novo texto (`STEP`, `RBAC`, `endpoint`, `DTO`, `service`, `schema`, `enum`, `uuid`, `_`, `api`, `json`, `token`, códigos de permissão) | nenhuma ocorrência |
| Confronto das afirmações com código/testes | ver "Funcionalidades comprovadas" |
| Consistência com capítulos 3, 5, 6, 7, 12, 13, 14, 16 | termos alinhados ("perfil de acesso", "Papel operacional", "permissão de criar esteiras", "permissão de mudar situação", "quem administra os acessos"); remissões em vez de repetição |
| Build / lint / testes | **não executados** — rodada documental |

## Linha "Situação"

- Antes: "capítulos 1 a 3, 5 a 14, 16, 17, 20 e 21 com conteúdo final. Os capítulos 4, 15, 18 e 19 seguem marcados como pendentes…"
- Depois: "capítulos 1 a 14, 16, 17, 20 e 21 com conteúdo final. Os capítulos 15, 18 e 19 seguem marcados como pendentes…"

## Metadado "Revisão deste manual"

Mantido em `2026-10-03`, conhecido como desatualizado, conforme instrução.

## Git

- Um único commit documental na branch `docs/manual-usuario-sgp-cap04`, publicada com `git push -u origin docs/manual-usuario-sgp-cap04`.
- **Sem** PR, merge, rebase ou force-push. `main`, `develop`, `homol` e branches documentais anteriores não alteradas.
- Estado final esperado do `git status`: limpo.

## Próximo passo recomendado

Decisão humana sobre VAL-010/VAL-011, a re-execução das migrations de permissão e a codificação de `0013`. Não iniciar o Capítulo 15 automaticamente.

## Uso de contexto / sessão

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
