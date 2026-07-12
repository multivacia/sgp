#!/usr/bin/env bash
# =============================================================================
# SIGEC — Validador estatico do laboratorio COBOL.
#
# Executar a partir da raiz do repositorio (sigec-cobol/):
#     bash tests/validate_static.sh
#
# Exit codes:
#   0 - Tudo ok.
#   1 - Contagem de .cbl diferente de 20.
#   2 - CALL para programa/modulo ausente e fora da lista de excecoes.
#   3 - COPY para copybook ausente e fora da lista de excecoes.
#   4 - Programa abre arquivo mas nao trata FILE STATUS.
#   5 - Programa executa EXEC SQL mas nao referencia SQLCODE.
# =============================================================================
set -u

# ------------------- ANSI helpers (desligam se nao for tty) ------------------
if [[ -t 1 ]]; then
    C_OK="\033[32m"; C_WARN="\033[33m"; C_ERR="\033[31m"
    C_INF="\033[36m"; C_RESET="\033[0m"
else
    C_OK=""; C_WARN=""; C_ERR=""; C_INF=""; C_RESET=""
fi

ok()   { echo -e "${C_OK}[OK]${C_RESET}   $*"; }
warn() { echo -e "${C_WARN}[WARN]${C_RESET} $*"; }
err()  { echo -e "${C_ERR}[FAIL]${C_RESET} $*"; }
info() { echo -e "${C_INF}[INFO]${C_RESET} $*"; }

# ------------------- Descoberta de raiz --------------------------------------
if [[ -d cobol && -d copybooks ]]; then
    ROOT="$(pwd)"
elif [[ -d ../cobol && -d ../copybooks ]]; then
    ROOT="$(cd .. && pwd)"
else
    err "Rode o script a partir da raiz do repositorio sigec-cobol/."
    exit 99
fi
cd "$ROOT"

echo "==============================================================="
echo " SIGEC - Validacao estatica"
echo " Raiz: $ROOT"
echo "==============================================================="

# ------------------- Listas de excecao intencionais --------------------------
# Ver docs/PONTOS_FORA_COBERTURA.md pontos 18, 19, 20.
CALL_EXCECOES=("SGEXTLOG" "SGCB0999" "SGXASM01")
COPY_EXCECOES=("SGXTAPE")

in_lista() {
    local alvo="$1"; shift
    local x
    for x in "$@"; do
        [[ "$x" == "$alvo" ]] && return 0
    done
    return 1
}

# =============================================================================
# CHECK 1 - Contagem de .cbl
# =============================================================================
echo ""
echo "-- CHECK 1: contagem de .cbl -----------------------------------"
COUNT_CBL=$(find cobol -maxdepth 1 -type f -name '*.cbl' | wc -l | tr -d ' ')
if [[ "$COUNT_CBL" != "20" ]]; then
    err "Encontrados $COUNT_CBL arquivos .cbl (esperado: 20)."
    find cobol -maxdepth 1 -type f -name '*.cbl' -printf '  %f\n' | sort
    exit 1
fi
ok "Check 1: 20 arquivos .cbl encontrados."

# =============================================================================
# CHECK 2 - CALLs estaticas resolvem
# =============================================================================
echo ""
echo "-- CHECK 2: CALLs estaticas -----------------------------------"
# Coleta PROGRAM-IDs existentes
mapfile -t PROG_IDS < <(
    grep -E "^\s*PROGRAM-ID\." cobol/*.cbl \
        | sed -E 's/.*PROGRAM-ID\.\s+([A-Z0-9]+).*/\1/' \
        | sort -u
)

CALL_FAIL=0
CALL_INTENC=0
CALL_TOTAL=0

# Coleta CALL 'XXXX' (estaticas) e CALL "XXXX" - excluindo linhas de
# comentario COBOL (asterisco na coluna 7).
while IFS=: read -r file lineno raw; do
    # Ignora comentario COBOL (asterisco na coluna 7)
    [[ "${raw:6:1}" == "*" ]] && continue

    # Extrai o alvo entre aspas simples ou duplas
    alvo=$(echo "$raw" \
        | sed -nE "s/.*CALL[[:space:]]+['\"]([A-Z0-9]+)['\"].*/\1/p" \
        | head -n1)
    [[ -z "$alvo" ]] && continue

    CALL_TOTAL=$((CALL_TOTAL + 1))
    caller=$(basename "$file" .cbl)

    if printf '%s\n' "${PROG_IDS[@]}" | grep -qx "$alvo"; then
        continue
    fi

    if in_lista "$alvo" "${CALL_EXCECOES[@]}"; then
        info "CALL intencional fora de cobertura: '$alvo' em $caller:$lineno (ver PONTOS_FORA_COBERTURA)."
        CALL_INTENC=$((CALL_INTENC + 1))
        continue
    fi

    err "CALL para programa inexistente: '$alvo' em $caller:$lineno."
    CALL_FAIL=$((CALL_FAIL + 1))
