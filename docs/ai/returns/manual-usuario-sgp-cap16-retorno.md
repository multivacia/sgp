# Retorno — manual-usuario-sgp-cap16

- **TASK_ID:** `manual-usuario-sgp-cap16`
- **Data/hora:** 2026-10-04 13:16 UTC
- **Objetivo:** construir o Capítulo 16 do Manual do Usuário SGP+, somente com comportamento comprovado no código atual.
- **Status final:** CONCLUÍDO (rodada documental). Build, lint e testes da aplicação **não foram executados** (rodada puramente documental).
- **Título real encontrado para o Capítulo 16:** **"16. Cadastros e administração"** — preservado sem alteração. O marcador listava cinco tópicos (colaboradores, usuários, equipes, capacidade, configurações operacionais), que definiram o escopo.
- **Branch criada/publicada:** `docs/manual-usuario-sgp-cap16-cadastros-administracao` (a partir de `origin/docs/manual-usuario-sgp-fix-cap06-prazo-documento-residual`)
- **SHA inicial (base):** `247e07e0a99c10d7a81953952150efce13f7f3e7` — confere com o SHA esperado. Todas as 15 branches documentais anteriores (`base-p0`, cap05 a cap14, cap17 e as três de correção) confirmadas como ancestrais (`git merge-base --is-ancestor`).
- **SHA final:** é o commit único desta branch que contém este arquivo (`git log -1` da branch). Não é registrado aqui para evitar commit extra de ajuste.

## Arquivos

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | Capítulo 16 escrito (substitui o marcador de pendência); linha **Situação** atualizada |
| `docs/ai/returns/manual-usuario-sgp-cap16-retorno.md` | este retorno |

Migrations: nenhuma. Código-fonte, HTML gerado, `docs/ai/reports/`, `docs/audits/`, `MANUAL_FUNCIONAL_SGP.md` e demais capítulos: não tocados.

## Estrutura do capítulo

Seis blocos padrão (Para que serve · Onde fica · Quem costuma ter acesso · Como fazer · O que esperar · Quando algo é bloqueado), 621 linhas, 3 marcadores de imagem. "Como fazer" em 18 seções numeradas (16.1–16.18): conceitos; colaboradores (consultar, cadastrar, alterar, PIN do Modo Fábrica, inativar/remover); usuários (consultar, criar, alterar/vincular, senha/inativação/remoção); setores; funções; capacidade; descrições de apontamentos; justificativas; motivos de dispensa; equipes (cadastro; membros e referência).

## Funcionalidades comprovadas e documentadas

