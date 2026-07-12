# SIGEC — Fluxo de Processamento Diário

Descreve, passo a passo, o que a janela batch faz entre 23:30 (D) e 05:00 (D+1).
Todos os steps são disparados pelo driver `SGCB0010` a partir do JCL `SGCJOB01`.

---

## 1. Diagrama macro

```
                          ┌────────────────────────┐
                          │       SGCB0010         │
                          │  Driver / Orquestrador │
                          └────────────┬───────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
  SGCB0020                        SGCB0040                        SGCB0180 (data)
  Valida contratos                Valida pagamentos               Usada por todos
       │                               │
       ▼                               ▼
  SGCB0030                        SGCB0050 (indireto)
  Carga DB2                       Aplicação de pagamentos
       │                               │
       └───────────────┬───────────────┘
                       ▼
                  SGCB0070
                  Cálculo de encargos ── usa SGCB0110
                       │
                       ▼
                  SGCB0100
                  Detecção de inadimplência ── usa SGCB0140
                       │
                       ▼
                  SGCB0130
                  Propostas de renegociação
                       │
                       ▼
                  SGCB0160
                  Geração de interfaces ── usa SGCB0200
                       │
                       ▼
                  SGCB0190
                  Relatórios finais
```

O fluxo obrigatório dos steps principais é:

`SGCB0010 → 0020 → 0030 → 0040 → 0070 → 0100 → 0130 → 0160 → 0190`

Programas de serviço (`SGCB0110`, `SGCB0140`, `SGCB0170`, `SGCB0180`, `SGCB0200`) são
invocados via `CALL` estático a partir dos programas de processo.

---

## 2. Step S010 — Inicialização (SGCB0010)

**Objetivo:** preparar contexto de execução.

Ações:
1. Lê `SGLPARM` (parâmetros complementares) e `SGLFERIA` (feriados).
2. Verifica se a data de processamento (D) é dia útil chamando `SGCB0180`.
3. Se `SGLBLOQ` (bloqueios manuais) tiver entrada ativa para o dia, aborta com RC=08.
4. Registra início da execução em `SGT_LOG_EXEC`.
5. Popula `SGCOMMAR` com programa-chamador = `SGCB0010`, data-processamento, timestamp.
6. Invoca sequencialmente os programas do fluxo, avaliando RC a cada retorno.
7. Se qualquer chamada retornar RC ≥ 12, encerra a janela com RC=12 e aciona plantão.

Return-code do step: máximo entre todos os RCs recebidos.

---

## 3. Step S020 — Validação de contratos (SGCB0020)

**Entrada:** `SGLCTRIN` (FB, LRECL=200, GDG do dia).
**Saída:**
- `SGLCTRVL` — contratos aprovados;
- `SGLCTRRE` — contratos rejeitados com motivo;
- `SGLERROS` — append de erros técnicos.

Regras:
1. Lê HEADER, valida data e quantidade declarada.
2. Para cada DETAIL, invoca `SGCB0170` (validação de documento) e `SGCB0180` (validação de datas).
3. Verifica consistência: `valor-total ≥ qtd-parcelas × 1,00`, `taxa-juros ≤ 15,00%`, `pct-multa ≤ 10,00%`.
4. Valida tipo-cliente ∈ {PF, PJ, ES}, tipo-contrato ∈ {CR, CD, FI, CO, EM}.
5. Trailer confere quantidade e soma de valores. Diferença → RC=04 e log em `SGLERROS`.
6. Cliente novo (não existe em `SGT_CLI_CLIENTE`) é aceito e sinalizado para inclusão em S030.

Return-codes esperados: 00, 04, 08.

---

## 4. Step S030 — Carga de contratos em DB2 (SGCB0030)

**Entrada:** `SGLCTRVL`.
**Saída:**
- `SGLCTRCG` — contratos efetivamente carregados;
- `SGLDB2RE` — rejeitados por conflito de integridade em DB2.

