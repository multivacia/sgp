#Requires -Version 5.1
<#
.SYNOPSIS
  Copia (pull) os backups PostgreSQL do SGP+ da VPS para o servidor Windows do cliente.

.DESCRIPTION
  Usa o sftp do OpenSSH nativo do Windows, em modo leitura, com arquivo batch (-b):
  "ls -l" para listar e "get -p" para baixar (preserva a data). Cada arquivo é baixado
  como .part e renomeado só após sucesso. Só baixa o que não existe localmente ou tem
  tamanho diferente. Confere SHA256 dos .dump contra o .sha256 do conjunto; divergência
  apaga o .dump local, registra e alerta.

  Retenção local (somente .dump e arquivos irmãos do mesmo conjunto):
    local\  tudo dos últimos DailyKeepDays dias + o backup mais antigo de cada mês
            dos últimos MonthlyKeepMonths meses;
    adhoc\  conjuntos com mais de AdhocKeepDays dias (0 = nunca apagar).
  Data de referência: timestamp do nome do arquivo, quando houver; senão LastWriteTime.

  Log: <DestRoot>\logs\pull-AAAAMMDD.log. Falha: e-mail e exit code diferente de 0.
  Agendado pelo Agendador de Tarefas. Ver docs/runbooks/backup-restore-postgresql.md.

.PARAMETER ConfigPath
  Arquivo .psd1 de configuração (modelo: pull-backups.config.example.psd1).
  Padrão: pull-backups.config.psd1 na pasta do script.

.PARAMETER DryRun
  Não baixa nem apaga nada: mostra o que seria baixado e o que a retenção apagaria.

.EXAMPLE
  .\pull-backups.ps1

.EXAMPLE
  .\pull-backups.ps1 -ConfigPath D:\SGP\pull-backups.config.psd1 -DryRun
#>

