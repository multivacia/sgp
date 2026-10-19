# Claude Code — Backup automático, cópia externa e restore da base de produção

- **TASK_ID:** `backup-restore-bases`
- **Solução aprovada por:** Gustavo, em 19/10/2026.
- **Base analisada:** `develop` em `22a45be`.

## Modelo e esforço recomendados

- Modelo: o mais capaz disponível no Claude Code (preferencialmente Opus).
- Esforço: alto.

## Contexto confirmado

- Produção roda numa VPS HostGator, com PostgreSQL na própria VPS. Workflow: `.github/workflows/deploy-hostgator-vps.yml`, app em `/opt/sgp/sgp-main`. HML ainda não existe na VPS.
- Já existem `scripts/db/backup_all_databases.sh|.ps1` (`pg_dumpall`, manual) e `docs/backup-bases.md`. Não há agendamento, retenção, cópia externa nem backup de banco antes do deploy (o workflow só copia o frontend).
- `docs/deploy-sgp-ec2.md` descreve EC2, mas os workflows ativos são HostGator. Registrar essa divergência no retorno; não corrigir docs de deploy fora do necessário.
- O runner `server/src/scripts/migrate.ts` executa todas as migrations em sequência, sem tabela de controle, e **falha em base já migrada** a partir da `0002` (problema preexistente, confirmado na atividade `esteiras-historico-painel`). Em produção, o Gustavo aplica migrations manualmente com `npm run migrate:file`. **Não automatizar migrations nesta entrega.**
- O papel `SUPER_ADMIN` existe e só ele tem `system_settings.manage`.

## Escopo desta entrega

Só a base de **produção**. Perda de até 24 h em caso de desastre é aceita.

### 1. Script de backup na VPS

Criar `scripts/db/backup/sgp-db-backup.sh` (bash, `set -euo pipefail`):

1. Lê credenciais do mesmo `server.env` usado pela API (caminho configurável). Nunca grava senha em log nem em linha de comando.
2. Gera, com timestamp no nome:
   - `pg_dump -Fc` da base da aplicação;
   - `pg_dumpall --globals-only` (roles).
3. Valida o dump com `pg_restore --list` e grava o SHA-256 de cada arquivo.
4. Diretório de destino configurável (padrão `/opt/sgp/backups/db`), permissões restritas.
5. Parâmetro `--reason` com os valores `scheduled`, `manual`, `pre-deploy` e `pre-restore`.
6. Trava com `flock`: nunca dois backups ou restores ao mesmo tempo.
7. Retenção na VPS: **7 diários, 4 semanais e 3 mensais**. Regra de classificação objetiva e documentada no próprio script (ex.: semanal = domingo, mensal = dia 1). Backups `pre-deploy` e `pre-restore` seguem a mesma retenção dos diários.
8. Log de execuções em arquivo na VPS, uma linha JSON por execução (início, fim, motivo, arquivos, tamanhos, SHA-256, status, mensagem de erro). Sem tabela no banco.

### 2. Agendamento e backup antes do deploy

1. Exemplos versionados `deploy/systemd/sgp-db-backup.service.example` e `.timer.example`: execução diária de madrugada, horário de São Paulo.
2. No `deploy-hostgator-vps.yml`, executar o backup com `--reason pre-deploy` **antes** de trocar a release. Se o backup falhar, o deploy para. Não mexer em secrets.

### 3. Cópia para o OneDrive da Bravo (máquina de Compras)

1. A máquina de Compras (Windows, ligada todos os dias) puxa os backups por SSH para uma pasta sincronizada no OneDrive da Bravo. Sem criptografia.
2. Na VPS: script `scripts/db/backup/sgp-backup-remote.sh` para uso como **forced command** de um usuário SSH dedicado. Ele aceita só três comandos:
   - `list`: lista os backups disponíveis com SHA-256;
   - `get <arquivo>`: envia o arquivo pela saída padrão, validando o nome contra a lista (sem path traversal);
   - `confirm <arquivo> <sha256>`: registra no log que a cópia foi feita e conferida.
3. No Windows: `scripts/db/windows/sgp-backup-pull.ps1`, que usa o OpenSSH nativo do Windows para:
   - baixar só os arquivos que ainda não existem na pasta local;
   - conferir o SHA-256;
   - confirmar a cópia na VPS só depois da conferência;
   - gravar log local.
4. Retenção no OneDrive: parâmetro configurável. **Padrão: não apagar nada** (retenção ainda não definida).
5. Documentar a criação da tarefa agendada do Windows e do usuário SSH na VPS (chave, `authorized_keys` com `command=` e restrições). Essas configurações são manuais; não tente acessar a VPS nem a máquina de Compras.

### 4. Tela Backups (Super-admin)

Backend: módulo novo `server/src/modules/database-backups`, rotas em `/api/v1/admin/database-backups`, todas com `requirePermission('system_settings.manage')`.

