# SIGEC — Resultados esperados por cenário

Documento de referência único dos resultados esperados dos cenários
descritos em `docs/CENARIOS_TESTE.md` executados sobre a massa em
`data/input/`.

Formato: `Cenário → Programa → RC → Chave-mensagem → Efeito colateral`.

Data de processamento base: **2026-01-15** (quinta-feira, dia útil).

---

## C01 — Contrato PF válido

- Input: `contratos_recebidos.txt` DETAIL 1 (`CTR000000000001`, CPF `22233344401`).
- SGCB0170: RC **00** (`00-DOC-OK`).
- SGCB0180: RC **00** (`00-DT-OK`).
- SGCB0020 (só este DETAIL): RC **00** (`00-CTR-VAL-OK`).
- `SGLCTRVL` deve receber a linha; `SGLCTRRE` não.

## C02 — Contrato PJ válido

- DETAIL 2 (`CTR000000000002`, CNPJ `11222333000181`).
- RCs 00 na cadeia. Linha em `SGLCTRVL`.

## C03 — Contrato ES válido (LE)

- DETAIL 3 (`CTR000000000003`, LE `110042490114`).
- RCs 00. Linha em `SGLCTRVL`. Este é o insumo do cenário **C21**.

## C04 — CPF DV inválido

- DETAIL 4 (CPF `22233344400`).
- SGCB0170: RC **08** (`08-DOC-DV-ERR`).
- SGCB0020: propaga ≥ 04. Linha em `SGLCTRRE` com motivo `DOC-INVALIDO`.

## C05 — CNPJ DV inválido

- DETAIL 5 (CNPJ `11222333000180`).
- SGCB0170: RC **08** (`08-DOC-DV-ERR`).
- Linha em `SGLCTRRE`.

## C06 — Documento comprimento errado

- DETAIL 6 (CPF `1122334455` — 10 dígitos).
- SGCB0170: RC **08** (`08-DOC-LEN-INVAL`).
- Linha em `SGLCTRRE`.

## C07 — Tipo cliente fora do domínio

- DETAIL 7 (`tipo-cliente = 'XX'`).
- SGCB0020: RC **08** (`08-TIPO-INVALIDO`).
- **Não** chama SGCB0170.
- Linha em `SGLCTRRE` com motivo `TIPO-INVALIDO`.

## C08 — qtd-parcelas = 300 (aceito por código, rejeitado por doc)

- DETAIL 8 (`qtd-parcelas = 300`).
- SGCB0020: RC **00** — aceito (código valida `<= 360`).
- Linha em `SGLCTRVL`.
- **Observação (Ponto 16)**: `docs/REGRAS_NEGOCIO.md` §2 item 4
  documenta `<= 240`. Divergência intencional.

## C09 — qtd-parcelas = 400

- DETAIL 9 (`qtd-parcelas = 400`).
- SGCB0020: RC **08** (`08-VLR-INCONSIST`).
- Linha em `SGLCTRRE`.

## C10 — Data-início em feriado (2026-04-21)

- DETAIL 10 (`data-inicio = 20260421`, presente em `feriados.txt`).
- SGCB0180: RC **04** (`04-DT-FERIADO`).
- SGCB0020: propaga 04 (`04-CTR-REJEIT-PARCIAL`) — política padrão do
  laboratório trata feriado como aviso, não erro fatal. Ver documentação
  do programa se comportamento divergir.
- Linha em `SGLCTRVL` **com** flag de aviso; alternativa é `SGLCTRRE`
  dependendo de política — validar contra código real.

## C11 — Trailer diverge

- TRAILER do arquivo declara `qtd = 000000015` mas há 10 DETAIL.
- SGCB0020: RC **04** (`04-TRAILER-DIVERGE`).
- Todos os DETAIL são processados normalmente; apenas o RC do
  programa é elevado para 04.

## C12 — HEADER inválido/ausente

- Usar arquivo separado `contratos_recebidos_hdr_invalido.txt` (começa
  no DETAIL).
- SGCB0020: RC **08** (`08-HEADER-INVAL`).
- Nenhum DETAIL processado; arquivo abortado.

## C13 — Pagamento válido (PIX)

- `pagamentos_recebidos.txt` DETAIL 1 (contrato `100000000001`,
  parcela 001, valor R$ 1.000,00, canal PIX).
- SGCB0180: RC **00** (data `2026-01-14`, útil).
- SGCB0030: RC **00**. Linha em `SGLPAGVL`.

## C14 — Pagamento com data futura

- DETAIL 2 (`dt-pagto = 20261231`).
- SGCB0030: RC **08** (`08-DT-FUTURA`).
- Linha em `SGLPAGRE` com motivo `DT-FUTURA`.

## C15 — Pagamento canal inválido

- DETAIL 3 (`canal = 'ZZZ'`).
- SGCB0030: RC **08** (`08-CANAL-INVAL`).
- Linha em `SGLPAGRE`.

