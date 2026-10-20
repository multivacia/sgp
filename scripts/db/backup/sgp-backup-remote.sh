#!/usr/bin/env bash
# SGP+ — forced command do usuário SSH de cópia dos backups (máquina de Compras).
#
# Configurado em ~/.ssh/authorized_keys do usuário dedicado, por exemplo:
#   command="/usr/local/sbin/sgp-backup-remote",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... compras-bravo
#
# Comandos aceitos (recebidos em SSH_ORIGINAL_COMMAND):
#   list                      lista "<sha256> <arquivo> <tamanho>" dos backups disponíveis
#   get <arquivo>             envia o arquivo pela saída padrão (o nome precisa estar na lista)
#   confirm <arquivo> <sha>   registra no log que a cópia foi feita e conferida (o SHA-256 precisa conferir)
# Qualquer outro comando é recusado com código 2.
#
# Variáveis de ambiente (opcionais; no forced command use os padrões ou um wrapper):
#   SGP_BACKUP_DIR  diretório dos backups  (padrão: /opt/sgp/backups/db)
#   SGP_BACKUP_LOG  log JSONL das execuções (padrão: $SGP_BACKUP_DIR/backup-log.jsonl)

set -euo pipefail

BACKUP_DIR="${SGP_BACKUP_DIR:-/opt/sgp/backups/db}"
LOG_FILE="${SGP_BACKUP_LOG:-$BACKUP_DIR/backup-log.jsonl}"
NAME_RE='^sgp_[0-9]{8}-[0-9]{6}_(scheduled|manual|pre-deploy|pre-restore)\.(dump|globals\.sql)$'
SHA_RE='^[0-9a-f]{64}$'

refuse() {
  echo "Recusado: $1" >&2
  exit 2
}

# Lista os arquivos válidos: nome no padrão, arquivo regular (sem link) e com .sha256 ao lado.
available_files() {
  local path name
  for path in "$BACKUP_DIR"/sgp_*; do
    [[ -e $path ]] || continue
    name=${path##*/}
    [[ $name =~ $NAME_RE ]] || continue
    [[ -f $path && ! -L $path && -f $path.sha256 && ! -L $path.sha256 ]] || continue
    printf '%s\n' "$name"
  done
}

is_listed() {
  local wanted=$1 name found=1
  [[ $wanted =~ $NAME_RE ]] || return 1
  # Lê a lista inteira (sair no meio quebraria o pipe do produtor).
  while IFS= read -r name; do
    [[ $name == "$wanted" ]] && found=0
  done < <(available_files)
  return $found
}

recorded_sha() {
  cut -d' ' -f1 <"$BACKUP_DIR/$1.sha256"
}

cmd_list() {
  local name
  while IFS= read -r name; do
    printf '%s %s %s\n' "$(recorded_sha "$name")" "$name" "$(stat -c %s "$BACKUP_DIR/$name")"
  done < <(available_files)
}

cmd_get() {
  is_listed "$1" || refuse "arquivo fora da lista"
  cat -- "$BACKUP_DIR/$1"
}

cmd_confirm() {
  local name=$1 sha=$2 now
  is_listed "$name" || refuse "arquivo fora da lista"
  [[ $sha =~ $SHA_RE ]] || refuse "SHA-256 inválido"
  if [[ $sha != "$(recorded_sha "$name")" ]]; then
    echo "SHA-256 não confere com o registrado na VPS." >&2
    exit 1
  fi
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf '{"event":"copy-confirm","status":"success","file":"%s","sha256":"%s","confirmedAt":"%s","finishedAt":"%s"}\n' \
    "$name" "$sha" "$now" "$now" >>"$LOG_FILE"
  echo "OK"
}

main() {
  local raw=${SSH_ORIGINAL_COMMAND-}
  # Uso local (testes): os argumentos substituem SSH_ORIGINAL_COMMAND.
  if (($# > 0)); then
    raw="$*"
  fi
  [[ $raw =~ ^[A-Za-z0-9._\ -]*$ ]] || refuse "caracteres não permitidos"

  local -a args=()
  read -r -a args <<<"$raw"
  local n=${#args[@]}
  ((n > 0)) || refuse "comando vazio"

  case ${args[0]} in
    list)
      ((n == 1)) || refuse "uso: list"
      cmd_list
      ;;
    get)
      ((n == 2)) || refuse "uso: get <arquivo>"
      cmd_get "${args[1]}"
      ;;
    confirm)
      ((n == 3)) || refuse "uso: confirm <arquivo> <sha256>"
      cmd_confirm "${args[1]}" "${args[2]}"
      ;;
    *)
      refuse "comando desconhecido"
      ;;
  esac
}

main "$@"
