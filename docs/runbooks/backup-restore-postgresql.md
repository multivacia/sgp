# Runbook — Backup e restore PostgreSQL do SGP+ (VPS + cópia Windows)

## 1. Objetivo e escopo

Procedimento único para:

- backup diário e esporádico da base `sgp_prod` na VPS, com manifesto e checksum;
- restore seguro na VPS (restaura em base nova, troca por rename, permite desfazer);
- cópia dos backups para o servidor Windows do cliente (pull via SFTP), retenção 30 diários + 12 mensais;
- teste mensal de restore no Windows;
- recuperação de desastre (VPS perdida).

Fora deste runbook: tela de backups no SGP, restore produção → HML (previsto via `ALLOWED_TARGET_DBS`/`--pm2-process`, não executado), backup físico/PITR.

Scripts (todos em `scripts/db/`):

| Arquivo | Onde roda | Função |
|---|---|---|
| `backup.env.example` | VPS | Modelo da configuração (`/opt/sgp/backup.env`) |
| `lib/backup-common.sh` | VPS | Funções compartilhadas (não executar direto) |
| `backup-db.sh` | VPS | Backup `daily`, `adhoc` ou `pre-restore` |
| `list-backups.sh` | VPS | Lista backups (`--json` disponível) |
| `restore-db.sh` | VPS | Restore e `--undo` |
| `windows/pull-backups.ps1` | Windows | Cópia (pull) + verificação + retenção |
| `windows/test-restore.ps1` | Windows | Teste mensal de restore |
| `windows/pull-backups.config.example.psd1` | Windows | Modelo da configuração dos dois scripts acima |

Ambiente de referência: VPS HostGator, PostgreSQL 18 na porta 5433, base `sgp_prod`, API no PM2 (`sgp-api`) em `/opt/sgp/sgp-main`.

---

## 2. Estrutura de arquivos na VPS

```
/opt/sgp/backup.env                    configuração (fora do repositório, chmod 600)
/opt/sgp/backups/
  .sgp-backup.lock                     lock: backup e restore não rodam juntos
  local/                               backups daily (+ .dump do backup-sgp.sh legado)
  adhoc/                               backups adhoc e pre-restore
  restore-log/restore.log.jsonl        uma linha JSON por restore/undo (fora do banco)
```

Cada backup gera um **conjunto** com o mesmo nome base `<db>_<tipo>_<AAAAMMDD_HHMMSS>[_N]`:

| Arquivo | Conteúdo |
|---|---|
| `<base>.dump` | `pg_dump -Fc` da base |
| `<base>.globals.sql` | `pg_dumpall --globals-only` (roles). Pode faltar se a role não tiver permissão |
| `<base>.manifest.json` | `file`, `db`, `type`, `reason`, `operator`, `created_at` (UTC), `server_version`, `pg_dump_version`, `app_version`, `size_bytes`, `sha256`, `globals` (`full`, `no-passwords`, `missing`) |
| `<base>.dump.sha256` | checksum no formato `sha256sum` |

Os arquivos são gravados como temporários ocultos (`.<base>.*.tmp`) e só renomeados depois de `pg_dump` sem erro, tamanho > 0 e `pg_restore --list` ok. Nada é sobrescrito.

A retenção do `backup-db.sh` apaga **somente** conjuntos com esse padrão de nome e do tipo correspondente (`daily` em `local/`; `adhoc`/`pre-restore` em `adhoc/`). Os `.dump` do `/opt/sgp/backup-sgp.sh` legado e os diretórios `frontend-*` **não** são tocados.

---

## 3. Instalação na VPS

### 3.1 Pré-requisitos

```bash
/usr/lib/postgresql/18/bin/pg_dump --version   # precisa ser 18.x (major >= servidor)
which flock sha256sum curl                       # util-linux, coreutils, curl
which jq                                         # opcional (recomendado); sem jq há leitura simplificada
```

Os scripts abortam se o major do `pg_dump` for menor que o do servidor. Ajuste `PG_BIN_DIR` se o cliente 18 estiver em outro caminho.

### 3.2 Role de backup somente leitura

Como `postgres` (porta 5433):