Regras:
1. Insere/atualiza cliente em `SGT_CLI_CLIENTE` (UPSERT via `MERGE`).
2. Insere contrato em `SGT_CTR_CONTRATO`. Se PK duplicada → grava em `SGLDB2RE` com `SQLCODE`.
3. Gera parcelas em `SGT_PAR_PARCELA` a partir de `qtd-parcelas` e `data-inicio`, aplicando `SGCB0180` para pular fins de semana e feriados quando cair vencimento.
4. Commit a cada 1000 contratos processados (parâmetro `WS-CT-LIMITE-COMMIT`).
5. Ao final, grava sumário em `SGT_LOG_EXEC`.

Return-codes esperados: 00, 04, 08 (conflitos), 12 (erro técnico DB2).

---

## 5. Step S040 — Validação de pagamentos (SGCB0040)

**Entrada:** `SGLPAGIN` (FB, LRECL=120).
**Saída:**
- `SGLPAGVL` — pagamentos aprovados;
- `SGLPAGRE` — pagamentos rejeitados;
- Chama internamente `SGCB0050` (aplicação) — fisicamente executado no mesmo step.

Regras:
1. HEADER e TRAILER validam quantidade e soma declaradas.
2. Cada DETAIL busca a parcela correspondente em `SGT_PAR_PARCELA` por `id-contrato + nr-parcela`.
3. Rejeita se parcela não existe, já está `LIQUIDADA` ou está `CANCELADA`.
4. Aceita pagamento parcial: `valor < saldo-devedor`. Marca indicador `IND-PARCIAL = 'S'`.
5. Aceita pagamento em excesso somente se `canal = PIX` — excedente vira crédito na próxima parcela.
6. Data de pagamento futura → rejeita imediatamente (RC=08, motivo `DT-FUTURA`).
7. Pagamentos aprovados são efetivados em DB2 e escritos em `SGLPAGAP`.
8. Pagamentos aprovados mas com dependência pendente (ex.: precisa conciliar com adquirente) vão para `SGLPAGPD`.

Return-codes esperados: 00, 04, 08.

---

## 6. Step S070 — Cálculo de encargos (SGCB0070)

**Entrada:** varre `SGT_PAR_PARCELA` onde `SITUACAO IN ('ABERTA','PARCIAL')` e `DT_VCTO < D`.
**Saída:** `SGLENCAR`.

Regras:
1. Para cada parcela vencida, monta a área `SGFINANC` (principal, dias em atraso, taxa, multa%, tipo-contrato, ind-parcial).
2. Invoca `SGCB0110` que devolve juros, multa e valor atualizado.
3. Persiste em `SGT_ENC_ENCARGO` (append por dia — histórico de posição diária).
4. Atualiza `SGT_PAR_PARCELA.VL_ATUALIZADO` e `DT_ULT_CALC`.
5. Grava linha por parcela em `SGLENCAR` para conferência.

Cálculo padrão em `SGCB0110`:
- Juros = principal × taxa/30 × dias em atraso;
- Multa = principal × pct-multa (aplicada uma única vez a partir do dia 1 de atraso, se `dias > 0`);
- Valor atualizado = principal + juros + multa.
- Tipos `PF` e `PJ` seguem regra padrão; `ES` (especial) aplica desconto de 20% na multa.
- Ver `docs/REGRAS_NEGOCIO.md` para tabela completa.

Return-codes esperados: 00, 04, 12.

---

## 7. Step S100 — Detecção de inadimplência (SGCB0100)

**Entrada:** `SGT_CTR_CONTRATO` + `SGT_PAR_PARCELA` + `SGT_ENC_ENCARGO`.
**Saída:** `SGLINADI` (lista consolidada por contrato).

Regras:
1. Considera inadimplente todo contrato com pelo menos uma parcela em atraso > 5 dias.
2. Faixa de inadimplência:
   - `LEVE` — 6 a 30 dias;
   - `MODERADA` — 31 a 60 dias;
   - `GRAVE` — 61 a 90 dias;
   - `CRITICA` — >90 dias;
3. Para cada contrato inadimplente, monta `SGRISCOM` e invoca `SGCB0140` para reclassificar risco (A–E).
4. Persiste em `SGT_INA_INADIMPLENCIA` e `SGT_RIS_RISCO`.
5. Marca contrato para eventual renegociação (input do próximo step).
6. Auditoria de decisão vai para `SGLAUDVS` (VSAM).

Return-codes esperados: 00, 04.

---

## 8. Step S130 — Propostas de renegociação (SGCB0130)

