# Retorno — manual-usuario-sgp-fix-acesso-restauracao-sessao

- **TASK_ID:** `manual-usuario-sgp-fix-acesso-restauracao-sessao`
- **Data/hora:** 2026-10-04 (UTC)
- **Objetivo:** corrigir três divergências documentais comprovadas na rodada do Capítulo 16 (restauração após remoção, desligamento do PIN, sessão após inativação de conta), sem alterar funcionalidade.
- **Status final:** CONCLUÍDO (rodada documental). Build, lint e testes da aplicação **não foram executados** (rodada puramente documental).
- **Branch criada/publicada:** `docs/manual-usuario-sgp-fix-acesso-restauracao-sessao`
- **SHA base (completo):** `c0ddc17d890eb09c32bc03175a518345be709a51` — tip de `origin/docs/manual-usuario-sgp-cap16-cadastros-administracao` após `git fetch origin --prune`; começa por `c0ddc17d`, conforme esperado. Todas as branches documentais anteriores (`base-p0`, cap05–cap14, cap17 e as quatro de correção) confirmadas como ancestrais.
- **SHA final:** é o commit único desta branch que contém este arquivo (`git log -1` da branch). Não é registrado aqui para evitar commit extra de ajuste.

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | uma frase do Capítulo 13 (bloco "Quem costuma ter acesso"); uma célula da tabela do Capítulo 21.3 |
| `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` | uma frase da entrada 40.8 |
| `docs/ai/returns/manual-usuario-sgp-fix-acesso-restauracao-sessao-retorno.md` | este retorno |

Migrations: nenhuma. Código-fonte e HTML gerado: não tocados.

## Comportamentos revalidados no código atual

| # | Comportamento | Evidência | Resultado |
|---|---|---|---|
| 1 | Removidos não aparecem nas listas; **Restaurar** não fica acessível | lista de colaboradores usa `deleted` padrão `exclude` e a tela nunca envia outro valor (`collaboratorsListUrlState.ts` sem campo de removidos); lista de usuários tem filtro fixo de não removidos (`admin-users.repository.ts`). Os itens **Restaurar** existem em `ColaboradoresPage.tsx` e `UsersPage.tsx`, mas só para linhas removidas, que nunca são carregadas. Nenhuma outra tela chama a restauração | **inalterado** desde o Cap. 16 |
| 2 | Não há ação para desligar o PIN; o caminho é inativar o colaborador | nenhum trecho do código grava credencial desabilitada; a única ação administrativa sobre o PIN é a redefinição (que habilita). Colaborador inativo ou removido é recusado no login e na sessão do Modo Fábrica e não aparece na lista de seleção (`production-auth.service.ts`, `production-auth.middleware.ts`, `production-collaborators.repository.ts`) | **inalterado** |
| 3 | Inativar conta bloqueia novos acessos, mas não encerra sessão aberta | login e consulta do próprio perfil recusam conta inativa (`auth.service.ts`); a verificação de sessão a cada requisição considera remoção e troca de senha, mas **não** a inativação (`auth.middleware.ts`, `findPasswordStampForSessionAuth`) | **inalterado** |

Nenhuma divergência em relação à rodada do Capítulo 16.

## Trechos corrigidos

**Capítulo 13 — Quem costuma ter acesso**

- Antes: "Quem libera, redefine PIN e desliga acesso é quem administra colaboradores, em **Colaboradores** (capítulo 16)."
- Depois: "Quem libera e redefine o PIN é quem administra colaboradores, em **Colaboradores** (capítulo 16). Não existe uma ação específica para desligar o PIN: para impedir que alguém entre no Modo Fábrica, a administração **inativa o cadastro do colaborador**, que deixa de aparecer na seleção do totem e do navegador da fábrica."

**Capítulo 21.3 — linha "Remover (soft delete)", coluna Observação**

- Antes: "o registro deixa de aparecer e pode ser restaurado"
- Depois: "o registro deixa de aparecer nas listas e a opção de restaurar não fica acessível pela tela; trate a remoção como definitiva"

**Matriz técnica 40.8 — Usuário inativo**

- Antes: "Usuário inativo não pode autenticar nem continuar utilizando sessão previamente válida."
- Depois: "Usuário inativo não pode autenticar. Uma sessão que já estava aberta não é encerrada automaticamente apenas pela inativação."
- A mensagem citada na entrada ("Sua conta está inativa. Contacte o administrador.") foi mantida.

## Validações realizadas

| Validação | Resultado |
|---|---|
| `git status --short` antes do commit | `M` nos dois manuais e `??` neste retorno; nada mais |
| `git diff --check` | sem saída (OK) |
| Revisão integral do diff | 3 linhas removidas, 3 adicionadas, exatamente nos trechos autorizados |
| Capítulos alterados (comparação programática por capítulo com `HEAD`) | somente 13 e 21 |
| Capítulo 16 | textualmente intacto |
| Demais capítulos e cabeçalho do manual do usuário | intactos |
| Matriz técnica | somente a frase da 40.8 mudou |
| Linha **Situação** | não mudou |
| **Revisão deste manual: 2026-10-03** | não mudou |
| Afirmações incompatíveis restantes nos três pontos | nenhuma |
| Novas afirmações não comprovadas | nenhuma: "deixa de aparecer na seleção do totem e do navegador da fábrica" comprovado pela lista de seleção, que só traz colaboradores ativos e não removidos |
| Termos técnicos novos | nenhum (o rótulo "soft delete" já existia na linha do 21.3 e reproduz o texto da tela) |
| Build, lint, testes | **NÃO executados** (rodada documental) |

## Observações residuais (não alteradas, fora do escopo estrito)

- O Capítulo 13 mantém a linha **desabilitada — "o acesso foi desligado"** na tabela de estados da credencial e as mensagens **"Acesso desabilitado."** e "a credencial foi desligada durante o uso". O estado e as mensagens existem no sistema, mas nenhuma ação da interface produz credencial desabilitada. Não afirmam a existência de um botão; foram mantidas. Avaliar em rodada futura se convém explicar que, na prática, esse estado não é produzido pela tela.

## Pendências mantidas fora do escopo

- bloqueio de e-mail e de colaborador vinculado após remoção de conta;
- indicação "Sem vínculo" em Colaboradores para colaborador preso a conta removida;
- relação entre funções operacionais e perfis de acesso (inclui CFG-002 da matriz);
- botões visíveis sem permissão em Colaboradores/Usuários;
- termos técnicos exibidos na interface, `ARGOS`, `draft`, `partItems`, `Ficheiro`;
- COL-003 da matriz ("Pode ser habilitado/desabilitado"), não incluída nesta rodada;
- metadado **Revisão deste manual** desatualizado (2026-10-03).

## Git

- Sem PR, merge, rebase ou force-push. `main`, `develop`, `homol` e branches documentais anteriores não alterados.
- A sessão tem a branch designada `claude/new-session-l4mxus`; prevaleceu a branch exigida pela atividade.
- Commit único; push apenas de `docs/manual-usuario-sgp-fix-acesso-restauracao-sessao`.
- `git status` final: ver resposta de encerramento (working tree limpa após commit).

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
