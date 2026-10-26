<#
.SYNOPSIS
  SGP+ — copia os backups da base de produção da VPS para uma pasta do OneDrive da Bravo.

.DESCRIPTION
  Roda na máquina de Compras (Windows), por tarefa agendada. Usa o OpenSSH nativo do Windows
  (ssh.exe) com a chave do usuário dedicado de cópia. Na VPS, a chave está presa ao forced
  command scripts/db/backup/sgp-backup-remote.sh, que aceita só: list, get <arquivo> e
  confirm <arquivo> <sha256>.

  Para cada backup listado na VPS que ainda não existe na pasta local:
    1. baixa para um arquivo temporário (.partial);
    2. confere o SHA-256 com o informado pela VPS;
    3. só então renomeia para o nome final e confirma a cópia na VPS (confirm).
  Arquivo com SHA-256 divergente é descartado e não é confirmado.

  Retenção local: -KeepDays. Padrão 0 = não apaga nada (retenção ainda não definida).

  Sem criptografia (decisão do Gustavo, 19/10/2026).

.EXAMPLE
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\SGP\sgp-backup-pull.ps1 `
    -VpsHost sgp.multivacia.com -VpsUser sgpbackup -KeyFile C:\SGP\chave\sgp_backup_ed25519 `
    -DestinationDir "C:\Users\compras\OneDrive - Bravo\Backups SGP"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$VpsHost,
  [Parameter(Mandatory = $true)][string]$VpsUser,
  [Parameter(Mandatory = $true)][string]$KeyFile,
  [Parameter(Mandatory = $true)][string]$DestinationDir,
  [int]$VpsPort = 22,
  [string]$KnownHostsFile = '',
  [string]$LogFile = '',
  [int]$KeepDays = 0,
  [string]$SshExe = "$env:WINDIR\System32\OpenSSH\ssh.exe"
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$NamePattern = '^sgp_\d{8}-\d{6}_(scheduled|manual|pre-deploy|pre-restore)\.(dump|globals\.sql)$'

if (-not $LogFile) { $LogFile = Join-Path $DestinationDir 'sgp-backup-pull.log' }

function Write-Log([string]$Message) {
  $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Output $line
}

function Get-SshArgs {
  $sshArgs = @(
    '-i', $KeyFile,
    '-p', "$VpsPort",
    '-o', 'BatchMode=yes',
    '-o', 'IdentitiesOnly=yes',
    '-o', 'StrictHostKeyChecking=yes'
  )
  if ($KnownHostsFile) { $sshArgs += @('-o', "UserKnownHostsFile=$KnownHostsFile") }
  $sshArgs += "$VpsUser@$VpsHost"
  return $sshArgs
}

function Invoke-Remote([string]$Command) {
  $out = & $SshExe @(Get-SshArgs) $Command
  if ($LASTEXITCODE -ne 0) { throw "ssh '$Command' terminou com código $LASTEXITCODE" }
  return $out
}

# Baixa via processo com saída redirecionada para arquivo (binário íntegro; o pipeline do
# PowerShell 5.1 converteria os bytes em texto).
function Save-RemoteFile([string]$Name, [string]$Target) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $SshExe
  $quoted = (Get-SshArgs) | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }
  $psi.Arguments = ($quoted -join ' ') + " get $Name"
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $proc = [System.Diagnostics.Process]::Start($psi)
  $stderrTask = $proc.StandardError.ReadToEndAsync()
  $fs = [System.IO.File]::Create($Target)
  try {
    $proc.StandardOutput.BaseStream.CopyTo($fs)
  } finally {
    $fs.Close()
  }
  $proc.WaitForExit()
  if ($proc.ExitCode -ne 0) {
    throw "ssh get $Name terminou com código $($proc.ExitCode): $($stderrTask.Result.Trim())"
  }
}

if (-not (Test-Path $SshExe)) { throw "OpenSSH não encontrado: $SshExe" }
if (-not (Test-Path $KeyFile)) { throw "Chave SSH não encontrada: $KeyFile" }
New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null

$errors = 0
try {
  Write-Log "Início. Destino: $DestinationDir"
  $listing = @(Invoke-Remote 'list')
  foreach ($line in $listing) {
    if (-not $line) { continue }
    $parts = $line -split ' '
    if ($parts.Count -ne 3) { Write-Log "Linha ignorada: $line"; continue }
    $sha = $parts[0].ToLower()
    $name = $parts[1]
    if ($name -notmatch $NamePattern -or $sha -notmatch '^[0-9a-f]{64}$') {
      Write-Log "Linha ignorada (formato inválido): $line"
      continue
    }
    $final = Join-Path $DestinationDir $name
    if (Test-Path $final) { continue }

    $partial = "$final.partial"
    try {
      Save-RemoteFile -Name $name -Target $partial
      $localSha = (Get-FileHash -Algorithm SHA256 -Path $partial).Hash.ToLower()
      if ($localSha -ne $sha) {
        Remove-Item -Force $partial
        throw "SHA-256 divergente para $name (VPS $sha, local $localSha)"
      }
      Move-Item -Force $partial $final
      Invoke-Remote "confirm $name $sha" | Out-Null
      Write-Log "Copiado e confirmado: $name ($((Get-Item $final).Length) bytes)"
    } catch {
      $errors++
      if (Test-Path $partial) { Remove-Item -Force $partial }
      Write-Log "ERRO: $($_.Exception.Message)"
    }
  }

  if ($KeepDays -gt 0) {
    $limit = (Get-Date).AddDays(-$KeepDays)
    Get-ChildItem -Path $DestinationDir -File |
      Where-Object { $_.Name -match $NamePattern -and $_.LastWriteTime -lt $limit } |
      ForEach-Object {
        Remove-Item -Force $_.FullName
        Write-Log "Removido pela retenção local ($KeepDays dias): $($_.Name)"
      }
  }
} catch {
  $errors++
  Write-Log "ERRO: $($_.Exception.Message)"
}

Write-Log "Fim. Erros: $errors"
if ($errors -gt 0) { exit 1 }
exit 0