| Tema | Evidência |
|---|---|
| Rotas, menus e permissões de tela (`collaborators_admin.view`, `users.view`, `operational_settings.manage`, `teams.view`/`teams.create`) | `src/routes/AppRoutes.tsx`, `src/lib/shell/app-nav-config.ts` |
| Permissões por ação no servidor | `server/src/modules/admin-users/admin-users.routes.ts` (usuários e `/admin/collaborators`, inclusive reset de PIN com `collaborators_admin.edit`), `teams.routes.ts`, `operational-settings.routes.ts` |
| Configuração padrão de papéis | migrations `0013` (ADMIN recebe todas; GESTOR: collaborators_admin view/create/edit/activate/deactivate), `0016` (equipes para ADMIN e GESTOR), `0019` (operational_settings.manage para ADMIN e GESTOR), `0036`/`0047` |
| Colaboradores: lista, filtros, busca (nome, código, e-mail, apelido, matrícula, cargo, setor, função), colunas, formulário, validações, mensagens, menu de ações e confirmações | `src/features/gestor/ColaboradoresPage.tsx`, `src/lib/admin/collaboratorsListUrlState.ts`, `admin-collaborators.repository.ts/.service.ts`, `collaborators.schemas.ts/.service.ts` (`handlePg`), migration `0018` (nome único, sem caixa, entre não removidos) |
| PIN do Modo Fábrica: estados, redefinição para PIN provisório, desbloqueio, habilitação | `ColaboradoresPage.tsx` (`CollaboratorProductionPinCard`), `adminResetProductionPin`, `PRODUCTION_DEFAULT_INITIAL_PIN = '1234'` |
| Efeitos de inativar/remover colaborador (login e sessão do Modo Fábrica, lista de seleção, alocação, equipe, vínculo, capacidade) | `production-auth.service.ts`/`.middleware.ts`, `production-collaborators.repository.ts`, `conveyors.service.ts` (`collaboratorActiveForOperations`), `teams.service.ts`, `assertCollaboratorEligibleForLink`, `OperationalCapacityTab.tsx` |
| Usuários: lista, busca, colunas, aviso de pendências de vínculo, formulário, criação com troca obrigatória, senha explícita na edição sem troca obrigatória, forçar troca, redefinir senha (senha temporária exibida uma vez), inativar, ativar, desvincular, remover, proteções da própria conta, trilha | `src/features/admin/users/UsersPage.tsx`, `admin-users.service.ts/.repository.ts/.schemas.ts`; teste `admin-password-governance.test.ts` (reset devolve senha temporária, sessão anterior revogada, própria conta → 422, sem permissão → 403) |
| Sessões: remoção e troca/redefinição de senha encerram sessão aberta; inativação bloqueia login | `auth.middleware.ts` (`findPasswordStampForSessionAuth` filtra removidos; carimbo de senha), `auth.service.ts` (login e `/me` com conta inativa) |
| Unicidade de e-mail e de colaborador vinculado inclui contas removidas | migration `0009` (`idx_app_users_email_lower`, `idx_app_users_collaborator_id_unique` sem filtro de remoção), `listEligibleCollaboratorsForLink` |
| Setores, funções: CRUD, ativação, unicidade, exclusão (setor sem trava; função bloqueada se em uso), código automático | `OperationalSettingsPage.tsx`, `operational-settings.service.ts/.repository.ts/.schemas.ts`, migration `0002` (FK `ON DELETE SET NULL`) |
| Funções e perfis de acesso compartilham a mesma lista | `roles.repository.ts` (`GET /roles` = todos os `app_roles` ativos), `listRolesPublic`/`listAppRoles`, `insertCollaboratorFunction` (sem permissões), migration `0019` |
| Capacidade: padrão, ajuste individual com vigência inclusiva, um ajuste por colaborador, resolução ajuste → padrão → 8 h, remoção, mensagens | `capacity/*.tsx`, `operationalCapacity.helpers.ts`, `operational-settings.service.ts/.repository.ts/.schemas.ts`; testes `operational-capacity.*.test.ts`, `operational-settings-capacity-write.service.test.ts` |
| Descrições de apontamentos, justificativas, motivos de dispensa: campos, limites, unicidade, ordenação, só ativos ofertados, ausência de exclusão para justificativas e motivos, código imutável | três `*Tab.tsx`, `extra-time-entry-descriptions.*`, `time-entry-justifications.*`, `step-abort-reasons.*`, `my-activities/extra-time-entries.repository.ts`, `production-time-entry-justifications.controller.ts` |
| Equipes: lista, criação, edição, inativar/ativar/remover (remoção lógica), membros (só ativos), referência única com troca automática, remoção de membro reversível, bloqueio de alocação de equipe inativa/removida | `src/features/gestor/equipes/*.tsx`, `teams.service.ts/.repository.ts`, migrations `0016`/`0020`, `conveyors.service.ts` |
| Apresentação de erros (403 → janela "Sem permissão"; 404 → mensagem genérica; 409/422 → aviso rápido com a mensagem do servidor) | `src/lib/errors/sgpErrorContract.ts`, `SgpToast.tsx` |
| Confirmação "Sair desta página?" | `useRegisterTransientContext` em Colaboradores e Usuários, `TransientLeaveConfirmDialog.tsx` |

## Permissões identificadas

| Frente | Front-end | Back-end | Coerência |
|---|---|---|---|
| Colaboradores | rota e menu: `collaborators_admin.view`; botões **sem** checagem de permissão | create/edit/activate/deactivate/soft_delete/restore separados; reset de PIN exige `edit` | **divergente**: botões aparecem para quem não pode; recusa só ao confirmar |
| Usuários | rota e menu: `users.view`; botões **sem** checagem | uma permissão por ação (9) | **divergente**, idem |
| Configurações operacionais | `operational_settings.manage` | mesma, em todas as rotas (inclusive capacidade e catálogos) | coerente |
| Equipes | `teams.view`/`create`/`update`/`manage_members` escondem botões | mesmas | coerente |
| Capacidade dentro de Colaboradores | linha e quadro visíveis só com `operational_settings.manage` | idem | coerente |

## Fluxo funcional documentado