```sql
CREATE ROLE sgp_backup LOGIN PASSWORD '<senha-forte>';
GRANT pg_read_all_data TO sgp_backup;
GRANT CONNECT ON DATABASE sgp_prod TO sgp_backup;
```

Se a role não conseguir ler as senhas das roles, o `backup-db.sh` tenta `--no-role-passwords` e, em último caso, segue sem globals (registra `globals` no manifesto).

### 3.3 `.pgpass`

No usuário que executa os scripts (ex.: `root` ou um usuário de operação):

```bash
cat > ~/.pgpass <<'EOF'
127.0.0.1:5433:*:sgp_backup:<senha-sgp_backup>
127.0.0.1:5433:*:postgres:<senha-postgres>
EOF
chmod 600 ~/.pgpass
```

A linha `postgres` só é necessária para o `restore-db.sh` (`RESTORE_PGUSER`). Nenhuma senha vai no `backup.env`.

### 3.4 Configuração

```bash
sudo cp /opt/sgp/sgp-main/scripts/db/backup.env.example /opt/sgp/backup.env
sudo chmod 600 /opt/sgp/backup.env
sudo nano /opt/sgp/backup.env
```

Pontos de atenção:

- `RESTORE_DB_OWNER`: role dona dos objetos da aplicação (a mesma usada pela API). Os objetos restaurados ficam com esse dono.
- `ALLOWED_TARGET_DBS`: só as bases listadas podem ser substituídas pelo restore (padrão `sgp_prod`).
- `VERSION_URL=http://127.0.0.1:<porta-api>/api/v1/version` e `HEALTH_URL=http://127.0.0.1:<porta-api>/api/v1/health` (recomendados).
- `PM2_USER`: preencha se o PM2 roda com outro usuário (o restore usa `sudo -u`).
- Para usar outro arquivo: `export SGP_BACKUP_CONFIG=/caminho/backup.env`.

### 3.5 E-mail de alerta (MTA/`msmtp`)

Os scripts enviam alertas de falha por `SENDMAIL_CMD` (padrão `/usr/sbin/sendmail`). Sem MTA ou sem `ALERT_EMAIL_TO`, apenas registram aviso no log — não falham por isso.

Exemplo com `msmtp`:

```bash
sudo apt-get install msmtp msmtp-mta      # fornece /usr/sbin/sendmail
sudo tee /etc/msmtprc >/dev/null <<'EOF'
defaults
auth on
tls on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile /var/log/msmtp.log
account alertas
host smtp.exemplo.com.br
port 587
from sgp-backup@exemplo.com.br
user sgp-backup@exemplo.com.br
passwordeval "cat /etc/msmtp-senha"
account default : alertas
EOF
sudo chmod 600 /etc/msmtprc /etc/msmtp-senha
printf 'Subject: teste\n\nteste\n' | /usr/sbin/sendmail -t ti@exemplo.com.br
```

### 3.6 Primeira validação

```bash
cd /opt/sgp/sgp-main/scripts/db
./backup-db.sh --type adhoc --reason "validação inicial"
./list-backups.sh
```

### 3.7 Cron diário (opcional — substitui o `backup-sgp.sh`)

O backup diário atual (`/opt/sgp/backup-sgp.sh`, cron `30 2 * * *`, retenção 14 dias em `local/`) **continua como está**. Só troque após validar o novo script por alguns dias (lado a lado, em horários diferentes):

```cron
# em validação (lado a lado)
15 3 * * * /opt/sgp/sgp-main/scripts/db/backup-db.sh --type daily >> /var/log/sgp-backup.log 2>&1
```

Após validação humana, comente a linha do `backup-sgp.sh` e mova o novo para `30 2 * * *`. Os `.dump` legados em `local/` não são apagados pelo novo script; remova-os manualmente quando não forem mais necessários (eles também aparecem no `list-backups.sh` como `legado`).

---

## 4. Backup esporádico

```bash
/opt/sgp/sgp-main/scripts/db/backup-db.sh --type adhoc --reason "antes de ajuste manual no cadastro X"
```

- `--reason` é obrigatório; vai para o manifesto.
- Destino `adhoc/`, retenção `ADHOC_RETENTION_DAYS` (padrão 90; `0` = nunca apagar).
- Outra base: `--db <nome>`.

