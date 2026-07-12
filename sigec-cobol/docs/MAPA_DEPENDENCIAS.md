# SIGEC — Mapa de Dependências entre Programas

Base: `grep CALL` real nos 20 fontes `.cbl` presentes em `cobol/` no momento
desta análise (branch `cursor/sigec-cobol-laboratorio-3cb2`).

> **Observação sobre inventário**
> `docs/ARQUITETURA.md` lista 20 programas (`SGCB0010`..`SGCB0200`) e o
> diretório `cobol/` contém **os 20 fontes esperados**. Este mapa reflete
> exclusivamente CALLs reais encontrados por `rg 'CALL\s+'` nos `.cbl`.

---

## 1. Tabela consolidada — CALLs reais

Legenda de tipo:

- **estática** — literal (`CALL 'SGCBxxxx'`);
- **dinâmica** — identificador (`CALL WS-PROG-XXX`) resolvido em tempo de execução.

| Chamador | Chamado | Tipo | Condição de disparo | Áreas passadas (`USING …`) | RC esperado do chamado |
|---|---|---|---|---|---|
| SGCB0010 | SGCB0020 | estática | Step S020 (par. `2010-STEP-SGCB0020`, l. 687) | *(sem `USING` — RC via `RETURN-CODE`)* | 00 · 04 · 08 · 12 |
| SGCB0010 | SGCB0030 | estática | Step S030 (par. `2020-STEP-SGCB0030`, l. 700) | *(sem `USING`)* | 00 · 04 · 08 · 12 |
| SGCB0010 | SGCB0040 | estática | Step S040 (par. `2030-STEP-SGCB0040`, l. 713) | *(sem `USING`)* | 00 · 04 · 08 · 12 · 16 |
| SGCB0010 | SGCB0070 | estática | Step S070 (par. `2040-STEP-SGCB0070`, l. 726) | *(sem `USING`)* | 00 · 04 · 08 · 12 |
| SGCB0010 | SGCB0100 | estática | Step S100 (par. `2050-STEP-SGCB0100`, l. 739) | *(sem `USING`)* | 00 · 04 · 08 · 12 |
| SGCB0010 | SGCB0130 | estática | Step S130 (par. `2060-STEP-SGCB0130`, l. 752) | *(sem `USING`)* | 00 · 04 · 08 · 12 |
| SGCB0010 | SGCB0160 | estática | Step S160 (par. `2070-STEP-SGCB0160`, l. 765) | *(sem `USING`)* | 00 · 04 · 08 · 12 |
| SGCB0010 | *dinâmica → `SGCB0190`* | **dinâmica** | Step S190 (par. `2080-STEP-DINAMICO-REL`, l. 799). Duas rotas: (a) `CALL WS-PROG-REL` (variável direta `'SGCB0190'`) ou (b) `CALL WS-PROG-REL-ALT` quando `WS-FL-USA-ALT = 'S'` — nome construído via `STRING WS-PREF DELIMITED BY SIZE WS-SUF …` (`'SGCB'` + `'0190'`). | *(sem `USING`)* | 00 · 04 · 08 · 12 (12 forçado por `ON EXCEPTION`) |
| SGCB0010 | *dinâmica → `SGEXTLOG`* (externo fictício) | **dinâmica** | Só quando `WS-FL-EXT-LOG = 'S'` (par. `7000-CHAMAR-EXTERNO-OPCIONAL`, l. 896). Se módulo ausente do STEPLIB, `ON EXCEPTION` emite warning e prossegue. | `SGCOMMAR` | Ignorado — módulo não faz parte do lab |
| SGCB0010 | *dinâmica → `SGCB0999`* (histórico fictício) | **dinâmica** | Só se o parágrafo `9998-MODO-SIMULACAO-ANTIGO` for alcançado. **Nenhum caminho vivo leva até esse parágrafo** (é código morto documentado). | `SGCOMMAR` | Ignorado — módulo não existe |
| SGCB0020 | SGCB0170 | estática | Sempre para cada DETAIL do arquivo `SGLCTRIN` (par. `3110-CHAMAR-SGCB0170`) | `SGDOCVAL` | 00 (ok) · 04 (vazio tolerado) · 08 (DV inválido / tamanho / tipo) |
| SGCB0020 | SGCB0180 | estática | Sempre para validar `CTRIN-DET-DATA-INICIO` (par. `3120-CHAMAR-SGCB0180`, função `VAL`) | `SGDATAS` | 00 · 04 (fim-de-semana/feriado) · 08 (data inválida/formato) |
| SGCB0030 | SGCB0180 | estática | Uma vez por DETAIL de `SGLPAGIN` (função `VAL` na data de pagamento) | `SGDATAS` | 00 · 04 · 08 |
| SGCB0040 | SGCB0050 | estática | Consulta cliente por documento antes de tentar carga (par. em torno da l. 426, área `WS-LK-CLI-CONSULTA`) | `WS-LK-CLI-CONSULTA`, `SGCLIDAT`, `SGCOMMAR` | 00 (achou ativo) · 04 (achou inativo) · 08 (não achou) · 12 (SQL) |
| SGCB0040 | SGCB0060 | estática | Só quando `SGCB0050` retorna `08 CLIENTE NAO ENCONTRADO` **e** `WS-FL-PERMITE-CRIA = 'S'` (cria cliente via INSERT) | `WS-LK-CLI-MANUT`, `SGCLIDAT`, `SGCOMMAR` | 00 · 04 (`-803` duplicata) · 08 (validação) · 12 (SQL) |
| SGCB0040 | SGCB0180 | estática | Duas invocações: validação de `DATA-INICIO` e cálculo de vencimento das parcelas (funções `VAL` / `ADD`) | `SGDATAS` | 00 · 04 · 08 |
| SGCB0070 | SGCB0080 | estática | Uma vez por DETAIL de `SGLPAGVL` (par. `4100-CONSULTAR-CONTRATO`) | `WS-CALL-CTR`, `SGCTRDAT`, `SGCLIDAT`, `SGCOMMAR` | 00 (achou) · 08 (não achou) |
| SGCB0070 | SGCB0090 | estática | Após o CTR ok (par. `4200-CONSULTAR-PARCELA`) | `WS-CALL-PAR`, `SGPARDAT`, `SGCOMMAR` | 00 · 08 (`+100` — parcela inexistente) · 12 (SQL) |
| SGCB0070 | SGCB0110 | estática | Após parcela ok (par. `4300-CALCULAR-ENCARGOS`) | `SGFINANC` | 00 · 04 (dias=0) · 08 (princ/taxa/tipo) · 12 (overflow) |
| SGCB0070 | SGCB0120 | estática | Só quando `WS-FL-RECALC-SALDO = 'S'` (par. `4800-RECALCULAR-SALDO`). O flag é setado por `SG_PARAMETRO.CD_PARAMETRO = 'FL-RECALC-SALDO'` | `WS-CALL-REC`, `SGCOMMAR` | 00 · 04 · 08 · 12 |
| SGCB0100 | SGCB0180 | estática | Uma vez por fetch do cursor `C-PARC-VEN` (par. `4100-CALC-DIAS-ATRASO`, função `DIF`) | `SGDATAS` | 00 · 04 · 08 |
| SGCB0100 | SGCB0110 | estática | Uma vez por fetch, após calcular dias em atraso (par. `4200-CALCULAR-ENCARGOS`) | `SGFINANC` | 00 · 04 · 08 · 12 |
| SGCB0130 | SGCB0050 | estática | Uma vez por contrato inadimplente lido do cursor (par. em torno da l. 352) | `WS-CALL-CLI`, `SGCLIDAT`, `SGCOMMAR` | 00 · 04 · 08 |
| SGCB0130 | SGCB0080 | estática | Uma vez por contrato inadimplente (par. em torno da l. 334, antes do `SGCB0050`) | `WS-CALL-CTR`, `SGCTRDAT`, `SGCLIDAT`, `SGCOMMAR` | 00 · 08 |
| SGCB0130 | SGCB0140 | estática | Após consultar CTR+CLI (par. `4300-OBTER-RISCO`) | `SGRISCOM` | 00 · 04 · 08 · 12 |
| SGCB0150 | SGXASM01 | estática | **Somente quando `WS-FL-JANELA-EXTRA = 'S'` e faixa CRITICA** (par. `8500-INTEGRACAO-LEGADO-TAPE`, l. 608). O flag nunca é setado por código no lab. | `REG-SGVCOBRA` | Ignorado — módulo ASM fictício, `SGXASM01` NÃO está linkado |
| SGCB0160 | SGCB0140 | estática | Uma vez por contrato elegível (par. `4050-CLASSIF-RISCO`, l. 488) | `SGRISCOM` | 00 · 04 · 08 · 12 |
| SGCB0160 | SGCB0110 | estática | Uma vez por opção gerada (par. de simulação em `4300-GERAR-OPCOES`, l. 615) | `SGFINANC` | 00 · 04 · 08 · 12 |
| SGCB0160 | SGCB0180 | estática | Uma vez, em `1700-CALC-VALIDADE` para calcular data de validade da proposta (função `ADD`) | `SGDATAS` | 00 · 04 · 08 |
| SGCB0190 | *dinâmica → `SGCB0200`* | **dinâmica** | Toda vez que o par. `7900-CALL-FMT` é executado. Nome do programa é: (a) `WS-PROG-FMT = 'SGCB0200'` (modo padrão) **ou** (b) `WS-PROG-BUILD` construído em runtime por `STRING WS-PREF DELIMITED BY SIZE WS-SUF …` (`WS-PREF='SGCB'`, `WS-SUF='0200'`) quando `WS-FL-USA-BUILD = 'S'` | `SGINTFMT` | 00 · 04 · 08 · 12 (`ON EXCEPTION` eleva RC para 12) |