1. **Listar**: só backups com cópia confirmada no OneDrive **e** ainda presentes na VPS. Dados de cada item: data, motivo, tamanho, data da confirmação da cópia.
2. **Status**: resultado da última execução. Se a última falhou, devolver a mensagem de erro para aviso na tela.
3. **Backup manual**: dispara o script com `--reason manual` de forma assíncrona (202). Se a trava estiver ocupada, responder 409.
4. **Download** de um backup da lista, por streaming, validando o nome.
5. **Restore em produção**:
   1. corpo com o arquivo e o nome da base digitado pelo usuário; se o nome não conferir, 422;
   2. ativa **modo manutenção** na API: as demais requisições recebem 503 com mensagem em português até o fim;
   3. executa backup de segurança com `--reason pre-restore`; se falhar, aborta sem tocar na base;
   4. executa `pg_restore --clean --if-exists --single-transaction` do arquivo escolhido. Falha desfaz tudo;
   5. **não** executa migrations. Ao concluir, sai do modo manutenção e a tela avisa que, se o backup for anterior a migrations já aplicadas, elas devem ser reaplicadas manualmente com `npm run migrate:file` (o runbook explica como identificar quais);
   6. se o passo 4 falhar, sai do modo manutenção com a base intacta e mostra o erro;
   7. registra o restore no log da VPS **e** em `admin_audit_events` **depois** do restore, pois o restore substitui a tabela de auditoria.

Frontend: página nova em Configurações do sistema (grupo Estrutura e administração), visível só com `system_settings.manage`:

- lista de backups, status da última execução e aviso de erro no topo;
- botões Fazer backup agora e Baixar;
- Restaurar com diálogo que explica o efeito (substitui todos os dados atuais), pede o nome da base digitado e mostra o andamento.

### 5. Desastre (VPS perdida)

`docs/backup-restore-runbook.md`: roteiro para subir uma VPS nova a partir da cópia do OneDrive (PostgreSQL, roles, `pg_restore`, migrations, app, Nginx, validação). Incluir também o restore manual de backups que só existem no OneDrive. Fora da tela.

### 6. Documentação

- Atualizar `docs/backup-bases.md`: registrar a decisão do Gustavo que permite restore destrutivo pela tela (Super-admin, com as proteções acima) e apontar para os scripts novos e o runbook.
- Registrar para o futuro HML: restore a partir de produção deve **mascarar as senhas** dos usuários. Não implementar agora.

### 7. Versão do pacote

Esta entrega fecha o pacote **1.11.0** (Histórico de esteiras + Backup), que será promovido para produção depois da validação. Em commit separado e revertível, atualizar `app-version.json`:

- `version`: `1.11.0`;
- `releaseName`: `Histórico de esteiras no Painel operacional e backup da base`;
- `releaseDate`: `2026-10-19`;
- manter `product` e `channel`.

Se algum teste espera a versão fixa (ex.: `server/src/tests/env.test.ts`, que já falhava na `develop` por esperar versão antiga), alinhar o teste à versão nova e registrar no retorno.

## Escopo congelado

- Não alterar regras de negócio, telas ou permissões fora deste módulo.
- Não criar migration (permissão reusada, log em arquivo).
- Fora do módulo, só são permitidas as alterações de registro de rotas, item de menu, workflow de deploy (passo de backup), documentação e `app-version.json` (item 7).
- Não alterar secrets, não acessar a VPS e não executar nada em ambiente compartilhado.
- Sem deploy, merge ou push sem autorização explícita posterior.

## Testes obrigatórios

1. Retenção: com lista fictícia de arquivos, confirmar quais são mantidos e apagados.
2. `sgp-backup-remote.sh`: recusa comando desconhecido e nome de arquivo fora da lista (incluindo `../`).
3. API: 403 sem `system_settings.manage`; lista só com cópia confirmada e presente; 409 com trava ocupada; 422 com nome da base errado; download recusa nome inválido.
4. Restore ponta a ponta em PostgreSQL local descartável (porta não padrão): gerar backup, alterar dados, restaurar, conferir os dados e o aviso sobre migrations; simular falha no `pg_restore` e confirmar que a base ficou intacta.
5. Modo manutenção: requisições comuns recebem 503 durante o restore.
6. `shellcheck` nos scripts bash, se disponível no ambiente.

Execute build, lint/typecheck e os testes direcionados. Falha preexistente deve ser separada do resultado desta alteração.

## Entrega esperada

1. Siga `CLAUDE.md` e `AGENTS.md`. Faça `git fetch origin develop`, registre o SHA inicial (base esperada: `develop` com o Histórico de esteiras já integrado) e crie a branch `feat/backup-restore-bases`.
2. Não faça merge nem push sem autorização explícita.
3. Gere `docs/ai/returns/backup-restore-bases-retorno.md` com: arquivos criados e alterados, passos manuais que o Gustavo precisa executar na VPS e na máquina de Compras, testes executados e resultado real, divergência EC2 × HostGator, pendências e riscos.
