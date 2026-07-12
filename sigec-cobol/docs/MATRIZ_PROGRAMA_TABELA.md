# SIGEC — Matriz Programa × Tabela DB2

Baseado em `EXEC SQL` real dos 20 `.cbl`. Schema único: `SIGEC`.

Legenda:

- `S` — SELECT (padrão), `SJ` — SELECT com JOIN, `Sagg` — SELECT com agregação
- `I` — INSERT, `U` — UPDATE, `D` — DELETE
- `cursor` — nome do cursor DB2 declarado no programa
- `COMMIT` — se o programa emite `EXEC SQL COMMIT` (intermediário ou final)

---

## 1. Tabela consolidada

| Programa | Tabela SIGEC | SELECT | INSERT | UPDATE | DELETE | Cursor | COMMIT |
|---|---|---|---|---|---|---|---|
| SGCB0010 | *(nenhuma — driver apenas orquestra; não abre SQLCA)* | — | — | — | — | — | não |
| SGCB0020 | *(nenhuma — validação puramente de arquivo)* | — | — | — | — | — | não |
| SGCB0030 | *(nenhuma — validação puramente de arquivo)* | — | — | — | — | — | não |
| SGCB0040 | SG_CONTRATO | — | I | — | — | — | intermediário (`WS-CT-COMMIT`=1000) + final; ROLLBACK por contrato em erro |
| SGCB0040 | SG_PARCELA | — | I (loop de parcelas) | — | — | — | mesmo commit |
| SGCB0040 | SG_HIST_PROCESSAMENTO | — | I | — | — | — | commit próprio de auditoria |
| SGCB0040 | SG_CLIENTE | via `CALL SGCB0050`/`SGCB0060` | — | — | — | — | — |
| SGCB0050 | SG_CLIENTE | S (por ID) e S (por doc) — dispatch por `LK-FUNCAO='I'`/`'D'` | — | — | — | — | não (leitura) |
| SGCB0060 | SG_CLIENTE | — | I | U | — | — | não (chamador orquestra) |
| SGCB0060 | SG_HIST_CLIENTE | — | I (com `NEXT VALUE FOR SIGEC.SEQ_SG_HIST_CLI`) | — | — | — | não |
| SGCB0070 | SG_PARAMETRO | S (`FL-RECALC-SALDO`) | — | — | — | — | não (leitura) |
| SGCB0070 | SG_PARCELA | — | — | U (baixa saldo) | — | — | intermediário (500) + final |
| SGCB0070 | SG_PAGAMENTO | — | I | — | — | — | mesmo commit |
| SGCB0070 | SG_HIST_FINANCEIRO | — | I | — | — | — | mesmo commit |
| SGCB0070 | SG_CONTRATO | via `CALL SGCB0080` | — | — | — | — | — |
| SGCB0070 | SG_PARCELA (consulta) | via `CALL SGCB0090` | — | — | — | — | — |
| SGCB0080 | SG_CONTRATO | SJ (com `SG_CLIENTE` + `LEFT JOIN SG_RENEGOCIACAO`) | — | — | — | — | não |
| SGCB0080 | SG_CLIENTE | SJ | — | — | — | — | não |
| SGCB0080 | SG_RENEGOCIACAO | SJ (LEFT — indicador de reneg ativa) | — | — | — | — | não |
| SGCB0090 | SG_PARCELA | S | — | — | — | — | não |
| SGCB0100 | SG_PARCELA | via cursor (JOIN) + U (encargo/dias-atraso) | — | U | — | `C-PARC-VEN` (`WITH HOLD`) | intermediário (500) + final |
| SGCB0100 | SG_CONTRATO | via cursor (JOIN) | — | — | — | (mesmo cursor) | — |
| SGCB0100 | SG_CLIENTE | via cursor (JOIN) | — | — | — | (mesmo cursor) | — |
| SGCB0100 | SG_PARAMETRO | S (4 lookups: `TAXA-JUROS-GLOBAL`, `PC-MULTA-GLOBAL`, `LIMITE-JUROS-EFET`, `FATOR-ESPECIAL-LEGADO`) | — | — | — | — | — |
| SGCB0100 | SG_HIST_FINANCEIRO | — | I | — | — | — | mesmo commit |
| SGCB0110 | *(nenhuma — puro cálculo)* | — | — | — | — | — | não |
| SGCB0120 | SG_CONTRATO | S + U (duas UPDATEs distintas conforme cenário) | — | U (×2) | — | — | não emite COMMIT (delegado ao chamador — driver) |
| SGCB0120 | SG_PARCELA | Sagg (aggregate) | — | — | — | — | — |
| SGCB0120 | SG_HIST_CONTRATO | — | I | — | — | — | — |
| SGCB0130 | SG_CONTRATO | via cursor + U (classificação) | — | U | — | `C-CTR-INAD` (`WITH HOLD`) | intermediário (300) + final |
| SGCB0130 | SG_EVENTO_COBRANCA | — | I | — | — | — | mesmo commit |
| SGCB0130 | SG_CLIENTE | via `CALL SGCB0050` | — | — | — | — | — |
| SGCB0140 | *(nenhuma — puro cálculo/matriz interna)* | — | — | — | — | — | não |
| SGCB0150 | *(nenhuma — só VSAM e sequencial)* | — | — | — | — | — | não |
| SGCB0160 | SG_CONTRATO | via cursor (JOIN + subquery) + U (marca `IND_RENEGOCIACAO_ATIVA`) | — | U | — | `C-CTR-ELEG` (`WITH HOLD`, `FOR READ ONLY`) | intermediário (300) + final |
| SGCB0160 | SG_CLIENTE | via cursor (JOIN) | — | — | — | (mesmo cursor) | — |
| SGCB0160 | SG_RENEGOCIACAO | subquery `NOT EXISTS` + I (proposta) | I | — | — | — | mesmo commit |
| SGCB0160 | SG_OPCAO_RENEGOCIACAO | — | I (loop até 3 opções) | — | — | — | mesmo commit |
| SGCB0160 | SG_PARAMETRO | S (`PCT-ENTRADA-MINIMA`, `MAX-PARCELAS-RENEG`, `TAXA-JUROS-RENEG`, `PCT-DESC-MOD`, `PCT-DESC-GRAVE`, `PCT-DESC-CRIT`) | — | — | — | — | — |
| SGCB0170 | *(nenhuma — puro cálculo)* | — | — | — | — | — | não |
| SGCB0180 | *(nenhuma — só arquivo `SGLFERIA`)* | — | — | — | — | — | não |
| SGCB0190 | SG_CONTRATO | Sagg (2 agregações separadas) | — | — | — | — | não (relatório) |
| SGCB0190 | SG_PAGAMENTO | Sagg | — | — | — | — | não |
| SGCB0200 | *(nenhuma — pura formatação)* | — | — | — | — | — | não |