---

## 2. Programas que não chamam ninguém (folhas)

- `SGCB0050` — consulta cliente (SELECT puro)
- `SGCB0060` — manut cliente (INSERT/UPDATE + INSERT hist)
- `SGCB0080` — consulta contrato (SELECT com JOIN)
- `SGCB0090` — consulta parcela (SELECT)
- `SGCB0110` — motor financeiro (aritmético puro)
- `SGCB0120` — recalculo saldo (aggregate SQL)
- `SGCB0140` — classificação risco (aritmético + matriz interna)
- `SGCB0170` — validação documento (aritmético + tabelas de pesos)
- `SGCB0180` — utilitário de datas (aritmético + `SGLFERIA`)
- `SGCB0200` — formatação de linha de interface (buffer + XOR)

---

## 3. Programas nunca invocados por outro programa neste repositório

Detectado por ausência de `CALL 'SGCBnnnn'` em qualquer outro `.cbl`:

- `SGCB0150` — não é chamado por `SGCB0010`. Só pode ser disparado pelo JCL de
  janela mensal (`SGCJOB05`) ou por operação manual. **JCL PENDENTE** — a pasta
  `jcl/` está vazia neste snapshot. Ver ponto 12 em `PONTOS_FORA_COBERTURA.md`.

Todos os demais fluxos são cobertos por CALLs internos do driver `SGCB0010`
ou por CALLs entre programas de serviço (`SGCB0110`, `SGCB0140`, etc.).