## 5. Migration manual com backup prévio

O deploy da VPS **não** roda migrations, e o `migrate` não registra versão aplicada. Antes de aplicar migrations manualmente:

```bash
/opt/sgp/sgp-main/scripts/db/backup-db.sh --type adhoc --reason "pre-migration <versão/SHA a publicar>"
# confirme "OK" no final e o arquivo no list-backups
# só então rode a migration conforme o procedimento de deploy
```

Se a migration falhar, use o restore (seção 7) com esse arquivo.

## 6. Listar backups

```bash
/opt/sgp/sgp-main/scripts/db/list-backups.sh          # tabela
/opt/sgp/sgp-main/scripts/db/list-backups.sh --json   # array JSON
```

Colunas: data, tipo (`daily`, `adhoc`, `pre-restore`, `legado`), base, tamanho, versão da app, checksum (`ok`, `falhou`, `sem-checksum`), motivo e arquivo. O comando recalcula o sha256 de cada `.dump` (pode levar alguns segundos com muitos arquivos).

## 7. Restore

> Indisponibilidade aceita: a API fica parada durante a troca (segundos a minutos). Os dados gravados depois do backup escolhido são perdidos na base ativa (ficam na base `_old`).

```bash
cd /opt/sgp/sgp-main/scripts/db
./list-backups.sh
./restore-db.sh --file /opt/sgp/backups/local/sgp_prod_daily_20261011_023000.dump
```

O script:

1. obtém o lock e confere se a base alvo (padrão `BACKUP_DB`) está em `ALLOWED_TARGET_DBS`;
2. confere o `.sha256` (divergência aborta) e o `pg_restore --list`;
3. exibe o resumo: data, tipo/motivo, versão da app no backup × publicada (aviso se diferente), **janela de perda em horas**, base alvo e processo PM2;
4. pede para **digitar o nome exato do arquivo** (ex.: `sgp_prod_daily_20261011_023000.dump`). Sem TTY, só aceita `--confirm <nome-do-arquivo>`. Divergência aborta sem alterar nada;
5. restaura em `<alvo>_restore_<ts>` (`pg_restore -j RESTORE_JOBS --no-owner --role=RESTORE_DB_OWNER`); falha → apaga a temporária, produção intacta;
6. valida (tabelas em `public` > 0) e mostra a contagem atual × restaurada;
7. faz backup `pre-restore` da base atual em `adhoc/` (falha → aborta, produção intacta);
8. troca: cria `MAINTENANCE_FLAG` → `pm2 stop` → encerra conexões → `<alvo>` → `<alvo>_old_<ts>` → `<alvo>_restore_<ts>` → `<alvo>` → `pm2 start` → aguarda `HEALTH_URL` (até `HEALTH_TIMEOUT_SECONDS`) → remove a flag.
   **Qualquer falha após o `pm2 stop`** desfaz os renames, sobe o PM2, remove a flag, envia e-mail e sai com erro;
9. registra o resultado em `/opt/sgp/backups/restore-log/restore.log.jsonl`;
10. imprime o comando de `--undo`.

Opções: `--target-db <nome>` (precisa estar em `ALLOWED_TARGET_DBS`), `--pm2-process <nome>`.

Depois do restore:

- Se a versão da app no backup difere da publicada, publique a versão correspondente ou rode as migrations (idempotentes) conforme o procedimento de deploy.
- Teste login e telas principais.

### 7.1 Desfazer (undo)

```bash
./restore-db.sh --undo --target-db sgp_prod --old-db sgp_prod_old_20261011_143000
```

Pede para digitar o nome da base antiga (ou `--confirm <nome>` sem TTY). Mesma sequência de manutenção/PM2: `<alvo>` → `<alvo>_discarded_<ts>`, `<old>` → `<alvo>`. Dados gravados depois do restore ficam em `_discarded_<ts>`. Registra no log e alerta por e-mail em falha.

### 7.2 Limpeza manual das bases `_old` / `_discarded`

Nenhum script apaga essas bases. Mantenha a `_old` por alguns dias (sugestão: 7) e depois:

```bash
psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "\l sgp_prod_*"
psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -c 'DROP DATABASE "sgp_prod_old_20261011_143000"'
```

Confira o nome duas vezes; não há como desfazer o `DROP DATABASE`.

### 7.3 Log de restore

```bash
tail -n 5 /opt/sgp/backups/restore-log/restore.log.jsonl | jq .
```

Campos: `date`, `operator`, `action` (`restore`/`undo`), `file`, `target_db`, `old_db`, `restored_db`, `result` (`sucesso`, `cancelado`, `falha`, `falha-revertida`, `falha-rollback-incompleto`), `detail`.
`falha-rollback-incompleto` exige ação imediata: confira `\l` e o `pm2 status` e renomeie manualmente conforme a mensagem do script.

---

## 8. Usuário SFTP somente leitura (VPS)

O Windows **busca** os arquivos (pull); a VPS não consegue apagar a cópia do cliente.

```bash
sudo useradd --system --shell /usr/sbin/nologin --home-dir /nonexistent sgp-backup-pull
sudo install -d -m 700 -o sgp-backup-pull /etc/ssh/authorized_keys.d
# colar a chave pública gerada no Windows (seção 9.2):
sudo tee /etc/ssh/authorized_keys.d/sgp-backup-pull >/dev/null <<'EOF'
ssh-ed25519 AAAA... sgp-pull-windows
EOF
```

O `ChrootDirectory` exige que o diretório do chroot e todos os diretórios acima pertençam a `root` e não sejam graváveis por outros. Para **não alterar** o dono de `/opt/sgp` (usado pelo deploy), crie um chroot próprio com *bind mounts* somente leitura de `local/` e `adhoc/`:

```bash
sudo install -d -o root -g root -m 755 /srv/sgp-pull /srv/sgp-pull/local /srv/sgp-pull/adhoc
echo '/opt/sgp/backups/local /srv/sgp-pull/local none bind,ro 0 0' | sudo tee -a /etc/fstab
echo '/opt/sgp/backups/adhoc /srv/sgp-pull/adhoc none bind,ro 0 0' | sudo tee -a /etc/fstab
sudo mkdir -p /opt/sgp/backups/local /opt/sgp/backups/adhoc
sudo mount -a && findmnt /srv/sgp-pull/local /srv/sgp-pull/adhoc
```

Os scripts gravam com `umask 077`; dê leitura ao usuário de pull com ACL (inclusive padrão para arquivos novos):

```bash
sudo setfacl -R -m u:sgp-backup-pull:rX /opt/sgp/backups/local /opt/sgp/backups/adhoc
sudo setfacl -R -d -m u:sgp-backup-pull:rX /opt/sgp/backups/local /opt/sgp/backups/adhoc
```

`/etc/ssh/sshd_config`:

```
Match User sgp-backup-pull
    AuthorizedKeysFile /etc/ssh/authorized_keys.d/%u
    ChrootDirectory /srv/sgp-pull
    ForceCommand internal-sftp -R
    AllowTcpForwarding no
    X11Forwarding no
    PermitTTY no
    PasswordAuthentication no
```

```bash
sudo sshd -t && sudo systemctl reload ssh
```

`-R` deixa o SFTP somente leitura. Dentro do chroot, os caminhos são `local` e `adhoc`.

---

## 9. Servidor Windows do cliente

### 9.1 Pré-requisitos

- Windows com PowerShell 5.1+ (o 7 também funciona).
- **Cliente OpenSSH** (Configurações → Aplicativos → Recursos opcionais), `sftp.exe` em `C:\Windows\System32\OpenSSH`.
- **PostgreSQL 18** (pelo menos as ferramentas cliente; para o teste mensal, o servidor local também).
- Pasta de destino em volume com **BitLocker** ativo (o dump contém dados pessoais — LGPD). Restrinja a pasta (NTFS) ao usuário da tarefa e administradores.

Usuário sugerido para as tarefas: conta local dedicada `svc-sgp-backup`, sem login interativo.

### 9.2 Chave SSH e host conhecido

Como o usuário da tarefa:

```powershell
New-Item -ItemType Directory C:\SGP\ssh -Force | Out-Null
ssh-keygen -t ed25519 -f C:\SGP\ssh\id_ed25519_sgp_pull -N '""' -C sgp-pull-windows
ssh-keyscan -p 22 vps.exemplo.com.br | Out-File -Encoding ascii C:\SGP\ssh\known_hosts
# confira a impressão digital do host com a VPS antes de confiar no known_hosts
icacls C:\SGP\ssh /inheritance:r /grant:r "$env:USERNAME:(OI)(CI)F" "SYSTEM:(OI)(CI)F"
```

Envie `id_ed25519_sgp_pull.pub` para a VPS (seção 8). Teste:

```powershell
sftp -P 22 -i C:\SGP\ssh\id_ed25519_sgp_pull -o UserKnownHostsFile=C:\SGP\ssh\known_hosts sgp-backup-pull@vps.exemplo.com.br
# sftp> ls -l local    (deve listar; put/rm devem ser recusados)
```

### 9.3 Configuração

```powershell
Copy-Item .\scripts\db\windows\* C:\SGP\scripts\
Copy-Item C:\SGP\scripts\pull-backups.config.example.psd1 C:\SGP\scripts\pull-backups.config.psd1
notepad C:\SGP\scripts\pull-backups.config.psd1
```

### 9.4 Credencial SMTP (DPAPI)

Como **o mesmo usuário** que executará as tarefas, **na mesma máquina**:

```powershell
New-Item -ItemType Directory C:\SGP\secrets -Force | Out-Null
Get-Credential -Message 'Conta SMTP' | Export-Clixml C:\SGP\secrets\smtp-cred.xml
```

O arquivo só pode ser lido por esse usuário nesta máquina. Se trocar o usuário da tarefa, gere de novo.

### 9.5 `pgpass.conf` (teste mensal)

`%APPDATA%\postgresql\pgpass.conf` do usuário da tarefa:

```
127.0.0.1:5432:*:postgres:<senha-postgres-local>
```

### 9.6 Teste manual

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\SGP\scripts\pull-backups.ps1 -DryRun
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\SGP\scripts\pull-backups.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\SGP\scripts\test-restore.ps1
Get-Content D:\SGP\backups\logs\pull-$(Get-Date -Format yyyyMMdd).log -Tail 20
```

`-DryRun` mostra o que seria baixado e o que a retenção apagaria, sem alterar nada.

### 9.7 Tarefas agendadas

Diária (após o backup da VPS, ex.: 03h30) e mensal (teste de restore, ex.: dia 5 às 05h00):

```powershell
$user = "$env:COMPUTERNAME\svc-sgp-backup"
$pw   = Read-Host "Senha de $user" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))

$a1 = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\SGP\scripts\pull-backups.ps1'
$t1 = New-ScheduledTaskTrigger -Daily -At 03:30
Register-ScheduledTask -TaskName 'SGP - Pull backups' -Action $a1 -Trigger $t1 -User $user -Password $plain -RunLevel Limited

