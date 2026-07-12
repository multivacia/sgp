# SIGEC — Cenários de Teste

Este documento consolida os cenários de teste do laboratório SIGEC.
Cada cenário tem **ID único**, descrição, entrada, resultado esperado,
programa(s) exercitado(s) e artefatos em `data/input/` ou `data/expected/`.

O objetivo é oferecer massa suficiente para exercitar todos os RCs
documentados em `docs/CODIGOS_RETORNO.md` e cobrir os 20 pontos-desafio
documentados em `docs/PONTOS_FORA_COBERTURA.md`.

## Convenções

- **Data de processamento base**: `2026-01-15` (quinta-feira).
- **Feriados usados**: `2026-01-01 NAC BR` (Ano Novo), `2026-04-03 NAC BR`
  (Sexta-feira Santa fictícia), `2026-04-21 NAC BR` (Tiradentes),
  `2026-12-25 NAC BR` (Natal).
- Arquivos de input em `data/input/` seguem exatamente os LRECLs dos
  copybooks `SGL*.cpy`. Cada linha é um registro completo, preenchido com
  brancos até LRECL.
- Arquivos de expected em `data/expected/` documentam o comportamento
  esperado por cenário — quando aplicável, o arquivo real esperado tem
  extensão `.txt`; quando o resultado é logico (RC, mensagem), usa-se
  `expected_results.md` como referência única.

## Índice de cenários

| ID | Título | Programa(s) | Foco |
|---|---|---|---|
| C01 | Contrato PF válido | SGCB0020 → SGCB0170 → SGCB0180 | Fluxo feliz — validação |
| C02 | Contrato PJ válido | SGCB0020 → SGCB0170 → SGCB0180 | Fluxo feliz PJ |
| C03 | Contrato ES válido (LE) | SGCB0020 → SGCB0170 | Fluxo feliz ES |
| C04 | CPF com DV inválido | SGCB0020 → SGCB0170 | RC 08-DOC-DV-ERR |
| C05 | CNPJ com DV inválido | SGCB0020 → SGCB0170 | RC 08-DOC-DV-ERR |
| C06 | Documento comprimento errado | SGCB0020 → SGCB0170 | RC 08-DOC-LEN-INVAL |
| C07 | Tipo de cliente fora do domínio | SGCB0020 | RC 08-TIPO-INVALIDO |
| C08 | qtd-parcelas > 240 (aceito por código, rejeitado por doc) | SGCB0020 | Ponto 16 — divergência doc × código |
| C09 | qtd-parcelas > 360 | SGCB0020 | RC 08-VLR-INCONSIST |
| C10 | Data-início em feriado | SGCB0020 → SGCB0180 | RC 04-DT-FERIADO |
| C11 | Trailer diverge da contagem real | SGCB0020 | RC 04-TRAILER-DIVERGE |
| C12 | HEADER inválido/ausente | SGCB0020 | RC 08-HEADER-INVAL |
| C13 | Pagamento válido (canal PIX) | SGCB0030 → SGCB0180 | Fluxo feliz — pagamento |
| C14 | Pagamento com data futura | SGCB0030 | RC 08-DT-FUTURA |
| C15 | Pagamento canal inválido | SGCB0030 | RC 08-CANAL-INVAL |
| C16 | Pagamento em excesso via PIX | SGCB0030 → SGCB0070 | RC 04-PAG-EXCESSO |
| C17 | Cliente inexistente na carga | SGCB0040 → SGCB0050 → SGCB0060 | Cria cliente novo |
| C18 | Cliente duplicado (SQLCODE -803) | SGCB0040 → SGCB0060 | RC 04-DB2-DUPL-IGNOR (idempotente) |
| C19 | Aplicação de pagamento com FL-RECALC-SALDO=S | SGCB0070 → SGCB0120 | Recálculo condicional |
| C20 | Detecção de inadimplência LEVE | SGCB0100 → SGCB0110 → SGCB0180 | Faixa 6..30 dias |
| C21 | Detecção de inadimplência GRAVE (ES aplica 0,873) | SGCB0100 → SGCB0110 | Ponto 3 — regra histórica |
| C22 | Cliente reincidente com MOD 7 = 3 | SGCB0140 | Ponto 3-complemento — força classe D |
| C23 | Renegociação — contrato elegível MODERADA | SGCB0130 → SGCB0050 → SGCB0080 → SGCB0140 | Fluxo renegociação |
| C24 | Renegociação bloqueada por `SGLBLOQ` | SGCB0130 | RC 08-REN-DUP-ATIVA / desconsidera contrato |
| C25 | Renegociação com `SGLBLOQ` ausente (DD opcional) | SGCB0130 | Ponto 13 — FS 35 tolerado |
| C26 | Relatórios com dinâmica de nome construído | SGCB0190 → SGCB0200 | Ponto 2 — CALL dinâmica |
| C27 | VSAM SGVCOBRA — janela extra desativada | SGCB0150 | Ponto 1/15 — CALL ASM não disparado |
| C28 | Driver com bloqueio ativo em `SGLBLOQ` | SGCB0010 | RC 08-BLOQUEIO-ATIVO |