---

## 4. Referências externas não resolvidas (fora de cobertura)

Detectadas por `grep CALL` cujo alvo não corresponde a nenhum `PROGRAM-ID`
existente em `cobol/`:

| Origem | Alvo | Natureza |
|---|---|---|
| `SGCB0010` (par. `7000`) | `SGEXTLOG` (via `WS-PROG-EXT-LOG`) | Programa externo opcional. `ON EXCEPTION` tolera ausência do módulo no STEPLIB. Intencional — pontos 18 e 20 de `PONTOS_FORA_COBERTURA.md`. |
| `SGCB0010` (par. `9998`) | `SGCB0999` (via `WS-PROG-REL-ALT`) | Programa histórico descontinuado. Alcançável só via `9998-MODO-SIMULACAO-ANTIGO` que é **código morto**. Ver ponto 15. |
| `SGCB0150` (par. `8500`) | `SGXASM01` | Rotina Assembler externa fictícia. Documentada em pontos 18 e 20. **NÃO** deve ser tratada como erro pelo `validate_static.sh`. |

---

## 5. Referências externas em copybook não resolvidas

| Copybook citado | Origem | Situação |
|---|---|---|
| `SGXTAPE` (só em comentário `SELECT`) | `SGCB0150` | Referência **apenas documental**. Não há `COPY SGXTAPE` em nenhum `.cbl`. É um lembrete para o time de infra. Ver ponto 19 em `PONTOS_FORA_COBERTURA.md`. |

Nenhum outro `COPY` aponta para copybook inexistente em `copybooks/` neste
snapshot.