## C16 — Pagamento em excesso via PIX

- DETAIL 4 (contrato `100000000002`, parcela 001, valor R$ 1.500,00,
  canal PIX). Assume saldo da parcela = R$ 1.000,00.
- SGCB0030: RC **00** — pagamento aceito para aplicação.
- SGCB0070: RC **04** (`04-PAG-EXCESSO`). Aplica R$ 1.000,00 na parcela
  e joga R$ 500,00 como crédito na próxima parcela em aberto do mesmo
  contrato (regra `REGRAS_NEGOCIO.md` §3.8).

## C17 — Cliente inexistente na carga

- Carga do contrato C01 (CPF `22233344401`) contra `SG_CLIENTE` vazio.
- SGCB0050: RC **08** (`08 CLIENTE NAO ENCONTRADO`).
- SGCB0040 chama SGCB0060 (com `WS-FL-PERMITE-CRIA = 'S'`).
- SGCB0060: RC **00**. INSERT em `SG_CLIENTE` + INSERT em
  `SG_HIST_CLIENTE` (usa `NEXT VALUE FOR SIGEC.SEQ_SG_HIST_CLI`).
- SGCB0040: RC **00**.

## C18 — Cliente duplicado (SQLCODE -803)

- Rerun de C17. Comportamento esperado depende do ramo:
  - Se SGCB0050 já acha (SQLCODE 0): SGCB0060 nem é chamado, RC 00.
  - Se `WS-FL-PERMITE-CRIA` provocar INSERT e este duplicar:
    SGCB0060 retorna RC **04** (`04-DB2-DUPL-IGNOR`, SQLCODE -803).
- SGCB0040: RC **04** (`04-DB2-DUPL-IGNOR`) — idempotente por design.

## C19 — Aplicação de pagamento com FL-RECALC-SALDO=S

- `parametros.txt` linha `FL-RECALC-SALDO ... S`.
- Assume que esse parâmetro está espelhado em `SG_PARAMETRO` (via
  `db2/carga/01_PARAMETROS.sql`).
- Após baixa em `SG_PARCELA`, SGCB0070 chama SGCB0120.
- SGCB0120: recalcula saldo do contrato (2 UPDATEs distintos + INSERT
  em `SG_HIST_CONTRATO`). RC **00**.
- SGCB0070: RC **00**.
- **Contraprova**: alterar parâmetro para `N` — SGCB0120 não é chamado.

## C20 — Inadimplência LEVE (6..30 dias)

- Parcela vencida em `2026-01-02`, processamento em `2026-01-15`
  (13 dias em atraso).
- SGCB0180 (DIF): retorna 13 dias, RC **00**.
- SGCB0110: RC **00** (juros + multa calculados).
- SGCB0100: UPDATE em `SG_PARCELA` com dias-atraso e encargo; INSERT em
  `SG_HIST_FINANCEIRO`; linha em `SGLENCAR`. RC **00**.

## C21 — Inadimplência GRAVE em contrato ES (fator 0,873)

- Contrato C03 (tipo ES). Parcela vencida em `2025-11-01`, processamento
  em `2026-01-15` → 75 dias (faixa GRAVE).
- SGCB0110 par. `3300-CALC-ES`: aplica `WS-FATOR-ES = 0.873` sobre juros
  **e** multa.
- **Divergência intencional (Ponto 3, Ponto 16)**:
  `docs/REGRAS_NEGOCIO.md` §4.2 diz "juros × 0,90" e "multa × 0,80";
  código aplica 0,873 nos dois.
- RC SGCB0110: **00** (cálculo ok, apenas semanticamente divergente).

## C22 — Cliente reincidente com MOD 7 = 3

- Depende de dados que gerem `WS-MOD7 = 3` **e** `WS-E-REINCIDENTE`
  verdadeiro dentro de SGCB0140.
- SGCB0140 força `SG-RC-CLASSE-RISCO = 'D'` — regra sem documentação
  (Ponto 3 complementar).
- RC **00**; classe D emitida no linkage.

## C23 — Renegociação — contrato elegível MODERADA

- Contrato com 35 dias em atraso, saldo R$ 3.500,00, sem bloqueio.
- SGCB0130 fetches do cursor `C-CTR-INAD`.
- SGCB0080/SGCB0050/SGCB0140 chamados por contrato.
- SGCB0160 (chamado por outro step do driver) insere 1 linha em
  `SG_RENEGOCIACAO` e 3 linhas em `SG_OPCAO_RENEGOCIACAO`.
- Linhas em `SGLINADI`, `SGLPROP`, `SGLINTRG`. RC **00**.

## C24 — Renegociação bloqueada em `SGLBLOQ`

- `bloqueios.txt` linha 1 bloqueia contrato `100000000001`.
- SGCB0130: contrato **não** entra em `SGLINADI` como elegível.
- Se este era o único elegível: RC **04** (`04-REN-SEM-ELEG`).

