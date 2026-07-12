# SIGEC — Matriz Programa × Arquivo

Baseado nos `FILE-CONTROL / FD` reais dos 19 `.cbl` presentes e nos cabeçalhos
dos copybooks de layout (`copybooks/SGL*.cpy`).

Legenda:

- **Acesso**: `SEQ` (SEQUENTIAL) · `IDX-DYN` (VSAM KSDS DYNAMIC)
- **E/S**: `E` (INPUT) · `S` (OUTPUT) · `E/S` (I-O)
- **Org**: `FB` · `FBA` · `VSAM-KSDS`
- **Copybook**: nome do arquivo em `copybooks/`
- **Produtor / Consumidor**: papel no fluxo entre programas SIGEC

---

## 1. Arquivos sequenciais lidos/gravados

| Programa | Arquivo (DDNAME/DSN lógico) | Acesso | E/S | Copybook | Org / LRECL | Produtor (código) | Consumidor (código) |
|---|---|---|---|---|---|---|---|
| SGCB0020 | `SGLCTRIN` (DD `CTRIN`) | SEQ | E | `SGLCTRIN.cpy` | FB / 200 | Sistema originador externo (SGRCON) | SGCB0020 |
| SGCB0020 | `SGLCTRVL` (DD `CTRVL`) | SEQ | S | `SGLCTRVL.cpy` | FB / 220 | SGCB0020 | SGCB0040 (carga DB2) |
| SGCB0020 | `SGLCTRRE` (DD `CTRRE`) | SEQ | S | `SGLCTRRE.cpy` | FB / 260 | SGCB0020 | SGCB0190 (relatório de erros) |
| SGCB0020 | `SGLESTAT` (DD `ESTAT`) | SEQ | S (append) | `SGLESTAT.cpy` | FB / 150 | SGCB0020 (entre outros) | SGCB0190 |
| SGCB0030 | `SGLPAGIN` (DD `PAGIN`) | SEQ | E | `SGLPAGIN.cpy` | FB / 120 | Adquirente/PSP externo | SGCB0030 |
| SGCB0030 | `SGLPAGVL` (DD `PAGVL`) | SEQ | S | `SGLPAGVL.cpy` | FB / 150 | SGCB0030 | SGCB0070 |
| SGCB0030 | `SGLPAGRE` (DD `PAGRE`) | SEQ | S | `SGLPAGRE.cpy` | FB / 200 | SGCB0030 | SGCB0190 |
| SGCB0040 | `SGLCTRVL` (DD `CTRVL`) | SEQ | E | `SGLCTRVL.cpy` | FB / 220 | SGCB0020 | SGCB0040 |
| SGCB0040 | `SGLCTRCG` (DD `CTRCG`) | SEQ | S | `SGLCTRCG.cpy` | FB / 180 | SGCB0040 | SGCB0190 (rastreabilidade) |
| SGCB0040 | `SGLDB2RE` (DD `DB2RE`) | SEQ | S | `SGLDB2RE.cpy` | FB / 220 | SGCB0040 (entre outros) | SGCB0190 |
| SGCB0070 | `SGLPAGVL` (DD `SGLPAGVL`) | SEQ | E | `SGLPAGVL.cpy` | FB / 150 | SGCB0030 | SGCB0070 |
| SGCB0070 | `SGLPAGAP` (DD `SGLPAGAP`) | SEQ | S | `SGLPAGAP.cpy` | FB / 200 | SGCB0070 | SGCB0190 |
| SGCB0070 | `SGLPAGPD` (DD `SGLPAGPD`) | SEQ | S | `SGLPAGPD.cpy` | FB / 180 | SGCB0070 | SGCB0060 (reconciliação futura) |
| SGCB0100 | `SGLENCAR` (DD `SGLENCAR`) | SEQ | S | `SGLENCAR.cpy` | FB / 200 | SGCB0100 | SGCB0190 |
| SGCB0130 | `SGLINADI` (DD `SGLINADI`) | SEQ | S | `SGLINADI.cpy` | FB / 240 | SGCB0130 | SGCB0150, SGCB0190, SGCB0160 (indireto) |
| SGCB0130 | `SGLBLOQ`  (DD `SGLBLOQ`) | SEQ | E **opcional** | `SGLBLOQ.cpy` | FB / 200 | Operação manual | SGCB0130 (par. `1500-CARREGAR-BLOQUEIOS`); DD ausente ⇒ FS 35/37/39/93 tolerado |
| SGCB0150 | `SGLINADI` (DD `INADI`)   | SEQ | E | `SGLINADI.cpy` | FB / 240 | SGCB0130 | SGCB0150 |
| SGCB0150 | `SGVCOBRA` (DD `COBRA`)   | IDX-DYN | E/S | `SGLVSAM.cpy` | VSAM-KSDS / 250 | SGCB0150 (E/S mista: READ + WRITE + REWRITE + DELETE) | Consumido por rotinas do sistema externo de cobrança |
| SGCB0150 | `SGLAUDVS` (DD `AUDVS`)   | SEQ | S | `SGLAUDVS.cpy` | FB / 300 | SGCB0150 | Utilitário IDCAMS que faz LOAD para KSDS destino |
| SGCB0150 | `SGXTAPE` (DD **não declarado no JCL**) | — | — | — (SELECT comentado) | — | Rotina ASM externa `SGXASM01` (grava em fita via macro EXCP) — só na janela extra CRITICA. Ver ponto 17 de `PONTOS_FORA_COBERTURA.md`. | — |
| SGCB0160 | `SGLPROP`  (DD `SGLPROP`)  | SEQ | S | `SGLPROP.cpy` | FB / 260 | SGCB0160 | SGCB0190 |
| SGCB0160 | `SGLINTRG` (DD `SGLINTRG`) | SEQ | S | `SGLINTRG.cpy` | FB / 260 | SGCB0160 | Sistema externo SGRNG |
| SGCB0180 | `SGLFERIA` (DD `SGLFERIA`) | SEQ | E | `SGLFERIA.cpy` | FB / 80 | Cadastro operacional | SGCB0180 |
| SGCB0190 | `SGLENCAR`  | SEQ | E | `SGLENCAR.cpy` | FB / 200 | SGCB0100 | SGCB0190 |
| SGCB0190 | `SGLINADI`  | SEQ | E | `SGLINADI.cpy` | FB / 240 | SGCB0130 | SGCB0190 |
| SGCB0190 | `SGLPROP`   | SEQ | E | `SGLPROP.cpy`  | FB / 260 | SGCB0160 | SGCB0190 |
| SGCB0190 | `SGLERROS-IN` (DD `SGLERRIN`) | SEQ | E | `SGLERROS.cpy` | FB / 200 | Consolidado por todos os SGCB* | SGCB0190 |
| SGCB0190 | `SGLRELDT`  | SEQ | S | `SGLRELDT.cpy` | FBA / 133 | SGCB0190 | Impressão / spool |
| SGCB0190 | `SGLRELST`  | SEQ | S | `SGLRELST.cpy` | FBA / 133 | SGCB0190 | Impressão / spool |
| SGCB0190 | `SGLINTCB`  | SEQ | S | `SGLINTCB.cpy` | FB / 250 | SGCB0190 | Sistema externo SGXCOB |
| SGCB0190 | `SGLINTCT`  | SEQ | S | `SGLINTCT.cpy` | FB / 240 | SGCB0190 | Sistema externo CONTAB |
| SGCB0190 | `SGLERROS-OUT` (DD `SGLERROT`) | SEQ | S | `SGLERROS.cpy` (buffer PIC X(200)) | FB / 200 | SGCB0190 | Consumo humano / plantão |