---

## C01 — Contrato PF válido

- **Descrição**: 1 contrato PF com CPF válido (`22233344401`), tipo `CR`,
  valor `12.000,00`, 12 parcelas, data-início `2026-02-02` (segunda útil).
- **Input**: `data/input/contratos_recebidos.txt` DETAIL com esses valores.
- **Programas**: SGCB0020 → SGCB0170 (VAL CPF) → SGCB0180 (VAL DATA).
- **Esperado**:
  - RC SGCB0170 = 00 (`00-DOC-OK`).
  - RC SGCB0180 = 00 (`00-DT-OK`).
  - RC SGCB0020 = 00 (`00-CTR-VAL-OK`) se este for o único DETAIL.
  - Registro presente em `SGLCTRVL`, ausente em `SGLCTRRE`.

## C02 — Contrato PJ válido

- **Descrição**: 1 contrato PJ com CNPJ válido (`11222333000181`), tipo `FI`,
  valor `250.000,00`, 60 parcelas.
- **Programas**: SGCB0020 → SGCB0170 → SGCB0180.
- **Esperado**: RC 00 em toda a cadeia; registro em `SGLCTRVL`.

## C03 — Contrato ES válido (LE)

- **Descrição**: 1 contrato ES com Inscrição Estadual válida
  (`110042490114` — 12 dígitos IE SP), tipo `CO`, valor `50.000,00`,
  24 parcelas.
- **Programas**: SGCB0020 → SGCB0170.
- **Esperado**: RC 00; registro em `SGLCTRVL`. O tipo ES ativa depois
  em `SGCB0110` o `WS-FATOR-ES = 0.873` (ver C21).

## C04 — CPF com DV inválido

- **Descrição**: mesma massa de C01, mas CPF `22233344400` (último dígito
  errado).
- **Programas**: SGCB0020 → SGCB0170.
- **Esperado**:
  - RC SGCB0170 = 08 (`08-DOC-DV-ERR`).
  - RC SGCB0020 propagado ≥ 04 (rejeição parcial) ou 08 se este for o
    único DETAIL.
  - Registro presente em `SGLCTRRE` com motivo `DOC-INVALIDO`.

## C05 — CNPJ com DV inválido

- **Descrição**: CNPJ `11222333000180` (DV final errado), tipo cliente PJ.
- **Programas**: SGCB0020 → SGCB0170.
- **Esperado**: RC 08-DOC-DV-ERR; registro em `SGLCTRRE`.

## C06 — Documento com comprimento errado

- **Descrição**: cliente PF com CPF `1122334455` (10 dígitos).
- **Programas**: SGCB0020 → SGCB0170.
- **Esperado**: RC 08-DOC-LEN-INVAL.

## C07 — Tipo de cliente fora do domínio

- **Descrição**: registro com `tipo-cliente = 'XX'`.
- **Programas**: SGCB0020.
- **Esperado**: RC 08-TIPO-INVALIDO; registro em `SGLCTRRE`.
  Não chega a chamar SGCB0170.

