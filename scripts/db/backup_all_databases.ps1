#Requires -Version 5.1
<#
.SYNOPSIS
  Backup lógico completo do cluster PostgreSQL via pg_dumpall (globals + todas as databases).

.DESCRIPTION
  Gera um único ficheiro plain SQL com timestamp. Não sobrescreve ficheiros existentes.
  Credenciais: variáveis de ambiente PostgreSQL (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGSSLMODE, …)
  e/ou ficheiro .pgpass (pgpass.conf no Windows). Ver docs/backup-bases.md.

  Não apaga backups antigos. Não executa restore.

.PARAMETER OutputDir
  Diretório de saída. Predefinição: variável BACKUP_OUTPUT_DIR ou diretório atual.

.PARAMETER FilePrefix
  Prefixo opcional do nome do ficheiro (ex.: "sgp-"). Predefinição: BACKUP_FILE_PREFIX ou vazio.

.PARAMETER HostLabel
  Segmento do nome do ficheiro (host/ambiente/cluster). Predefinição: BACKUP_HOST_LABEL, senão BACKUP_ENV_LABEL, senão PGHOST sanitizado, senão "cluster".

.PARAMETER EnvLabel
  Etiqueta de ambiente (ex.: dev, hml, prd) usada só se HostLabel não for definido por parâmetro nem por BACKUP_HOST_LABEL.

.EXAMPLE
  $env:PGHOST = "localhost"; $env:PGPORT = "5432"; $env:PGUSER = "postgres"
  .\backup_all_databases.ps1 -OutputDir "D:\backups\postgres"

.EXAMPLE
  $env:BACKUP_OUTPUT_DIR = "D:\backups"; $env:BACKUP_ENV_LABEL = "hml"
  .\backup_all_databases.ps1
#>

[CmdletBinding()]
param(
  [string] $OutputDir = $env:BACKUP_OUTPUT_DIR,
  [string] $FilePrefix = $env:BACKUP_FILE_PREFIX,
  [string] $HostLabel = $env:BACKUP_HOST_LABEL,
  [string] $EnvLabel = $env:BACKUP_ENV_LABEL
)

$ErrorActionPreference = "Stop"

function Get-SafeFileLabel {
  param([string] $Raw)
  if ([string]::IsNullOrWhiteSpace($Raw)) {
    return "cluster"
  }
  $s = $Raw -replace '[^a-zA-Z0-9._-]', '_'
  if ($s.Length -gt 64) {
    $s = $s.Substring(0, 64)
  }
  return $s
}

function Resolve-OutputDirectory {
  param([string] $Dir)
  if ([string]::IsNullOrWhiteSpace($Dir)) {
    return (Get-Location).Path
  }
  return $Dir
}

# --- Pré-requisito: pg_dumpall no PATH ---
$pgDumpAll = Get-Command pg_dumpall -ErrorAction SilentlyContinue
if (-not $pgDumpAll) {
  Write-Error @"
[backup_all_databases] pg_dumpall não encontrado no PATH.
Instale o cliente PostgreSQL (pacote completo ou apenas "command line tools") e garanta que a pasta bin
(ex.: C:\Program Files\PostgreSQL\<versão>\bin) está no PATH desta sessão.
"@
  exit 1
}

$outDir = Resolve-OutputDirectory -Dir $OutputDir
if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$label = $HostLabel
if ([string]::IsNullOrWhiteSpace($label)) {
  $label = $EnvLabel
}
if ([string]::IsNullOrWhiteSpace($label)) {
  $label = $env:PGHOST
}
$label = Get-SafeFileLabel -Raw $label

$prefix = $FilePrefix
if ($null -eq $prefix) { $prefix = "" }

# Timestamp + evitar colisão (não sobrescrever)
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$baseName = "${prefix}backup_all_databases_${label}_${ts}.sql"
$outFile = Join-Path $outDir $baseName
$n = 0
while (Test-Path -LiteralPath $outFile) {
  $n++
  $baseName = "${prefix}backup_all_databases_${label}_${ts}_${n}.sql"
  $outFile = Join-Path $outDir $baseName
}

Write-Host "[backup_all_databases] pg_dumpall: $($pgDumpAll.Source)"
Write-Host "[backup_all_databases] PGHOST=$($env:PGHOST) PGPORT=$($env:PGPORT) PGUSER=$($env:PGUSER)"
Write-Host "[backup_all_databases] Saída: $outFile"

# pg_dumpall escreve UTF-8 no plain; -f evita problemas de encoding no pipeline do PowerShell
& pg_dumpall -f "$outFile"
if ($LASTEXITCODE -ne 0) {
  Write-Error "[backup_all_databases] pg_dumpall terminou com código $LASTEXITCODE."
  exit $LASTEXITCODE
}

$item = Get-Item -LiteralPath $outFile
if ($item.Length -eq 0) {
  Write-Error "[backup_all_databases] Ficheiro gerado tem tamanho 0 bytes."
  exit 1
}

Write-Host "[backup_all_databases] OK — ficheiro: $($item.FullName) ($($item.Length) bytes)"