---

## 2. Cursores declarados

| Cursor | Programa | Tabelas envolvidas | `WITH HOLD` | Finalidade |
|---|---|---|---|---|
| `C-PARC-VEN` | SGCB0100 | `SG_PARCELA JOIN SG_CONTRATO JOIN SG_CLIENTE` | sim | Parcelas vencidas no dia D |
| `C-CTR-INAD` | SGCB0130 | `SG_CONTRATO` (WHERE `CLASSIFICACAO_INAD IN (...)`) | sim | Contratos inadimplentes p/ classificar faixa |
| `C-CTR-ELEG` | SGCB0160 | `SG_CONTRATO JOIN SG_CLIENTE` + `NOT EXISTS SG_RENEGOCIACAO` | sim | Contratos elegíveis a renegociação |

Todos usam `WITH HOLD` porque há `COMMIT` intermediário dentro do loop.

---

## 3. Consultas “simples” (single-row) frequentes

| Programa | Padrão | Observação |
|---|---|---|
| SGCB0050 | `SELECT … FROM SG_CLIENTE WHERE ID_CLIENTE = :` **ou** `WHERE TP_DOCUMENTO = : AND NR_DOCUMENTO = :` | Dispatch por `LK-FUNCAO` (**ponto 11** de `PONTOS_FORA_COBERTURA.md`) |
| SGCB0080 | `SELECT … FROM SG_CONTRATO JOIN SG_CLIENTE LEFT JOIN SG_RENEGOCIACAO WHERE ID_CONTRATO = :` | Devolve indicador de renegociação ativa via `CASE` |
| SGCB0090 | `SELECT … FROM SG_PARCELA WHERE ID_CONTRATO = : AND NR_PARCELA = :` | Retorna também status com mapa `AB/PP/PG/VC/CN` |
| SGCB0100 · SGCB0160 · SGCB0070 | `SELECT VR_PARAMETRO FROM SG_PARAMETRO WHERE CD_PARAMETRO = :` | Padrão `1550-LE-PARM`. **Regra de negócio dependente de linha DB2 em runtime — ponto 10** |
| SGCB0060 · SGCB0070 · SGCB0040 | `SELECT IDENTITY_VAL_LOCAL() FROM SYSIBM.SYSDUMMY1` | Recuperar chave gerada após INSERT |