## C08 — qtd-parcelas > 240 (aceito por código, rejeitado por doc)

- **Descrição**: contrato PF, `qtd-parcelas = 300`.
- **Programas**: SGCB0020.
- **Esperado**: **aceito** — RC 00, registro em `SGLCTRVL`. Isto exercita o
  **Ponto 16** (`docs/PONTOS_FORA_COBERTURA.md`): o código valida
  `qtd-parcelas <= 360` enquanto `docs/REGRAS_NEGOCIO.md` §2 item 4 diz
  `<= 240`. O cenário serve para provar a divergência.
- **Ação recomendada**: incluir em `data/expected/expected_results.md` a
  observação explícita — não corrigir código nesta tarefa (ver briefing).

## C09 — qtd-parcelas > 360

- **Descrição**: contrato PF, `qtd-parcelas = 400`.
- **Programas**: SGCB0020.
- **Esperado**: RC 08-VLR-INCONSIST; registro em `SGLCTRRE`.

## C10 — Data-início em feriado

- **Descrição**: contrato válido em tudo, mas `data-inicio = 2026-04-21`
  (Tiradentes, presente em `data/input/feriados.txt`).
- **Programas**: SGCB0020 → SGCB0180.
- **Esperado**:
  - RC SGCB0180 = 04 (`04-DT-FERIADO`).
  - RC SGCB0020 propagado = 04 (`04-CTR-REJEIT-PARCIAL`) ou 00 (se
    política tratar feriado como informativo apenas — validar contra
    código real). O `expected_results.md` deve indicar o valor observado.

## C11 — Trailer diverge da contagem real

- **Descrição**: arquivo com HEADER + 3 DETAIL + TRAILER com
  `qtd = 000000005`.
- **Programas**: SGCB0020.
- **Esperado**: RC 04-TRAILER-DIVERGE; arquivo aceito, aviso.

## C12 — HEADER inválido/ausente

- **Descrição**: arquivo começa direto com DETAIL (sem HEADER) ou HEADER
  com `dt-geracao = 00000000`.
- **Programas**: SGCB0020.
- **Esperado**: RC 08-HEADER-INVAL; nenhum DETAIL processado.

## C13 — Pagamento válido (canal PIX)

- **Descrição**: 1 pagamento para o contrato C01 (`id-contrato = 100000000001`),
  parcela 001, valor exato da parcela, canal `PIX`.
- **Input**: `data/input/pagamentos_recebidos.txt`.
- **Programas**: SGCB0030 → SGCB0180.
- **Esperado**: RC 00; registro em `SGLPAGVL`.

## C14 — Pagamento com data futura

- **Descrição**: pagamento com `dt-pagto = 2026-12-31` (posterior à data
  de processamento `2026-01-15`).
- **Programas**: SGCB0030.
- **Esperado**: RC 08-DT-FUTURA; registro em `SGLPAGRE`.

## C15 — Pagamento canal inválido

- **Descrição**: pagamento com `canal = 'ZZZ'`.
- **Programas**: SGCB0030.
- **Esperado**: RC 08-CANAL-INVAL; registro em `SGLPAGRE`.

## C16 — Pagamento em excesso via PIX

- **Descrição**: pagamento de `R$ 1.500,00` para parcela cujo saldo é
  `R$ 1.000,00`, canal `PIX`.
- **Programas**: SGCB0030 → SGCB0070.
- **Esperado**: RC 04-PAG-EXCESSO em SGCB0070; `SGLPAGAP` recebe a linha
  com indicador de excedente; excedente vira crédito na próxima parcela
  em aberto do mesmo contrato (regra §3.8 de `REGRAS_NEGOCIO.md`).

## C17 — Cliente inexistente na carga

- **Descrição**: contrato válido cujo documento **não** existe em
  `SG_CLIENTE`.
- **Programas**: SGCB0040 → SGCB0050 (RC=08 cliente não encontrado) →
  SGCB0060 (INSERT).
