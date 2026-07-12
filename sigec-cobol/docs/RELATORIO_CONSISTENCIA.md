# Relatório de Consistência — Laboratório SIGEC

**Data:** 2026-07-12  
**Branch:** `cursor/sigec-cobol-laboratorio-3cb2`  
**Tipo de validação:** estática (sem z/OS / sem DB2 real)

---

## 1. Contagem de programas

| Item | Esperado | Encontrado | Status |
|------|----------|------------|--------|
| Programas COBOL `SGCB0010`–`SGCB0200` | 20 | 20 | OK |

Comando:

```bash
ls sigec-cobol/cobol/*.cbl | wc -l
# => 20
```

---

## 2. Chamadas entre programas

Validação via `tests/validate_static.sh` (exit 0):

- CALLs estáticas resolvidas para programas existentes.
- Exceções intencionais: `SGXASM01`, `SGEXTLOG`, `SGCB0999` (pontos 18/20).
- CALLs dinâmicas: `SGCB0010` → `SGCB0190`; `SGCB0190` → `SGCB0200` (nome montado via `STRING`).

---

## 3. COPYBOOKS

- COPYs resolvidos contra `copybooks/` e `dclgen/`.
- Exceção intencional: `COPY SGXTAPE` em `SGCB0150` (copybook **não** versionado — ponto 19).

---

## 4. Arquivos e tabelas

Documentados em:

- `docs/MATRIZ_PROGRAMA_ARQUIVO.md`
- `docs/MATRIZ_PROGRAMA_TABELA.md`
- `docs/MAPA_DEPENDENCIAS.md`

HDR/DET/TRL presentes em: contratos, pagamentos, interfaces de cobrança/contábil/renegociação (e correlatos).

VSAM KSDS: `SGVCOBRA` (`SGLVSAM.cpy` + `SGCB0150` + `SGCBVSAM.jcl`).

---

## 5. FILE STATUS / SQLCODE

- 11 programas com `FILE-CONTROL` tratam `FILE STATUS`.
- 11 programas com `EXEC SQL` tratam `SQLCODE`.

---

## 6. JCLs

12 JCLs em `jcl/`, incluindo:

- `SGCBDIA.jcl` — janela diária completa
- `SGCBORFN.jcl` — órfão deliberado (ponto 12)
- `SGCBVSAM.jcl` — DEFINE CLUSTER + manutenção VSAM

---

## 7. Pontos fora de cobertura

20/20 marcados como **PRESENTE** em `docs/PONTOS_FORA_COBERTURA.md`.

---

## 8. Limitações do ambiente

| Capacidade | Status |
|------------|--------|
| Validação estática de estrutura | Executada (`validate_static.sh` exit 0) |
| Compilação Enterprise COBOL / DB2 precompiler | **Não disponível** neste ambiente cloud |
| Execução z/OS / JES / IKJEFT01 | **Não disponível** |
| DB2 real (DDL/carga/cursor) | Scripts fornecidos; **não executados** |
| GnuCOBOL | Pode validar sintaxe COBOL puro; `EXEC SQL` exige pré-processamento |

**Não afirmar compilação em z/OS.** A entrega é laboratório para agentes de análise.

---

## 9. Arquivos que não puderam ser validados em runtime

- Todos os `.cbl` com `EXEC SQL` (sem DB2 precompiler).
- JCLs (sem JES).
- VSAM `SGVCOBRA` (sem IDCAMS real).
- Massas `data/input` vs `data/expected` (validação funcional requer mainframe/emulador).

---

## 10. Comandos de validação estática utilizados

```bash
bash sigec-cobol/tests/validate_static.sh
# exit=0

ls sigec-cobol/cobol/*.cbl | wc -l
find sigec-cobol -type f | wc -l
rg -n "CALL |COPY |EXEC SQL|FILE STATUS|ALTER |GO TO .*DEPENDING|OCCURS .*DEPENDING|RECORDING MODE IS V" sigec-cobol/cobol
rg -n "EXEC PGM=" sigec-cobol/jcl
```

---

## 11. Sugestões de testes para múltiplos agentes

1. **Impacto:** alterar `FATOR_ESPECIAL_LEGADO` em `SG_PARAMETRO` e mapear programas afetados.
2. **Dependências:** a partir de `SGCB0010`, gerar grafo completo (estático + dinâmico + JCL).
3. **Código morto:** localizar `9998-MODO-SIMULACAO-ANTIGO` e `ALTER` sem dica no cabeçalho do README.
4. **Arquivos:** rastrear produtor/consumidor de `SGLINADI` até VSAM.
5. **DB2:** listar tabelas tocadas por `SGCB0070` com COMMIT.
6. **JCL:** explicar por que `SGCB0150` não roda no job diário.
7. **Lacunas de skill:** descobrir `COPY SGXTAPE` e `CALL 'SGXASM01'` sem documentação óbvia no fonte.
8. **Modernização:** propor remoção de `ALTER`/`GO TO DEPENDING ON` sem quebrar RC.
9. **Regras:** reconciliar comentário de multa 2% vs parâmetro DB2.
10. **Testes:** derivar casos a partir de `docs/CENARIOS_TESTE.md` C01–C28.