---

## 2. Programas sem `FILE-CONTROL`

Estes programas só acessam DB2/memoria/linkage — não abrem arquivo próprio:

- `SGCB0050`, `SGCB0060`, `SGCB0080`, `SGCB0090`, `SGCB0110`, `SGCB0120`,
  `SGCB0140`, `SGCB0170`, `SGCB0200`.

---

## 3. Mapa consolidado por arquivo (visão dual)

| Arquivo | Quem produz | Quem consome | Observações |
|---|---|---|---|
| `SGLCTRIN` | Sistema externo SGRCON | `SGCB0020` | HEADER + N×DETAIL + TRAILER; três layouts num mesmo LRECL 200 (ponto 9) |
| `SGLCTRVL` | `SGCB0020` | `SGCB0040` | Contratos aprovados |
| `SGLCTRRE` | `SGCB0020` | `SGCB0190` | Contratos rejeitados |
| `SGLCTRCG` | `SGCB0040` | `SGCB0190` | Contratos carregados |
| `SGLDB2RE` | `SGCB0040` (e outros SQL) | `SGCB0190` | Rejeições de DB2 |
| `SGLPAGIN` | Adquirente | `SGCB0030` | HEADER + DETAIL + TRAILER |
| `SGLPAGVL` | `SGCB0030` | `SGCB0070` | Pagamentos aprovados |
| `SGLPAGRE` | `SGCB0030` | `SGCB0190` | Pagamentos rejeitados |
| `SGLPAGAP` | `SGCB0070` | `SGCB0190` | Pagamentos aplicados |
| `SGLPAGPD` | `SGCB0070` | `SGCB0060` (reconciliação) | Pagamentos pendentes |
| `SGLENCAR` | `SGCB0100` | `SGCB0190` | Encargos calculados |
| `SGLINADI` | `SGCB0130` | `SGCB0150`, `SGCB0190`, `SGCB0160` (indireto via DB2) | Inadimplentes do dia |
| `SGLPROP`  | `SGCB0160` | `SGCB0190` | Propostas de renegociação |
| `SGLINTCB` | `SGCB0190` | SGXCOB (externo) | Interface de cobrança |
| `SGLINTCT` | `SGCB0190` | CONTAB (externo) | Interface contábil |
| `SGLINTRG` | `SGCB0160` | SGRNG (externo) | Interface de renegociação |
| `SGLRELDT` | `SGCB0190` | Spool / impressão | Relatório detalhado |
| `SGLRELST` | `SGCB0190` | Spool / impressão | Relatório sintético |
| `SGLESTAT` | Todos os SGCB* (append) | `SGCB0190` | Estatísticas |
| `SGLERROS` | Todos os SGCB* (append) | `SGCB0190` | Erros consolidados |
| `SGLBLOQ`  | Operação manual | `SGCB0010` (PENDENTE) e `SGCB0130` | **DD opcional** — FS 35 tolerado |
| `SGLPARM`  | Operação manual | `SGCB0010` (PENDENTE) | Parâmetros complementares — nenhum `.cbl` presente atualmente abre este arquivo |
| `SGLFERIA` | Cadastro operacional | `SGCB0180` | Calendário anual |
| `SGVCOBRA` | `SGCB0150` (E/S) | Sistemas externos | VSAM KSDS |
| `SGLAUDVS` | `SGCB0150` | IDCAMS LOAD | Auditoria (sequencial no lab, VSAM em produção) |
| `SGXTAPE`  | *Referência documental em SGCB0150* | *(não existe em JCL)* | Fora de cobertura (ponto 17/19) |