done < <(grep -nE "CALL[[:space:]]+['\"]" cobol/*.cbl 2>/dev/null || true)

if (( CALL_FAIL > 0 )); then
    err "Check 2: $CALL_FAIL CALL(s) sem alvo (verificar acima)."
    exit 2
fi
ok "Check 2: $CALL_TOTAL CALL(s) estaticas verificadas; $CALL_INTENC fora de cobertura esperada."

# =============================================================================
# CHECK 3 - COPYs resolvem
# =============================================================================
echo ""
echo "-- CHECK 3: COPYs -----------------------------------"

COPY_FAIL=0
COPY_INTENC=0
COPY_TOTAL=0

while IFS=: read -r file lineno raw; do
    [[ "${raw:6:1}" == "*" ]] && continue

    alvo=$(echo "$raw" \
        | sed -nE 's/.*COPY[[:space:]]+([A-Z0-9]+).*/\1/p' \
        | head -n1)
    [[ -z "$alvo" ]] && continue

    COPY_TOTAL=$((COPY_TOTAL + 1))
    caller=$(basename "$file")

    if [[ -f "copybooks/${alvo}.cpy" || -f "dclgen/${alvo}.cpy" ]]; then
        continue
    fi

    if in_lista "$alvo" "${COPY_EXCECOES[@]}"; then
        info "COPY intencional fora de cobertura: '$alvo' em $caller:$lineno (ver PONTOS_FORA_COBERTURA)."
        COPY_INTENC=$((COPY_INTENC + 1))
        continue
    fi

    err "COPY para copybook inexistente: '$alvo' em $caller:$lineno."
    COPY_FAIL=$((COPY_FAIL + 1))
done < <(grep -nE "^[[:space:]]{0,6}[^*].*COPY[[:space:]]+[A-Z0-9]+" cobol/*.cbl copybooks/*.cpy 2>/dev/null || true)

if (( COPY_FAIL > 0 )); then
    err "Check 3: $COPY_FAIL COPY(s) sem alvo."
    exit 3
fi
ok "Check 3: $COPY_TOTAL COPY(s) verificado(s); $COPY_INTENC intencionais."

# =============================================================================
# CHECK 4 - Programas com FILE-CONTROL sem FILE STATUS
# =============================================================================
echo ""
echo "-- CHECK 4: FILE STATUS -----------------------------------"

FS_FAIL=0
FS_PROGS_FS=0
FS_PROGS_NOFS=0

for f in cobol/*.cbl; do
    prog=$(basename "$f" .cbl)
    if ! grep -qE "^[[:space:]]{0,6}[^*].*FILE-CONTROL\." "$f"; then
        continue
    fi
    if grep -qE "FILE[[:space:]]+STATUS[[:space:]]+IS" "$f"; then
        FS_PROGS_FS=$((FS_PROGS_FS + 1))
    else
        err "Programa $prog abre FILE-CONTROL sem clausula FILE STATUS."
        FS_PROGS_NOFS=$((FS_PROGS_NOFS + 1))
        FS_FAIL=$((FS_FAIL + 1))
    fi
done

if (( FS_FAIL > 0 )); then
    err "Check 4: $FS_FAIL programa(s) sem FILE STATUS (ver acima)."
    exit 4
fi
ok "Check 4: $FS_PROGS_FS programa(s) com FILE-CONTROL tratam FILE STATUS."

# =============================================================================
# CHECK 5 - Programas com EXEC SQL sem tratar SQLCODE
# =============================================================================
echo ""
echo "-- CHECK 5: SQLCODE -----------------------------------"

SQL_FAIL=0
SQL_PROGS_OK=0

for f in cobol/*.cbl; do
    prog=$(basename "$f" .cbl)
    # Considera EXEC SQL "real" (SELECT/INSERT/UPDATE/DELETE/OPEN/FETCH/COMMIT etc.)
    # Ignora se o unico EXEC SQL for INCLUDE / DECLARE / WHENEVER.
    total_sql=$(grep -cE "EXEC[[:space:]]+SQL" "$f" || true)
    (( total_sql == 0 )) && continue

    apenas_include=$(grep -E "EXEC[[:space:]]+SQL" "$f" \
        | grep -cvE "(INCLUDE|DECLARE|WHENEVER|END-EXEC)" || true)
    if (( apenas_include == 0 )); then
        continue
    fi

    if grep -qE "SQLCODE" "$f"; then
        SQL_PROGS_OK=$((SQL_PROGS_OK + 1))
    else
        err "Programa $prog usa EXEC SQL sem referenciar SQLCODE."
        SQL_FAIL=$((SQL_FAIL + 1))
    fi
done

if (( SQL_FAIL > 0 )); then
    err "Check 5: $SQL_FAIL programa(s) sem tratamento de SQLCODE."
    exit 5
fi
ok "Check 5: $SQL_PROGS_OK programa(s) com EXEC SQL tratam SQLCODE."

# =============================================================================
# Resumo
# =============================================================================
echo ""
echo "==============================================================="
ok "Validacao estatica concluida sem falhas bloqueantes."
echo "==============================================================="
exit 0