- **Esperado**:
  - SGCB0050 retorna RC 08 e mensagem `08 CLIENTE NAO ENCONTRADO`.
  - Se `WS-FL-PERMITE-CRIA = 'S'`, SGCB0040 chama SGCB0060 que insere e
    retorna RC 00.
  - RC SGCB0040 final = 00.
  - `SG_CLIENTE` passa a ter 1 linha nova; `SG_HIST_CLIENTE` também.

## C18 — Cliente duplicado (SQLCODE -803)

- **Descrição**: rerun do C17 — o cliente já foi carregado em execução
  anterior.
- **Programas**: SGCB0040 → SGCB0050 (RC 00 achou) *ou* SGCB0060 (RC 04
  duplicidade).
- **Esperado**: RC 04-DB2-DUPL-IGNOR — comportamento idempotente
  documentado em `MATRIZ_PROGRAMA_TABELA.md` §5.

## C19 — Aplicação de pagamento com FL-RECALC-SALDO=S

- **Descrição**: parâmetro `FL-RECALC-SALDO` = `S` em `SG_PARAMETRO`.
- **Programas**: SGCB0070 → SGCB0120.
- **Esperado**: SGCB0120 é chamado após a baixa; recalcula saldo em
  `SG_CONTRATO` (2 UPDATEs — ver `MATRIZ_PROGRAMA_TABELA.md` C0120).
  RC final 00.
- **Contraprova**: com `FL-RECALC-SALDO` = `N`, SGCB0120 não é chamado.

## C20 — Detecção de inadimplência LEVE (6..30 dias)

- **Descrição**: parcela vencida em `2026-01-02` com processamento em
  `2026-01-15` (13 dias em atraso, faixa LEVE).
- **Programas**: SGCB0100 → SGCB0180 (DIF) → SGCB0110.
- **Esperado**: `SG_PARCELA` recebe UPDATE com dias-atraso e encargo
  calculado; `SGLENCAR` recebe linha; RC 00.

## C21 — Detecção de inadimplência GRAVE com ES (fator 0,873)

- **Descrição**: contrato ES criado em C03, parcela vencida em
  `2025-11-01` (75 dias em atraso — faixa GRAVE).
- **Programas**: SGCB0100 → SGCB0110 (par. `3300-CALC-ES`).
- **Esperado**:
  - juros brutos calculados na fórmula base;
  - juros e multa multiplicados por `WS-FATOR-ES = 0.873` (Ponto 3 —
    `docs/PONTOS_FORA_COBERTURA.md`).
  - **Divergência esperada com documentação**: `docs/REGRAS_NEGOCIO.md`
    §4.2 declara 0,90 para juros e 0,80 para multa. Deve ser destacado
    em `expected_results.md`.

## C22 — Cliente reincidente com MOD 7 = 3 → classe D

- **Descrição**: cliente cujo `WS-HIST-QTD >= 6` (histórico de 6
  ocorrências) e cujo cálculo interno de `SGCB0140` produz
  `WS-MOD7 = 3` e `WS-E-REINCIDENTE = TRUE`.
- **Programas**: SGCB0140.
- **Esperado**: `SG-RC-CLASSE-RISCO = 'D'` (forçado pela regra
  não-documentada — Ponto 3 complementar).
  Comparar com regra oficial em `docs/REGRAS_NEGOCIO.md` §6 —
  divergência esperada.

## C23 — Renegociação — contrato elegível MODERADA

- **Descrição**: contrato com faixa MODERADA (35 dias em atraso), sem
  proposta ativa nos últimos 90 dias, saldo `R$ 3.500,00`, sem bloqueio.
- **Programas**: SGCB0130 → SGCB0080 → SGCB0050 → SGCB0140 →
  (posteriormente SGCB0160 para gerar 3 opções).
- **Esperado**:
  - RC 00.
  - Registro em `SGLINADI`.
  - `SG_RENEGOCIACAO` recebe 1 linha; `SG_OPCAO_RENEGOCIACAO` recebe 3
    linhas (opções `10%/12x/1,50%`, `20%/24x/1,20%`, `30%/6x/0,80%`).

## C24 — Renegociação bloqueada em `SGLBLOQ`