---

## 4. Recorte por tabela (visão dual)

| Tabela | Programas que LEEM | Programas que ESCREVEM (I/U/D) |
|---|---|---|
| `SG_CLIENTE` | SGCB0050, SGCB0080, SGCB0100 (JOIN), SGCB0160 (JOIN) | SGCB0060 (I/U), SGCB0040 (via SGCB0060) |
| `SG_HIST_CLIENTE` | — | SGCB0060 (I) |
| `SG_CONTRATO` | SGCB0080, SGCB0100 (JOIN), SGCB0120 (S), SGCB0130 (cursor), SGCB0160 (cursor), SGCB0190 (Sagg) | SGCB0040 (I), SGCB0120 (U), SGCB0130 (U), SGCB0160 (U) |
| `SG_HIST_CONTRATO` | — | SGCB0120 (I) |
| `SG_PARCELA` | SGCB0090, SGCB0100 (cursor), SGCB0120 (Sagg) | SGCB0040 (I), SGCB0070 (U), SGCB0100 (U) |
| `SG_PAGAMENTO` | SGCB0190 (Sagg) | SGCB0070 (I) |
| `SG_HIST_FINANCEIRO` | — | SGCB0070 (I), SGCB0100 (I) |
| `SG_RENEGOCIACAO` | SGCB0080 (LEFT JOIN), SGCB0160 (`NOT EXISTS`) | SGCB0160 (I) |
| `SG_OPCAO_RENEGOCIACAO` | — | SGCB0160 (I) |
| `SG_PARAMETRO` | SGCB0070, SGCB0100, SGCB0160 | — (carga via script `db2/carga/`) |
| `SG_HIST_PROCESSAMENTO` | — | SGCB0040 (I) |
| `SG_EVENTO_COBRANCA` | — | SGCB0130 (I) |

---

## 5. Padrão de tratamento SQLCODE

Todos os programas com `EXEC SQL` seguem a mesma dupla:

```
EVALUATE TRUE
   WHEN SQLCODE = 0    …
   WHEN SQLCODE = +100 … (não encontrado — usualmente RC=08 ou seguir)
   WHEN OTHER          PERFORM 8000/8800-TRATAR-ERRO-DB2 (RC=12)
END-EVALUATE
```

`-803` (duplicata) é tratado como **RC=04** em INSERTs de `SG_CLIENTE`
(SGCB0060) e nas carga de `SG_CONTRATO`/`SG_PARCELA` (SGCB0040) — permite
reprocessamento idempotente.

O padrão `8800-TRATAR-SQLCODE` formata a mensagem
`12-DB2-SQLCODE=nnnnn SGCBxxxx` e eleva `WS-RC = SG-CT-RC-ERR-TEC` (12).