$a2 = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\SGP\scripts\test-restore.ps1'
$t2 = New-ScheduledTaskTrigger -Weekly -WeeksInterval 4 -DaysOfWeek Sunday -At 05:00
Register-ScheduledTask -TaskName 'SGP - Teste de restore' -Action $a2 -Trigger $t2 -User $user -Password $plain -RunLevel Limited
```

(O Agendador de Tarefas também permite gatilho "Mensal" pela interface gráfica, se preferir dia fixo do mês.)

Verifique no Agendador o "Último resultado" (`0x0` = sucesso; `0x1` = falha, com e-mail enviado).

### 9.8 Comportamento do `pull-backups.ps1`

- Lista com `ls -l` (precisa do tamanho para decidir o download) e baixa com `get -p` para `<arquivo>.part`, renomeando após sucesso.
- Baixa só o que não existe localmente ou tem tamanho diferente.
- Confere SHA256 dos `.dump` baixados contra o `.sha256`; divergência apaga o `.dump` local (é baixado de novo na próxima execução), registra e alerta.
- Retenção local (só conjuntos com `.dump`; arquivos irmãos saem juntos):
  `local\` mantém os últimos `DailyKeepDays` dias + o backup mais antigo de cada mês dos últimos `MonthlyKeepMonths` meses; `adhoc\` conforme `AdhocKeepDays` (0 = nunca apagar).
- Log em `<DestRoot>\logs\pull-AAAAMMDD.log`.
- Mantenha `DailyKeepDays` ≥ `DAILY_RETENTION_DAYS` da VPS e `AdhocKeepDays` = 0 ou ≥ `ADHOC_RETENTION_DAYS`. Caso contrário, arquivos que ainda existem na VPS são apagados pela retenção local e baixados de novo a cada execução.

### 9.9 `test-restore.ps1`

Pega o `.dump` mais recente de `<DestRoot>\local`, confere o SHA256, restaura em `sgp_restore_test` (`--no-owner --no-privileges`), confere tabelas em `public` > 0, remove a base e envia e-mail com o resultado. Não toca nenhuma outra base.

---

## 10. Recuperação de desastre (VPS perdida)

1. Provisione a nova VPS com PostgreSQL 18 e a role da aplicação (o `<base>.globals.sql` do conjunto tem as roles; com `globals = no-passwords` defina as senhas manualmente).
2. No Windows, escolha o conjunto (normalmente o `.dump` mais recente em `D:\SGP\backups\local`) e confira o hash:

   ```powershell
   Get-FileHash D:\SGP\backups\local\sgp_prod_daily_20261011_023000.dump -Algorithm SHA256
   Get-Content D:\SGP\backups\local\sgp_prod_daily_20261011_023000.dump.sha256
   ```

3. Copie o conjunto para a nova VPS (ex.: `scp`) e restaure manualmente:

   ```bash
   psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -f sgp_prod_daily_20261011_023000.globals.sql   # revisar antes
   psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -c 'CREATE DATABASE sgp_prod OWNER <role_app>'
   pg_restore -h 127.0.0.1 -p 5433 -U postgres -d sgp_prod -j 2 --no-owner --role=<role_app> sgp_prod_daily_20261011_023000.dump
   ```

4. Publique a versão da aplicação indicada em `app_version` do `.manifest.json` (ou rode as migrations da versão publicada).
5. Reinstale este runbook na nova VPS (seção 3) e reconfigure o pull no Windows (novo host no `known_hosts`).

Alternativa sem VPS: restaurar no PostgreSQL 18 do próprio Windows com o mesmo `pg_restore` (para consulta/extração de dados).

---

## 11. nginx: página de manutenção (opcional)

Com `MAINTENANCE_FLAG=/opt/sgp/maintenance.flag`, o restore cria o arquivo durante a troca. Trecho para o `server` do SGP:

```nginx
location ^~ /api/ {
    if (-f /opt/sgp/maintenance.flag) {
        return 503;
    }
    # ... proxy_pass existente ...
}

error_page 503 @manutencao;
location @manutencao {
    default_type text/html;
    return 503 '<!doctype html><meta charset="utf-8"><title>SGP em manutenção</title><p>SGP em manutenção. Tente novamente em alguns minutos.</p>';
}
```

Teste com `sudo nginx -t && sudo systemctl reload nginx` e `sudo touch /opt/sgp/maintenance.flag` / `sudo rm /opt/sgp/maintenance.flag`.

---

## 12. Problemas comuns

| Sintoma | Causa provável / ação |
|---|---|
| `pg_dump N é mais antigo que o servidor` | `PG_BIN_DIR` aponta para cliente antigo; use o do PostgreSQL 18 |
| `outro backup/restore está em execução` | Lock ocupado; aguarde. Se não houver processo (`ps aux \| grep -E 'backup-db\|restore-db'`), o lock é liberado sozinho ao fim do processo |
| `globals: missing` no manifesto | Role de backup sem acesso a roles; o `.dump` continua válido |
| `checksum: falhou` no `list-backups` | Arquivo corrompido ou alterado; não use para restore |
| Restore aborta em `pg_restore terminou com erro` | Ver saída; produção não foi alterada e a base temporária foi removida |
| Pull com `Host key verification failed` | `known_hosts` desatualizado (VPS trocada); confira a impressão digital e atualize |
