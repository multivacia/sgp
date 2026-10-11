#Requires -Version 5.1
<#
.SYNOPSIS
  Teste mensal de restore dos backups do SGP+ copiados para o servidor Windows.

.DESCRIPTION
  Pega o .dump mais recente de <DestRoot>\local, confere o SHA256 (quando houver .sha256),
  restaura na base sgp_restore_test do PostgreSQL 18 local, conta as tabelas do schema
  public (precisa ser > 0), remove a base de teste e envia e-mail com o resultado
  (sucesso ou falha).

  Nunca toca outra base além de sgp_restore_test.

  Configuração: o mesmo .psd1 do pull-backups.ps1 (DestRoot, SMTP e PgBinDir, PgHost,
  PgPort, PgUser). Senha do PostgreSQL via %APPDATA%\postgresql\pgpass.conf.
  Log: <DestRoot>\logs\test-restore-AAAAMMDD.log.
  Ver docs/runbooks/backup-restore-postgresql.md.

.PARAMETER ConfigPath
  Arquivo .psd1 de configuração. Padrão: pull-backups.config.psd1 na pasta do script.

.EXAMPLE
  .\test-restore.ps1
#>

[CmdletBinding()]
param(
  [string] $ConfigPath = (Join-Path $PSScriptRoot 'pull-backups.config.psd1')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

# Base fixa: o script não aceita outro nome por parâmetro.
$TestDb = 'sgp_restore_test'
$script:LogFile = $null

function Write-Log {
  param([string] $Message, [ValidateSet('INFO', 'AVISO', 'ERRO')] [string] $Level = 'INFO')
  $line = '{0} [test-restore] {1}: {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
  if ($Level -eq 'ERRO') { Write-Host $line -ForegroundColor Red }
  elseif ($Level -eq 'AVISO') { Write-Host $line -ForegroundColor Yellow }
  else { Write-Host $line }
  if ($script:LogFile) {
    try { Add-Content -LiteralPath $script:LogFile -Value $line -Encoding UTF8 } catch { Write-Host "Falha ao gravar log: $_" }
  }
}

function Send-Alert {
  param([hashtable] $Cfg, [string] $Subject, [string] $Body)
  if (-not $Cfg.ContainsKey('SmtpServer') -or -not $Cfg.SmtpServer -or -not $Cfg.ContainsKey('MailTo') -or -not $Cfg.MailTo) {
    Write-Log -Level AVISO -Message "SMTP/MailTo não configurado; e-mail não enviado: $Subject"
    return
  }
  try {
    $params = @{
      SmtpServer = $Cfg.SmtpServer
      Port       = $(if ($Cfg.ContainsKey('SmtpPort')) { [int] $Cfg.SmtpPort } else { 587 })
      From       = $Cfg.MailFrom
      To         = @($Cfg.MailTo)
      Subject    = "[SGP backup] $Subject"
      Body       = "$Body`r`n`r`nServidor: $env:COMPUTERNAME`r`nData: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
      Encoding   = [System.Text.Encoding]::UTF8
    }
    if ($Cfg.ContainsKey('SmtpUseSsl') -and $Cfg.SmtpUseSsl) { $params.UseSsl = $true }
    if ($Cfg.ContainsKey('SmtpCredentialFile') -and $Cfg.SmtpCredentialFile) {
      $params.Credential = Import-Clixml -LiteralPath $Cfg.SmtpCredentialFile
    }
    Send-MailMessage @params -WarningAction SilentlyContinue
    Write-Log -Message "e-mail enviado: $Subject"
  } catch {
    Write-Log -Level AVISO -Message "falha ao enviar e-mail ($Subject): $_"
  }
}

# Executa binário nativo; retorna @{ ExitCode; Output }.
function Invoke-Native {
  param([string] $Exe, [string[]] $Arguments)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $out = & $Exe @Arguments 2>&1 | ForEach-Object { "$_" }
    return @{ ExitCode = $LASTEXITCODE; Output = @($out) }
  } finally {
    $ErrorActionPreference = $prev
  }
}

function Invoke-Psql {
  param([hashtable] $Pg, [string] $Database, [string] $Sql)
  $r = Invoke-Native -Exe $Pg.Psql -Arguments @('-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
    '-h', $Pg.Host, '-p', $Pg.Port, '-U', $Pg.User, '-d', $Database, '-c', $Sql)
  if ($r.ExitCode -ne 0) { throw "psql falhou ($Sql): $($r.Output -join ' | ')" }
  return ($r.Output -join "`n").Trim()
}

function Remove-TestDatabase {
  param([hashtable] $Pg)
  Invoke-Psql -Pg $Pg -Database 'postgres' -Sql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TestDb' AND pid <> pg_backend_pid()" | Out-Null
  Invoke-Psql -Pg $Pg -Database 'postgres' -Sql "DROP DATABASE IF EXISTS $TestDb" | Out-Null
}