Cadastrar colaborador → (opcional) Redefinir PIN para liberar Modo Fábrica → criar conta com colaborador vinculado (troca de senha obrigatória) → incluir em equipes → ajustar capacidade se necessário. Manutenção: editar, inativar/ativar (reversível), remover (irreversível pela tela), redefinir senha/PIN, desvincular antes de remover conta.

## Inconsistências e limitações encontradas (não corrigidas)

1. **Restaurar inalcançável (colaboradores e usuários).** As listas nunca pedem removidos (`deleted` padrão `exclude` em colaboradores; filtro fixo `u.deleted_at IS NULL` em usuários). O item **Restaurar** e o selo **Removido** existem no código mas não aparecem. Documentado no capítulo como "remoção definitiva na prática".
2. **Divergência com o capítulo 21.3 (não alterado):** a linha de **"Remover (soft delete)"** diz que o registro "pode ser restaurado" — pela interface, não pode. Recomenda-se ajustar em rodada própria.
3. **Conta removida prende e-mail e colaborador.** Índices únicos não excluem removidos; a lista de elegíveis também não. O colaborador fica impossível de vincular a outra conta e a tela de Colaboradores o mostra como **Sem vínculo** (join filtra conta removida). Documentado com a orientação de desvincular antes de remover.
4. **Editar conta vinculada a colaborador inativo/removido falha em qualquer salvamento** (o formulário reenvia o id, que não é elegível; o campo aparece vazio). Documentado com contorno.
5. **Inativar conta não encerra sessão aberta**: `requireAuth` não verifica `is_active`; só `/auth/me` e o login verificam. Diverge de `MANUAL_FUNCIONAL_SGP.md` 40.8 ("nem continuar utilizando sessão previamente válida"). Capítulo diz "não garante a desconexão imediata".
6. **Não há como desabilitar a credencial do Modo Fábrica** pela interface (nenhum caminho grava `enabled = false`). Diverge do capítulo 13 ("desliga acesso", estado "desabilitada") e de COL-003 da matriz. Capítulo orienta inativar o colaborador.
7. **Funções operacionais e perfis RBAC são a mesma tabela** (`app_roles`): o formulário de colaborador lista ADMIN/SUPER_ADMIN; funções criadas aparecem como perfil em Usuários; inativar/renomear/recodificar **Colaborador** ou **Gestor** afeta perfis de acesso (a proteção do RBAC contra edição do papel `COLABORADOR` depende do código). Diverge do texto da própria tela ("Papéis de segurança (RBAC) não são geridos aqui") e de CFG-002 da matriz ("Separadas de RBAC"). Capítulo traz aviso funcional. **Risco de produto registrado.**
8. **Inativar colaborador pelo campo Status da edição** usa a permissão de editar, não a de inativar (atalho de permissão).
9. **Observações do colaborador não podem ser limpas** (campo vazio vira "não alterar"). Documentado.
10. **Ajuste de capacidade com início futuro é invisível na tabela** e sem **Remover**/**Restaurar padrão**; a data "hoje" da capacidade efetiva é calculada em UTC (diferença perto da meia-noite de São Paulo — não documentado, impacto marginal). Ajuste "ativo/inativo" (CFG-CAP-002) não tem controle na tela.
11. **Exclusão de setor sem trava** deixa colaboradores sem setor (já previsto em CFG-001); documentado com recomendação de inativar.
12. **Nome de equipe pode repetir**; **referência da equipe não é usada fora da tela de equipe** (`tm.is_primary` sem consumidores). Documentados.
13. **Termos técnicos na interface** (pendência de texto, não corrigidos): textos de apoio de Colaboradores (`collaborators`, `app_users`), Usuários (`app_users`, `app_roles`, "soft delete"), aviso de pendências (`collaborator_id`), Configurações operacionais ("RBAC"), abas Descrições e Motivos ("STEP"), Equipes ("(teams.update)" no aviso de falta de permissão), origem "Padrão (fallback)"/"fallback", mensagem de vigência com nomes internos (`effectiveTo`/`effectiveFrom`), prefixo "Campo inválido:", rótulo **Papel operacional** em Usuários para o que é perfil de acesso, "Override de capacidade não encontrado…". Textos PT-PT na interface: "Utilize", "Utilizador criado…", "demasiado longo", "Seguinte", "A mostrar". Não foram acrescentados ao capítulo 21 (fora do escopo de edição).
14. Botões de Colaboradores e Usuários visíveis sem permissão (ver tabela de permissões).
15. Mensagem pós-redefinição de PIN fala em "senha" (já registrada no capítulo 21).

## Pontos não comprovados — por isso não documentados

1. Efeito da equipe padrão **inativa/removida** de uma matriz ao criar esteira a partir dela (a validação de alocação existe em `conveyors.service.ts`, mas o caminho matriz → esteira não foi auditado).
2. Como alocações de equipe já existentes são exibidas após remover a equipe (o capítulo diz apenas que não são desfeitas — fato do banco).
3. Comportamento do front-end quando `/auth/me` responde 403 para conta inativa com sessão aberta.
4. Telas **Permissões por papel**, **Trilha administrativa** (além do atalho), **Configurações do sistema** e **Matrizes de operação**: fora do escopo do marcador do Capítulo 16; não descritas.
5. Formato da senha temporária gerada.
6. Contagem da coluna **Membros** quando o membro tem colaborador inativo.

## Validações realizadas

| Validação | Resultado |
|---|---|
| `git fetch origin --prune`; tip da base = SHA esperado | OK (`247e07e0…`) |
| Base contém as rodadas documentais anteriores | OK (15/15 ancestrais) |
| `git status --short` antes do commit | apenas `M docs/manual/source/MANUAL_USUARIO_SGP.md` e `?? docs/ai/returns/manual-usuario-sgp-cap16-retorno.md` |
| `git diff --check` | sem saída (OK) |
| Revisão integral do diff | OK; linhas removidas = linha Situação + marcador e 5 tópicos do 16 |
| Capítulos 1–15 e 17–21 intactos (comparação programática com `HEAD`) | OK: antes do 16 idêntico exceto linha 6 (Situação); do 17 em diante idêntico |
| Marcador de pendência do Capítulo 16 removido | OK |
| Linha **Situação** | só mudou: "5 a 14, 17, 20 e 21" → "5 a 14, 16, 17, 20 e 21"; "4, 15, 16, 18 e 19" → "4, 15, 18 e 19" |
| Busca de termos técnicos no texto novo | só ocorrências deliberadas: `STEP` (sinalizado como termo da tela, "leia como atividade"), rótulo de tela **Padrão (fallback)**, mensagem literal com "Utilize". Nenhum nome de endpoint, DTO, tabela, enum ou permissão |
| Confronto das afirmações com código/testes | feito item a item (tabela de evidências acima) |
| Build, lint, testes da aplicação | **NÃO executados** (rodada documental). Testes lidos como evidência: `admin-password-governance.test.ts`, `collaborators.test.ts`, `teams.test.ts`, testes de capacidade e de catálogos (nomes listados) |

## Demais capítulos

Nenhum capítulo além do 16 e da linha **Situação** foi alterado (comparação textual programática).

## Metadado "Revisão deste manual"

Mantido `2026-10-03`, conforme instrução. **Pendência de metadado:** continua desatualizado em relação às rodadas de 2026-10-04. A versão da aplicação (1.9.8) não foi reverificada nesta rodada.

## Observações de processo

- A sessão veio com a branch designada `claude/new-session-l4mxus`; a instrução da atividade exige `docs/manual-usuario-sgp-cap16-cadastros-administracao`, que prevaleceu. Nada foi publicado em outra branch.
- Sem PR, merge, rebase ou force-push. `main`, `develop`, `homol` e branches documentais anteriores não alterados.
- `SESSION_CHECKPOINT.md` não atualizado: não há handoff nem métrica de contexto alta; o retorno registra o estado.

## Próximo passo recomendado

1. Rodada documental curta para alinhar capítulo 21.3 (restauração), capítulo 13 (acesso "desabilitado"/"desliga acesso") e matriz técnica (40.8, COL-003, CFG-002) com o comportamento real.
2. Decisão de produto sobre: exibição/restauração de removidos; liberação de e-mail e colaborador ao remover conta; separação entre funções operacionais e perfis de acesso; encerramento de sessão ao inativar conta; gating de botões por permissão em Colaboradores/Usuários.

## Git

- `git status` final: ver resposta de encerramento (working tree limpa após commit).
- Commit/push: commit único, push apenas da branch `docs/manual-usuario-sgp-cap16-cadastros-administracao`.
- PR: não criado.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