[CmdletBinding()]
param(
  [string] $ConfigPath = (Join-Path $PSScriptRoot 'pull-backups.config.psd1'),
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$script:Errors = New-Object System.Collections.Generic.List[string]
$script:LogFile = $null

# ---------------------------------------------------------------------------
# Log e alertas
# ---------------------------------------------------------------------------

function Write-Log {
  param([string] $Message, [ValidateSet('INFO', 'AVISO', 'ERRO')] [string] $Level = 'INFO')
  $line = '{0} [pull-backups] {1}: {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
  if ($Level -eq 'ERRO') { Write-Host $line -ForegroundColor Red }
  elseif ($Level -eq 'AVISO') { Write-Host $line -ForegroundColor Yellow }
  else { Write-Host $line }
  if ($script:LogFile) {
    try { Add-Content -LiteralPath $script:LogFile -Value $line -Encoding UTF8 } catch { Write-Host "Falha ao gravar log: $_" }
  }
}

function Add-PullError {
  param([string] $Message)
  $script:Errors.Add($Message)
  Write-Log -Level ERRO -Message $Message
}

function Send-Alert {
  param([hashtable] $Cfg, [string] $Subject, [string] $Body)
  if (-not $Cfg.SmtpServer -or -not $Cfg.MailTo) {
    Write-Log -Level AVISO -Message "SMTP/MailTo não configurado; e-mail não enviado: $Subject"
    return
  }
  try {
    $params = @{
      SmtpServer = $Cfg.SmtpServer
      Port       = [int] $Cfg.SmtpPort
      From       = $Cfg.MailFrom
      To         = @($Cfg.MailTo)
      Subject    = "[SGP backup] $Subject"
      Body       = "$Body`r`n`r`nServidor: $env:COMPUTERNAME`r`nData: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
      Encoding   = [System.Text.Encoding]::UTF8
    }
    if ($Cfg.SmtpUseSsl) { $params.UseSsl = $true }
    if ($Cfg.SmtpCredentialFile) {
      $params.Credential = Import-Clixml -LiteralPath $Cfg.SmtpCredentialFile
    }
    Send-MailMessage @params -WarningAction SilentlyContinue
    Write-Log -Message "e-mail enviado: $Subject"
  } catch {
    Write-Log -Level AVISO -Message "falha ao enviar e-mail ($Subject): $_"
  }
}

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

function Read-PullConfig {
  param([string] $Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Arquivo de configuração não encontrado: $Path"
  }
  $cfg = Import-PowerShellDataFile -LiteralPath $Path
  $defaults = @{
    VpsPort = 22; RemoteDirs = @('local', 'adhoc'); DailyKeepDays = 30; MonthlyKeepMonths = 12
    AdhocKeepDays = 0; SmtpPort = 587; SmtpUseSsl = $true; NotifyOnSuccess = $false
    SmtpCredentialFile = ''; KnownHostsFile = ''; MailTo = @(); MailFrom = ''; SmtpServer = ''
  }
  foreach ($k in $defaults.Keys) {
    if (-not $cfg.ContainsKey($k) -or $null -eq $cfg[$k]) { $cfg[$k] = $defaults[$k] }
  }
  foreach ($k in @('VpsHost', 'VpsUser', 'IdentityFile', 'DestRoot')) {
    if (-not $cfg.ContainsKey($k) -or [string]::IsNullOrWhiteSpace([string] $cfg[$k])) {
      throw "Configuração obrigatória ausente: $k"
    }
  }
  return $cfg
}

# ---------------------------------------------------------------------------
# SFTP
# ---------------------------------------------------------------------------

function Get-SftpPath {
  $cmd = Get-Command 'sftp.exe' -ErrorAction SilentlyContinue
  if (-not $cmd) { $cmd = Get-Command 'sftp' -ErrorAction SilentlyContinue }
  if ($cmd) { return $cmd.Source }
  $fallback = Join-Path $env:WINDIR 'System32\OpenSSH\sftp.exe'
  if (Test-Path -LiteralPath $fallback) { return $fallback }
  throw 'sftp (OpenSSH) não encontrado. Instale o recurso opcional "Cliente OpenSSH".'
}

function ConvertTo-SftpPath {
  param([string] $Path)
  return '"' + ($Path -replace '\\', '/') + '"'
}

# Executa um batch sftp (somente leitura). Retorna @{ ExitCode; Output }.
function Invoke-SftpBatch {
  param([hashtable] $Cfg, [string] $Sftp, [string[]] $Commands)
  $batch = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllLines($batch, $Commands)
    $sshArgs = @('-b', $batch, '-P', [string] $Cfg.VpsPort, '-i', $Cfg.IdentityFile,
      '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes')
    if ($Cfg.KnownHostsFile) { $sshArgs += @('-o', "UserKnownHostsFile=$($Cfg.KnownHostsFile)") }
    $sshArgs += "$($Cfg.VpsUser)@$($Cfg.VpsHost)"
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $out = & $Sftp @sshArgs 2>&1 | ForEach-Object { "$_" }
      $code = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $prev
    }
    return @{ ExitCode = $code; Output = @($out) }
  } finally {
    Remove-Item -LiteralPath $batch -Force -ErrorAction SilentlyContinue
  }
}

# Lista arquivos regulares de um diretório remoto: @{ Name; Size }.
function Get-RemoteFiles {
  param([hashtable] $Cfg, [string] $Sftp, [string] $RemoteDir)
  $r = Invoke-SftpBatch -Cfg $Cfg -Sftp $Sftp -Commands @("ls -l $(ConvertTo-SftpPath $RemoteDir)")
  if ($r.ExitCode -ne 0) {
    throw "sftp ls falhou em '$RemoteDir' (código $($r.ExitCode)): $($r.Output -join ' | ')"
  }
  $files = @()
  foreach ($line in $r.Output) {
    if ($line -notmatch '^-') { continue }   # apenas arquivos regulares
    $parts = $line -split '\s+'
    if ($parts.Count -lt 9) { continue }
    $name = Split-Path -Leaf ($parts[-1])
    if ($name -notmatch '\.(dump|dump\.sha256|globals\.sql|manifest\.json)$') { continue }
    $files += [pscustomobject]@{ Name = $name; Size = [int64] $parts[4] }
  }
  return $files
}