## C25 — `SGLBLOQ` ausente (DD opcional)

- JCL sem DD `SGLBLOQ`. `OPEN INPUT` em SGCB0130 par.
  `1500-CARREGAR-BLOQUEIOS` produz FS 35/37/39/93.
- Código tolera: pula caching, segue processamento normal.
- SGCB0130 RC **00** (Ponto 13 exercitado — nenhum warning elevado).

## C26 — Relatórios com nome dinâmico

- SGCB0190 par. `7900-CALL-FMT` com `WS-FL-USA-BUILD = 'S'` (ativado por
  parâmetro de execução — hoje só via alteração manual no fonte ou via
  módulo de configuração alternativo).
- Nome construído `SGCB0200` via `STRING`. `CALL WS-PROG-BUILD` executa.
- RC **00**. Ponto 2 exercitado.

## C27 — SGCB0150 sem janela extra

- Execução via `SGCBVSAM.jcl` com `WS-FL-JANELA-EXTRA = 'N'` (default).
- Fluxo VSAM completo em `SGVCOBRA`.
- Par. `8500-INTEGRACAO-LEGADO-TAPE` **não** executado; `CALL 'SGXASM01'`
  **não** disparado.
- RC **00**. Pontos 1, 15, 18, 20 exercitados por **ausência** de efeito.

## C28 — Driver com bloqueio ativo

- `bloqueios.txt` linha 2 bloqueia janela em `2026-01-15`.
- SGCB0010 detecta na carga inicial e aborta.
- RC **08** (`08-BLOQUEIO-ATIVO`).
- Nenhum step S020..S190 executado. `SGLERROS` recebe linha.

---

## Sumário de RCs esperados por cenário

| Cenário | Programa principal | RC esperado | Chave |
|---|---|---|---|
| C01 | SGCB0020 | 00 | `00-CTR-VAL-OK` |
| C02 | SGCB0020 | 00 | `00-CTR-VAL-OK` |
| C03 | SGCB0020 | 00 | `00-CTR-VAL-OK` |
| C04 | SGCB0170 (via SGCB0020) | 08 | `08-DOC-DV-ERR` |
| C05 | SGCB0170 | 08 | `08-DOC-DV-ERR` |
| C06 | SGCB0170 | 08 | `08-DOC-LEN-INVAL` |
| C07 | SGCB0020 | 08 | `08-TIPO-INVALIDO` |
| C08 | SGCB0020 | 00 (divergente com doc) | `00-CTR-VAL-OK` |
| C09 | SGCB0020 | 08 | `08-VLR-INCONSIST` |
| C10 | SGCB0180 | 04 | `04-DT-FERIADO` |
| C11 | SGCB0020 | 04 | `04-TRAILER-DIVERGE` |
| C12 | SGCB0020 | 08 | `08-HEADER-INVAL` |
| C13 | SGCB0030 | 00 | `00-PAG-VAL-OK` |
| C14 | SGCB0030 | 08 | `08-DT-FUTURA` |
| C15 | SGCB0030 | 08 | `08-CANAL-INVAL` |
| C16 | SGCB0070 | 04 | `04-PAG-EXCESSO` |
| C17 | SGCB0040 | 00 | `00-CTR-CARGA-OK` |
| C18 | SGCB0040 | 04 | `04-DB2-DUPL-IGNOR` |
| C19 | SGCB0070 → SGCB0120 | 00 | `00-PAG-APLIC-OK` |
| C20 | SGCB0100 | 00 | `00-INA-DET-OK` |
| C21 | SGCB0110 | 00 (divergente com doc) | `00-FIN-CALC-OK` |
| C22 | SGCB0140 | 00 (regra não-doc D) | `00-RISCO-CLASS-OK` |
| C23 | SGCB0130 | 00 | `00-REN-GER-OK` |
| C24 | SGCB0130 | 04 | `04-REN-SEM-ELEG` |
| C25 | SGCB0130 | 00 (FS 35 tolerado) | `00-REN-GER-OK` |
| C26 | SGCB0190 | 00 | `00-REL-OK` |
| C27 | SGCB0150 | 00 | `00-EXEC-OK` |
| C28 | SGCB0010 | 08 | `08-BLOQUEIO-ATIVO` |

## Observações finais

- Divergências intencionais (C08, C21, C22) **não** devem ser
  “corrigidas” em código sem passar pelo fluxo `sgp-context-reader` →
  `sgp-impact-analyst` → `sgp-feature-spec-writer` → `sgp-implementer`.
- Cenários C17/C18 dependem do estado do banco. Rodar `db2/limpeza/`
  antes de reset é obrigatório para reproduzir C17 do zero.
- Cenários C27 e C28 exigem inspeção manual de logs — não há arquivo de
  output positivo esperado, apenas ausência de efeito.
