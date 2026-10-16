# Modelo de configuração de pull-backups.ps1 e test-restore.ps1 (servidor Windows do cliente).
#
# Copie para pull-backups.config.psd1 (mesma pasta dos scripts) ou informe -ConfigPath.
# Não coloque senhas aqui:
#   - SSH: chave privada em IdentityFile (sem senha, acesso restrito ao usuário da tarefa).
#   - SMTP: credencial gerada com Export-Clixml (protegida por DPAPI; só o mesmo usuário
#     do Windows, na mesma máquina, consegue ler). Ver docs/runbooks/backup-restore-postgresql.md
#   - PostgreSQL local: %APPDATA%\postgresql\pgpass.conf do usuário da tarefa.
@{
  # --- VPS (SFTP somente leitura) ---
  VpsHost        = 'vps.exemplo.com.br'
  VpsPort        = 22
  VpsUser        = 'sgp-backup-pull'
  IdentityFile   = 'C:\SGP\ssh\id_ed25519_sgp_pull'
  KnownHostsFile = 'C:\SGP\ssh\known_hosts'
  # Diretórios relativos à raiz SFTP (ChrootDirectory /srv/sgp-pull, com bind mounts de /opt/sgp/backups/local e adhoc).
  RemoteDirs     = @('local', 'adhoc')

  # --- Destino local e retenção ---
  DestRoot          = 'D:\SGP\backups'
  DailyKeepDays     = 30   # local\: mantém tudo dos últimos N dias
  MonthlyKeepMonths = 12   # local\: + o backup mais antigo de cada mês dos últimos N meses
  AdhocKeepDays     = 0    # adhoc\: 0 = nunca apagar

  # --- E-mail ---
  SmtpServer         = 'smtp.exemplo.com.br'
  SmtpPort           = 587
  SmtpUseSsl         = $true
  MailFrom           = 'sgp-backup@exemplo.com.br'
  MailTo             = @('ti@exemplo.com.br')
  SmtpCredentialFile = 'C:\SGP\secrets\smtp-cred.xml'   # vazio = SMTP sem autenticação
  NotifyOnSuccess    = $false

  # --- Teste mensal de restore (test-restore.ps1) ---
  PgBinDir = 'C:\Program Files\PostgreSQL\18\bin'
  PgHost   = '127.0.0.1'
  PgPort   = 5432
  PgUser   = 'postgres'
}