$cfg = $null
$ok = $false
$summary = ''
$dumpPath = ''
$pg = $null
$created = $false

try {
  if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Arquivo de configuração não encontrado: $ConfigPath" }
  $cfg = Import-PowerShellDataFile -LiteralPath $ConfigPath
  foreach ($k in @('DestRoot', 'PgBinDir')) {
    if (-not $cfg.ContainsKey($k) -or [string]::IsNullOrWhiteSpace([string] $cfg[$k])) { throw "Configuração obrigatória ausente: $k" }
  }
  $logDir = Join-Path $cfg.DestRoot 'logs'
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  $script:LogFile = Join-Path $logDir ('test-restore-{0}.log' -f (Get-Date -Format 'yyyyMMdd'))
  Write-Log -Message "início (config: $ConfigPath)"

  $pg = @{
    Psql      = Join-Path $cfg.PgBinDir 'psql.exe'
    PgRestore = Join-Path $cfg.PgBinDir 'pg_restore.exe'
    Host      = $(if ($cfg.ContainsKey('PgHost') -and $cfg.PgHost) { [string] $cfg.PgHost } else { '127.0.0.1' })
    Port      = $(if ($cfg.ContainsKey('PgPort') -and $cfg.PgPort) { [string] $cfg.PgPort } else { '5432' })
    User      = $(if ($cfg.ContainsKey('PgUser') -and $cfg.PgUser) { [string] $cfg.PgUser } else { 'postgres' })
  }
  foreach ($exe in @($pg.Psql, $pg.PgRestore)) {
    if (-not (Test-Path -LiteralPath $exe)) { throw "Binário não encontrado: $exe (verifique PgBinDir)" }
  }

  $localDir = Join-Path $cfg.DestRoot 'local'
  $latest = Get-ChildItem -LiteralPath $localDir -Filter '*.dump' -File -ErrorAction Stop |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latest) { throw "Nenhum .dump encontrado em $localDir" }
  $dumpPath = $latest.FullName
  Write-Log -Message "backup mais recente: $($latest.Name) ($($latest.Length) bytes, $($latest.LastWriteTime.ToString('yyyy-MM-dd HH:mm')))"

  $sumPath = "$dumpPath.sha256"
  if (Test-Path -LiteralPath $sumPath) {
    $expected = ((Get-Content -LiteralPath $sumPath -TotalCount 1) -split '\s+')[0].Trim().ToLowerInvariant()
    $actual = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($expected -ne $actual) { throw "SHA256 divergente em $($latest.Name)" }
    Write-Log -Message 'sha256 ok.'
  } else {
    Write-Log -Level AVISO -Message 'sem .sha256; integridade não verificada por checksum.'
  }

  Remove-TestDatabase -Pg $pg
  Invoke-Psql -Pg $pg -Database 'postgres' -Sql "CREATE DATABASE $TestDb" | Out-Null
  $created = $true
  Write-Log -Message "base $TestDb criada; restaurando..."

  $r = Invoke-Native -Exe $pg.PgRestore -Arguments @('-h', $pg.Host, '-p', $pg.Port, '-U', $pg.User,
    '-d', $TestDb, '-j', '2', '--no-owner', '--no-privileges', $dumpPath)
  if ($r.ExitCode -ne 0) {
    throw "pg_restore terminou com código $($r.ExitCode): $(($r.Output | Select-Object -Last 5) -join ' | ')"
  }

  $tables = [int] (Invoke-Psql -Pg $pg -Database $TestDb -Sql "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
  if ($tables -le 0) { throw "base restaurada sem tabelas em public" }

  $ok = $true
  $summary = "Restore de teste OK: $($latest.Name) -> $TestDb; $tables tabela(s) em public."
  Write-Log -Message $summary
} catch {
  $summary = "Teste de restore FALHOU$(if ($dumpPath) { " ($dumpPath)" }): $_"
  Write-Log -Level ERRO -Message $summary
} finally {
  if ($created -and $pg) {
    try {
      Remove-TestDatabase -Pg $pg
      Write-Log -Message "base $TestDb removida."
    } catch {
      $ok = $false
      $summary += " | Falha ao remover $TestDb`: $_"
      Write-Log -Level ERRO -Message "falha ao remover $TestDb`: $_"
    }
  }
}

if ($cfg) {
  $subject = if ($ok) { 'Teste mensal de restore: SUCESSO' } else { 'Teste mensal de restore: FALHA' }
  Send-Alert -Cfg $cfg -Subject $subject -Body "$summary`r`n`r`nLog: $script:LogFile"
}

if ($ok) { exit 0 } else { exit 1 }