# ---------------------------------------------------------------------------
# Conjuntos e retenção
# ---------------------------------------------------------------------------

function Get-SetBaseName {
  param([string] $FileName)
  foreach ($suffix in @('.dump.sha256', '.globals.sql', '.manifest.json', '.dump')) {
    if ($FileName.EndsWith($suffix, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $FileName.Substring(0, $FileName.Length - $suffix.Length)
    }
  }
  return $null
}

function Get-SetReferenceDate {
  param([string] $BaseName, [System.IO.FileInfo] $DumpFile)
  $m = [regex]::Match($BaseName, '(\d{8})_(\d{6})')
  if ($m.Success) {
    $d = [datetime]::MinValue
    if ([datetime]::TryParseExact($m.Groups[1].Value + $m.Groups[2].Value, 'yyyyMMddHHmmss',
        [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::None, [ref] $d)) {
      return $d
    }
  }
  $m = [regex]::Match($BaseName, '(\d{8})')
  if ($m.Success) {
    $d = [datetime]::MinValue
    if ([datetime]::TryParseExact($m.Groups[1].Value, 'yyyyMMdd',
        [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::None, [ref] $d)) {
      return $d
    }
  }
  return $DumpFile.LastWriteTime
}

<#
  Aplica a retenção em um diretório local. Só considera conjuntos que têm .dump.
  -Mode Daily: mantém os últimos DailyKeepDays dias + o mais antigo de cada mês dos
               últimos MonthlyKeepMonths meses (incluindo o mês atual).
  -Mode Adhoc: apaga conjuntos com mais de AdhocKeepDays dias (0 = nunca apagar).
  -DryRun ou -WhatIf: só informa o que seria apagado. Retorna a lista de conjuntos removidos.
#>
function Invoke-BackupRetention {
  [CmdletBinding(SupportsShouldProcess = $true)]
  param(
    [Parameter(Mandatory = $true)] [string] $Directory,
    [Parameter(Mandatory = $true)] [ValidateSet('Daily', 'Adhoc')] [string] $Mode,
    [int] $DailyKeepDays = 30,
    [int] $MonthlyKeepMonths = 12,
    [int] $AdhocKeepDays = 0,
    [datetime] $Now = (Get-Date),
    [switch] $DryRun
  )
  if (-not (Test-Path -LiteralPath $Directory)) { return @() }
  if ($Mode -eq 'Adhoc' -and $AdhocKeepDays -le 0) { return @() }

  $sets = @{}
  foreach ($f in Get-ChildItem -LiteralPath $Directory -File) {
    $base = Get-SetBaseName -FileName $f.Name
    if (-not $base) { continue }
    if (-not $sets.ContainsKey($base)) { $sets[$base] = @{ Files = @(); Dump = $null } }
    $sets[$base].Files += $f
    if ($f.Name -like '*.dump') { $sets[$base].Dump = $f }
  }

  $candidates = @()
  foreach ($base in $sets.Keys) {
    $s = $sets[$base]
    if (-not $s.Dump) { continue }   # sem .dump: não é um conjunto de backup; não mexe
    $candidates += [pscustomobject]@{ Base = $base; Date = (Get-SetReferenceDate -BaseName $base -DumpFile $s.Dump); Files = $s.Files }
  }

  $keep = @{}
  if ($Mode -eq 'Daily') {
    $dailyCutoff = $Now.Date.AddDays(-$DailyKeepDays)
    foreach ($c in $candidates) { if ($c.Date -ge $dailyCutoff) { $keep[$c.Base] = $true } }
    if ($MonthlyKeepMonths -gt 0) {
      $monthCutoff = (Get-Date -Year $Now.Year -Month $Now.Month -Day 1).Date.AddMonths(-($MonthlyKeepMonths - 1))
      $byMonth = $candidates | Where-Object { $_.Date -ge $monthCutoff } | Group-Object { $_.Date.ToString('yyyy-MM') }
      foreach ($g in $byMonth) {
        $oldest = $g.Group | Sort-Object Date | Select-Object -First 1
        $keep[$oldest.Base] = $true
      }
    }
  } else {
    $adhocCutoff = $Now.AddDays(-$AdhocKeepDays)
    foreach ($c in $candidates) { if ($c.Date -ge $adhocCutoff) { $keep[$c.Base] = $true } }
  }

  $removed = @()
  foreach ($c in ($candidates | Sort-Object Date)) {
    if ($keep.ContainsKey($c.Base)) { continue }
    if ($DryRun) {
      Write-Log -Message "[DryRun] retenção removeria: $($c.Base) ($($c.Date.ToString('yyyy-MM-dd HH:mm')))"
      $removed += $c.Base
      continue
    }
    if ($PSCmdlet.ShouldProcess($c.Base, 'Remover conjunto de backup')) {
      foreach ($f in $c.Files) { Remove-Item -LiteralPath $f.FullName -Force }
      Write-Log -Message "retenção: removido $($c.Base) ($($c.Date.ToString('yyyy-MM-dd HH:mm')))"
      $removed += $c.Base
    }
  }
  return $removed
}

# ---------------------------------------------------------------------------
# Checksum
# ---------------------------------------------------------------------------

# Retorna 'ok', 'falhou' ou 'sem-checksum'.
function Test-DumpChecksum {
  param([string] $DumpPath)
  $sumPath = "$DumpPath.sha256"
  if (-not (Test-Path -LiteralPath $sumPath)) { return 'sem-checksum' }
  $expected = ((Get-Content -LiteralPath $sumPath -TotalCount 1) -split '\s+')[0].Trim().ToLowerInvariant()
  $actual = (Get-FileHash -LiteralPath $DumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($expected -and $expected -eq $actual) { return 'ok' }
  return 'falhou'
}

# ---------------------------------------------------------------------------
# Principal
# ---------------------------------------------------------------------------

$cfg = $null
$exitCode = 0
try {
  $cfg = Read-PullConfig -Path $ConfigPath
  $logDir = Join-Path $cfg.DestRoot 'logs'
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  $script:LogFile = Join-Path $logDir ('pull-{0}.log' -f (Get-Date -Format 'yyyyMMdd'))
  Write-Log -Message "início (config: $ConfigPath$(if ($DryRun) { ', DryRun' }))"

  $sftp = Get-SftpPath
  $downloaded = 0

  foreach ($remoteDir in @($cfg.RemoteDirs)) {
    $leaf = Split-Path -Leaf ($remoteDir.TrimEnd('/', '\'))
    $localDir = Join-Path $cfg.DestRoot $leaf
    New-Item -ItemType Directory -Path $localDir -Force | Out-Null

    try {
      $remote = @(Get-RemoteFiles -Cfg $cfg -Sftp $sftp -RemoteDir $remoteDir)
    } catch {
      Add-PullError "listagem de '$remoteDir' falhou: $_"
      continue
    }
    Write-Log -Message "$remoteDir`: $($remote.Count) arquivo(s) remoto(s)."

    $toGet = @()
    foreach ($rf in $remote) {
      $localPath = Join-Path $localDir $rf.Name
      if (Test-Path -LiteralPath $localPath) {
        if ((Get-Item -LiteralPath $localPath).Length -eq $rf.Size) { continue }
        Write-Log -Level AVISO -Message "$($rf.Name): tamanho local difere do remoto; baixando de novo."
      }
      $toGet += $rf
    }

    if ($toGet.Count -gt 0) {
      if ($DryRun) {
        foreach ($rf in $toGet) { Write-Log -Message "[DryRun] baixaria $remoteDir/$($rf.Name) ($($rf.Size) bytes)" }
      } else {
        $cmds = @()
        foreach ($rf in $toGet) {
          $part = Join-Path $localDir ($rf.Name + '.part')
          Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
          $cmds += 'get -p {0} {1}' -f (ConvertTo-SftpPath ($remoteDir.TrimEnd('/') + '/' + $rf.Name)), (ConvertTo-SftpPath $part)
        }
        $r = Invoke-SftpBatch -Cfg $cfg -Sftp $sftp -Commands $cmds
        if ($r.ExitCode -ne 0) {
          Add-PullError "sftp get em '$remoteDir' terminou com código $($r.ExitCode): $(($r.Output | Select-Object -Last 3) -join ' | ')"
        }
        $newDumps = @()
        foreach ($rf in $toGet) {
          $part = Join-Path $localDir ($rf.Name + '.part')
          $final = Join-Path $localDir $rf.Name
          if ((Test-Path -LiteralPath $part) -and (Get-Item -LiteralPath $part).Length -eq $rf.Size) {
            if (Test-Path -LiteralPath $final) { Remove-Item -LiteralPath $final -Force }
            Move-Item -LiteralPath $part -Destination $final
            $downloaded++
            Write-Log -Message "baixado: $leaf\$($rf.Name) ($($rf.Size) bytes)"
            if ($rf.Name -like '*.dump') { $newDumps += $final }
            elseif ($rf.Name -like '*.dump.sha256') { $newDumps += $final.Substring(0, $final.Length - '.sha256'.Length) }
          } else {
            Remove-Item -LiteralPath $part -Force -ErrorAction SilentlyContinue
            Add-PullError "download incompleto: $remoteDir/$($rf.Name)"
          }
        }
        foreach ($dump in ($newDumps | Select-Object -Unique)) {
          if (-not (Test-Path -LiteralPath $dump)) { continue }
          $check = Test-DumpChecksum -DumpPath $dump
          if ($check -eq 'falhou') {
            Remove-Item -LiteralPath $dump -Force
            Add-PullError "SHA256 divergente: $dump (arquivo local apagado; será baixado de novo na próxima execução)"
          } elseif ($check -eq 'sem-checksum') {
            Write-Log -Level AVISO -Message "sem .sha256: $dump"
          } else {
            Write-Log -Message "sha256 ok: $(Split-Path -Leaf $dump)"
          }
        }
      }
    }

    $mode = if ($leaf -eq 'local') { 'Daily' } else { 'Adhoc' }
    try {
      $removed = @(Invoke-BackupRetention -Directory $localDir -Mode $mode -DailyKeepDays $cfg.DailyKeepDays `
          -MonthlyKeepMonths $cfg.MonthlyKeepMonths -AdhocKeepDays $cfg.AdhocKeepDays -DryRun:$DryRun)
      Write-Log -Message "retenção em $leaf ($mode): $($removed.Count) conjunto(s) $(if ($DryRun) { 'seriam removidos' } else { 'removido(s)' })."
    } catch {
      Add-PullError "retenção em '$localDir' falhou: $_"
    }
  }

  Write-Log -Message "fim: $downloaded arquivo(s) baixado(s), $($script:Errors.Count) erro(s)."
} catch {
  Add-PullError "falha geral: $_"
}

if ($script:Errors.Count -gt 0) {
  $exitCode = 1
  if ($cfg) {
    Send-Alert -Cfg $cfg -Subject 'FALHA na cópia dos backups (pull)' -Body ("Erros:`r`n- " + ($script:Errors -join "`r`n- ") + "`r`n`r`nLog: $script:LogFile")
  }
} elseif ($cfg -and $cfg.NotifyOnSuccess -and -not $DryRun) {
  Send-Alert -Cfg $cfg -Subject 'Cópia dos backups concluída' -Body "Pull concluído sem erros. Log: $script:LogFile"
}

exit $exitCode