**Entrada:** `SGT_INA_INADIMPLENCIA` (do dia) filtrada por elegibilidade.
**Saída:** `SGLPROP`.

Regras:
1. Contrato elegível: faixa `MODERADA` ou `GRAVE`, risco `C`, `D` ou `E`, sem proposta ativa nos últimos 90 dias.
2. Contratos `CRITICA` só entram com autorização (flag `WS-FL-INCLUI-CRITICA = 'S'` em `SGLPARM`).
3. Gera até 3 opções de proposta por contrato:
   - Opção 1: entrada de 10% + parcelamento em 12x com juros de 1,5% a.m.;
   - Opção 2: entrada de 20% + parcelamento em 24x com juros de 1,2% a.m.;
   - Opção 3: entrada de 30% + parcelamento em 6x com juros de 0,8% a.m.
4. Cálculo financeiro delegado a `SGCB0110` (com flag de simulação).
5. Persiste em `SGT_PRO_PROPOSTA`, uma linha por opção.
6. Grava `SGLPROP` para consumo do próximo step.

Return-codes esperados: 00, 04.

---

## 9. Step S160 — Geração de interfaces (SGCB0160)

**Entrada:** múltiplas — `SGT_INA_INADIMPLENCIA`, `SGT_ENC_ENCARGO`, `SGT_PRO_PROPOSTA`.
**Saída:**
- `SGLINTCB` — cobrança (HEADER/DETAIL/TRAILER);
- `SGLINTCT` — contábil;
- `SGLINTRG` — renegociação;

Regras:
1. `SGLINTCB` inclui todo contrato inadimplente com faixa ≥ LEVE — vira fila para o discador.
2. `SGLINTCT` traz lançamentos contábeis do dia: encargos calculados, pagamentos aplicados, provisão de risco (delta A→B, B→C, etc.).
3. `SGLINTRG` traz cada proposta gerada em S130, formato compatível com sistema `SGRNG`.
4. Cada arquivo tem HEADER com data de referência e TRAILER com quantidade + soma.
5. Formatação delegada a `SGCB0200` (área `SGINTFMT`).

Return-codes esperados: 00, 04.

---

## 10. Step S190 — Relatórios (SGCB0190)

**Entrada:** todas as tabelas do dia + arquivos de log.
**Saída:**
- `SGLRELDT` — relatório detalhado (uma linha por evento);
- `SGLRELST` — relatório sintético (agregado por dimensão);
- `SGLERROS` — consolidado do dia.

Regras:
1. Detalhado inclui: contratos carregados, pagamentos aplicados, encargos calculados, inadimplentes detectados, propostas geradas, rejeições.
2. Sintético agrega por: canal de pagamento, tipo de cliente, tipo de contrato, faixa de inadimplência, classe de risco.
3. Estatísticas de validação persistidas em `SGLESTAT`.
4. Ao final, `SGCB0010` fecha `SGT_LOG_EXEC` com timestamp de término e RC final.

Return-codes esperados: 00, 04.

---

## 11. Steps não obrigatórios

Alguns programas são chamados sob demanda por operação:

- `SGCB0060` — reconciliação de pendentes (executado no fim de semana);
- `SGCB0080` — consolidação mensal de encargos (executado no fechamento);
- `SGCB0090` — atualização de situação de parcelas (executado em D+1 05:30);
- `SGCB0120` — simulação avulsa a pedido do negócio;
- `SGCB0150` — recalculo de rating de carteira (executado no dia 1 de cada mês).

Estes têm JCLs próprios (`SGCJOB03`…`SGCJOB09`) e não fazem parte da janela diária.

---

## 12. Restart e recuperação

- **S020, S030, S040** são idempotentes por chave; podem ser reprocessados desde o início.
- **S050 (aplicação de pagamento)** exige rollback da última transação em DB2 antes do restart.
- **S070** deleta primeiro os encargos do dia (`DELETE FROM SGT_ENC_ENCARGO WHERE DT_REF = :WS-DT-PROC`) para evitar duplicação.
- **S100, S130, S160, S190** são reexecutáveis sem efeitos colaterais desde que S070 tenha completado.
- Em caso de aborto entre steps, o operador consulta `SGT_LOG_EXEC` para identificar o último step ok e retomar do próximo.