- **Descrição**: mesmo contrato de C23, mas com uma linha em
  `data/input/bloqueios.txt` (`BLOQ-TIPO='CTR'`,
  `BLOQ-ID-CONTRATO=100000000001`, `BLOQ-IND-ATIVO='S'`).
- **Programas**: SGCB0130.
- **Esperado**: contrato **não** aparece em `SGLINADI` para
  renegociação; RC 04-REN-SEM-ELEG se este era o único elegível.

## C25 — Renegociação com `SGLBLOQ` ausente (DD opcional)

- **Descrição**: JCL sem alocar DD `SGLBLOQ`. `OPEN INPUT` produz FS
  35/37/39/93.
- **Programas**: SGCB0130 par. `1500-CARREGAR-BLOQUEIOS`.
- **Esperado**: nenhum warning elevado; processamento segue sem cache de
  bloqueios; RC final 00 se demais condições atendidas. **Ponto 13** —
  DD opcional.

## C26 — Relatórios com dinâmica de nome construído

- **Descrição**: SGCB0190 executa par. `7900-CALL-FMT` com
  `WS-FL-USA-BUILD = 'S'`, forçando o nome `SGCB0200` construído por
  `STRING WS-PREF DELIMITED BY SIZE WS-SUF ...`.
- **Programas**: SGCB0190 → SGCB0200 (dinâmica).
- **Esperado**: RC 00; relatório em `SGLRELDT` gerado. **Ponto 2**
  (CALL dinâmica com nome montado) exercitado.

## C27 — VSAM SGVCOBRA — janela extra desativada

- **Descrição**: execução normal de SGCB0150 (`WS-FL-JANELA-EXTRA = 'N'`).
- **Programas**: SGCB0150.
- **Esperado**:
  - Fluxo VSAM completo (READ/WRITE/REWRITE/DELETE em `SGVCOBRA`).
  - Par. `8500-INTEGRACAO-LEGADO-TAPE` **não** executado, `CALL
    'SGXASM01'` **não** disparado — **Ponto 1/15/18/20**.
  - RC 00.

## C28 — Driver com bloqueio ativo em `SGLBLOQ`

- **Descrição**: `SGLBLOQ` contém linha com `BLOQ-TIPO='JAN'` e
  `BLOQ-IND-ATIVO='S'` para a data de processamento.
- **Programas**: SGCB0010.
- **Esperado**: RC 08-BLOQUEIO-ATIVO; nenhum step executado após
  detecção; `SGLERROS` recebe registro.

---

## Rastreabilidade cenário × ponto fora-de-cobertura

| Cenário | Ponto(s) exercitado(s) |
|---|---|
| C08 | 16 (regra divergente) |
| C21 | 3 (fator 0,873) + 16 |
| C22 | 3 (regra MOD 7) |
| C25 | 13 (DD opcional) |
| C26 | 2 (CALL dinâmica) |
| C27 | 1 (parágrafo nunca executado) + 15 (código morto) + 18 (CALL externo) + 20 (interface ASM) |
| C28 | — (regra viva do driver) |

Cenários que **não** cobrem pontos deliberados também são úteis para
documentar o fluxo feliz e ajudar quem construir os JCLs.

## Ordem de execução recomendada

1. Prepara ambiente: `db2/ddl/` + `db2/carga/`.
2. **C01..C12**: exercita `SGCB0020` (contratos).
3. **C17..C18**: exercita `SGCB0040 → SGCB0050 → SGCB0060` (carga cliente).
4. **C13..C16**: exercita `SGCB0030` (pagamentos) e depois `SGCB0070`.
5. **C19**: exercita recalculo condicional (`SGCB0070 → SGCB0120`).
6. **C20..C22**: exercita `SGCB0100 → SGCB0110 / SGCB0140`.
7. **C23..C25**: exercita `SGCB0130`.
8. **C26**: exercita `SGCB0190 → SGCB0200`.
9. **C27**: exercita `SGCB0150` (janela mensal).
10. **C28**: exercita `SGCB0010` com bloqueio.
